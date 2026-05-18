"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";

interface Org {
  id: string;
  name: string;
}

export default function AdminPage() {
  const router  = useRouter();
  const [orgs,    setOrgs]    = useState<Org[]>([]);
  const [loading, setLoading] = useState(true);
  const [email,   setEmail]   = useState("");
  const [orgId,   setOrgId]   = useState("");
  const [sending, setSending] = useState(false);
  const [result,  setResult]  = useState<{ ok?: boolean; error?: string } | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.replace("/practitioner/login"); return; }

      const { data: me } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .single();

      if (me?.role !== "bp_admin") {
        router.replace("/practitioner");
        return;
      }

      const { data: orgList } = await supabase
        .from("organizations")
        .select("id, name")
        .order("name");

      const list = orgList ?? [];
      setOrgs(list);
      if (list.length) setOrgId(list[0].id);
      setLoading(false);
    });
  }, []);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !orgId) return;
    setSending(true);
    setResult(null);

    try {
      const res  = await fetch("/api/admin/invite-provider", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email, organization_id: orgId }),
      });
      const data = await res.json();
      if (!res.ok) setResult({ error: data.error ?? "Invite failed" });
      else { setResult({ ok: true }); setEmail(""); }
    } catch {
      setResult({ error: "Network error — try again." });
    }

    setSending(false);
  }

  if (loading) {
    return <div className="py-16 text-center text-sm text-gray-400">Loading…</div>;
  }

  return (
    <div className="max-w-xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Admin</h1>
      <p className="text-sm text-gray-500 mb-8">Invite providers to organizations on the platform.</p>

      <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Invite Provider</h2>
        <form onSubmit={handleInvite} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
              Organization
            </label>
            {orgs.length === 0 ? (
              <p className="text-sm text-gray-400 py-2">No organizations found.</p>
            ) : (
              <select
                value={orgId}
                onChange={e => setOrgId(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-emerald-400 bg-white"
              >
                {orgs.map(org => (
                  <option key={org.id} value={org.id}>{org.name}</option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
              Provider email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="provider@clinic.com"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-emerald-400"
              required
            />
          </div>

          {result && (
            <p className={`text-sm ${result.ok ? "text-emerald-600" : "text-red-500"}`}>
              {result.ok
                ? "Invite sent. The provider will receive an email with a setup link."
                : result.error}
            </p>
          )}

          <button
            type="submit"
            disabled={sending || !email || !orgId}
            className="w-full py-2.5 rounded-xl bg-emerald-600 text-white font-semibold text-sm disabled:opacity-40 hover:bg-emerald-700 transition-colors"
          >
            {sending ? "Sending…" : "Send invite →"}
          </button>
        </form>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">
          Organizations <span className="text-gray-400 font-normal">({orgs.length})</span>
        </h2>
        {orgs.length === 0 ? (
          <p className="text-sm text-gray-400">No organizations yet.</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {orgs.map(org => (
              <div key={org.id} className="flex items-center justify-between py-2.5">
                <p className="text-sm font-medium text-gray-900">{org.name}</p>
                <p className="text-xs text-gray-300 font-mono">{org.id.slice(0, 8)}…</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
