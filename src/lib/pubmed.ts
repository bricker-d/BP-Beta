/**
 * PubMed E-utilities integration
 * Searches NIH PubMed (35M peer-reviewed papers) for live citations.
 * No API key required for basic use (<3 req/sec).
 * Set NCBI_API_KEY env var to raise limit to 10 req/sec.
 */

const BASE = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils";
const KEY   = process.env.NCBI_API_KEY ? `&api_key=${process.env.NCBI_API_KEY}` : "";
const TIMEOUT_MS = 6000;

export interface PubMedPaper {
  pmid:     string;
  title:    string;
  authors:  string;  // "Smith J, Jones A, et al."
  journal:  string;
  year:     string;
  abstract?: string;
}

// ── Search ───────────────────────────────────────────────────────────────────

export async function searchPubMed(query: string, maxResults = 3): Promise<string[]> {
  const url = `${BASE}/esearch.fcgi?db=pubmed&term=${encodeURIComponent(query)}&retmax=${maxResults}&retmode=json&sort=relevance${KEY}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) return [];
  const data = await res.json();
  return data.esearchresult?.idlist ?? [];
}

// ── Fetch metadata ────────────────────────────────────────────────────────────

export async function fetchPubMedSummary(pmids: string[]): Promise<PubMedPaper[]> {
  if (!pmids.length) return [];
  const url = `${BASE}/esummary.fcgi?db=pubmed&id=${pmids.join(",")}&retmode=json${KEY}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) return [];
  const data = await res.json();
  const result = data.result ?? {};

  return pmids.flatMap(pmid => {
    const p = result[pmid];
    if (!p || p.error) return [];
    const rawAuthors: { name: string }[] = p.authors ?? [];
    const authorNames = rawAuthors.slice(0, 3).map(a => a.name);
    const authors = rawAuthors.length > 3 ? `${authorNames.join(", ")}, et al.` : authorNames.join(", ");
    return [{
      pmid,
      title:   p.title   ?? "",
      authors: authors   ?? "",
      journal: p.source  ?? "",
      year:    (p.pubdate ?? "").split(" ")[0],
    }];
  });
}

// ── Fetch abstract ────────────────────────────────────────────────────────────

export async function fetchAbstract(pmid: string): Promise<string> {
  const url = `${BASE}/efetch.fcgi?db=pubmed&id=${pmid}&rettype=abstract&retmode=text${KEY}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) return "";
  const text = await res.text();
  // Trim the header lines, keep just the abstract body
  const lines = text.split("\n");
  const startIdx = lines.findIndex(l => /^Abstract/i.test(l.trim()));
  return startIdx >= 0
    ? lines.slice(startIdx + 1).join(" ").replace(/\s+/g, " ").trim().slice(0, 600)
    : lines.slice(4).join(" ").replace(/\s+/g, " ").trim().slice(0, 600);
}

// ── Combined search + summary ─────────────────────────────────────────────────

export async function pubmedSearch(query: string, maxResults = 3): Promise<PubMedPaper[]> {
  try {
    const pmids = await searchPubMed(query, maxResults);
    if (!pmids.length) return [];
    return await fetchPubMedSummary(pmids);
  } catch {
    return [];
  }
}

// ── Search + abstracts (for coach context) ────────────────────────────────────

export async function pubmedSearchWithAbstracts(query: string, maxResults = 2): Promise<PubMedPaper[]> {
  try {
    const pmids = await searchPubMed(query, maxResults);
    if (!pmids.length) return [];
    const papers = await fetchPubMedSummary(pmids);
    const withAbstracts = await Promise.all(
      papers.map(async p => ({
        ...p,
        abstract: await fetchAbstract(p.pmid).catch(() => ""),
      }))
    );
    return withAbstracts;
  } catch {
    return [];
  }
}

// ── Formatting ────────────────────────────────────────────────────────────────

export function formatCitation(paper: PubMedPaper): string {
  return `${paper.authors} (${paper.year}). "${paper.title}." ${paper.journal}. PMID ${paper.pmid}`;
}

export function formatForPrompt(papers: PubMedPaper[]): string {
  return papers.map(p =>
    `• ${formatCitation(p)}${p.abstract ? `\n  Abstract: ${p.abstract}` : ""}`
  ).join("\n\n");
}

// ── Build search query from biomarker + intervention ─────────────────────────

export function buildQuery(biomarkerName: string, interventionTitle: string): string {
  // Trim to core terms and append study filter
  const clean = (s: string) => s.replace(/\(.*?\)/g, "").replace(/[^a-zA-Z0-9 ]/g, " ").trim();
  return `${clean(biomarkerName)} ${clean(interventionTitle)} randomized controlled trial`;
}

// ── Detect if a chat message is asking about evidence ─────────────────────────

export function isEvidenceQuery(message: string): boolean {
  return /\b(study|studies|evidence|research|proven|clinical|trial|rct|meta.?analysis|peer.?reviewed|journal|published|pubmed|paper|show|showed|literature)\b/i.test(message);
}
