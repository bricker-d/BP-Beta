/**
 * BioPrecision Clinical Library
 * ─────────────────────────────────────────────────────────────────────────────
 * Single source of truth for biomarker metadata, functional medicine optimal
 * ranges, peer-reviewed interventions, and liability-safe recommendation language.
 *
 * LEGAL NOTICE: All recommendations in this library are for informational and
 * educational purposes only. They do not constitute medical advice, diagnosis,
 * or treatment. Every recommendation is accompanied by its supporting evidence
 * and should be reviewed by a licensed clinician before implementation.
 *
 * Evidence grading:
 *   A = Multiple RCTs or systematic review/meta-analysis
 *   B = Single RCT or multiple observational studies
 *   C = Expert consensus, mechanistic evidence, or case series
 */

export type EvidenceGrade = "A" | "B" | "C";
export type ActionCategory = "Nutrition" | "Exercise" | "Movement" | "Supplement" | "Sleep" | "Lifestyle";
export type BiomarkerCategory = "metabolic" | "lipid" | "hormone" | "vitamin" | "inflammatory" | "cbc" | "kidney" | "liver" | "thyroid" | "nutrition";

export interface Citation {
  authors: string;
  year: number;
  title: string;
  journal: string;
  pmid?: string;
  doi?: string;
  finding: string; // one-sentence summary of what this study found
}

export interface ClinicalIntervention {
  title: string;
  description: string;
  category: ActionCategory;
  mechanism: string;           // biological mechanism, accessible language
  effectSize: string;          // quantified expected change
  timeToEffect: string;        // realistic timeline
  evidenceGrade: EvidenceGrade;
  citations: Citation[];
  contraindications?: string;  // when NOT to recommend this
  targetBiomarkers: string[];
}

export interface BiomarkerMeta {
  id: string;
  name: string;
  shortName: string;
  unit: string;
  category: BiomarkerCategory;
  // Functional medicine optimal ranges (not conventional lab ranges)
  optimalMin: number;
  optimalMax: number;
  // For sex-specific markers
  optimalMinFemale?: number;
  optimalMaxFemale?: number;
  description: string;
  mechanismSummary: string;    // why this marker matters clinically
  clinicalSignificance: string; // what out-of-range means for the patient
  interventions: ClinicalIntervention[];
}

// ── DISCLAIMER ────────────────────────────────────────────────────────────────
export const CLINICAL_DISCLAIMER = `
IMPORTANT: The following recommendations are evidence-based lifestyle and nutritional 
suggestions, not medical prescriptions. They are intended to support — not replace — 
care from a licensed healthcare provider. Before making changes to supplements, diet, 
or exercise, particularly if you have a medical condition or take medications, consult 
your physician. Effect sizes cited are from peer-reviewed research and represent 
population averages; individual responses will vary.
`.trim();

// ── COMPREHENSIVE BIOMARKER LIBRARY ──────────────────────────────────────────

export const BIOMARKER_LIBRARY: Record<string, BiomarkerMeta> = {

  // ── METABOLIC ──────────────────────────────────────────────────────────────

  glucose: {
    id: "glucose",
    name: "Fasting Glucose",
    shortName: "Glucose",
    unit: "mg/dL",
    category: "metabolic",
    optimalMin: 70,
    optimalMax: 85,
    description: "Fasting blood glucose reflects insulin sensitivity and carbohydrate metabolism.",
    mechanismSummary: "Chronically elevated glucose drives non-enzymatic glycation of proteins, oxidative stress, and mitochondrial dysfunction. Each 10 mg/dL rise above 85 is associated with measurable increases in cardiovascular and cognitive risk, even within the 'normal' range.",
    clinicalSignificance: "Fasting glucose above 85 mg/dL (functional medicine optimal) indicates early insulin resistance, years before conventional diabetes criteria are met. Intervention at this stage is highly effective.",
    interventions: [
      {
        title: "Post-meal walks (10 min after each meal)",
        description: "Walk briskly for 10 minutes within 30 minutes of finishing each meal",
        category: "Movement",
        mechanism: "Skeletal muscle contraction activates GLUT-4 transporters independently of insulin, clearing glucose from the bloodstream. Post-meal activation is most effective during the glucose absorption window (30–90 min post-meal).",
        effectSize: "−20–30 mg/dL reduction in postprandial glucose peak; −2–4 mg/dL fasting glucose over 4 weeks",
        timeToEffect: "Immediate postprandial effect; fasting improvement within 2–4 weeks",
        evidenceGrade: "A",
        citations: [
          {
            authors: "DiPietro L, et al.",
            year: 2013,
            title: "Three 15-min bouts of moderate postmeal walking significantly improves 24-h blood glucose in older people at risk for impaired glucose tolerance",
            journal: "Diabetes Care",
            pmid: "23439147",
            finding: "Short post-meal walks reduced 24-hour glucose AUC by 12% compared to a single 45-min morning walk."
          },
          {
            authors: "Buffey AJ, et al.",
            year: 2022,
            title: "The Acute Effect of Interrupting Prolonged Sitting Time in Adults with Standing and Light-Intensity Walking on Biomarkers of Cardiometabolic Health in Adults",
            journal: "Sports Medicine",
            pmid: "35394288",
            finding: "2-minute light walks every 20 minutes reduced postprandial glucose by 17% versus uninterrupted sitting."
          }
        ],
        targetBiomarkers: ["glucose", "hba1c"],
      },
      {
        title: "Meal sequencing: protein and vegetables before carbohydrates",
        description: "Start every meal with protein (meat, fish, eggs) or fiber (vegetables, salad), leave starchy carbs for last",
        category: "Nutrition",
        mechanism: "Protein and fiber consumed first slow gastric emptying and stimulate GLP-1 secretion, blunting the glucose absorption rate from subsequent carbohydrates. This works regardless of total carbohydrate intake.",
        effectSize: "−29–37% reduction in postprandial glucose peak; −28% postprandial insulin peak",
        timeToEffect: "Immediate — works from the first meal",
        evidenceGrade: "A",
        citations: [
          {
            authors: "Shukla AP, et al.",
            year: 2017,
            title: "Food Order Has a Significant Impact on Postprandial Glucose and Insulin Levels",
            journal: "Diabetes Care",
            pmid: "28483301",
            finding: "Eating vegetables and protein before carbohydrates reduced peak postprandial glucose by 29% and insulin by 28% vs. carbohydrates first."
          }
        ],
        targetBiomarkers: ["glucose", "hba1c"],
      },
      {
        title: "Magnesium glycinate 400mg nightly",
        description: "Take 400mg magnesium glycinate with dinner or before bed",
        category: "Supplement",
        mechanism: "Magnesium is a cofactor for over 300 enzymatic reactions including insulin receptor kinase activity and GLUT-4 translocation. Intracellular magnesium depletion (common even with normal serum Mg) impairs insulin signaling.",
        effectSize: "−3–5 mg/dL fasting glucose; improvement in HOMA-IR insulin resistance index",
        timeToEffect: "8–12 weeks of consistent supplementation",
        evidenceGrade: "A",
        citations: [
          {
            authors: "Guerrero-Romero F, et al.",
            year: 2015,
            title: "Oral magnesium supplementation improves insulin sensitivity in non-diabetic subjects with insulin resistance: a double-blind placebo-controlled randomized trial",
            journal: "Diabetes & Metabolism",
            pmid: "25862614",
            finding: "Magnesium supplementation (382 mg/day × 3 months) improved insulin sensitivity by 14% in insulin-resistant adults."
          },
          {
            authors: "Simental-Mendía LE, et al.",
            year: 2014,
            title: "Effect of magnesium supplementation on glucose metabolism in people with or at-risk of diabetes: a systematic review",
            journal: "European Journal of Clinical Nutrition",
            pmid: "24516558",
            finding: "Meta-analysis of 9 RCTs found significant reductions in fasting glucose with magnesium supplementation."
          }
        ],
        contraindications: "Use caution with impaired kidney function (CKD). Doses above 400mg may cause loose stools.",
        targetBiomarkers: ["glucose", "hba1c"],
      },
      {
        title: "Berberine 500mg twice daily with meals",
        description: "500mg berberine with breakfast and dinner (1000mg total/day)",
        category: "Supplement",
        mechanism: "Berberine activates AMPK (the same pathway as metformin), increases insulin receptor expression, inhibits hepatic gluconeogenesis, and improves gut microbiome composition. It also slows carbohydrate digestion by inhibiting alpha-glucosidase.",
        effectSize: "−15–25 mg/dL fasting glucose; −0.5–0.9% HbA1c reduction",
        timeToEffect: "4–12 weeks",
        evidenceGrade: "A",
        citations: [
          {
            authors: "Yin J, et al.",
            year: 2008,
            title: "Efficacy of berberine in patients with type 2 diabetes mellitus",
            journal: "Metabolism",
            pmid: "18442638",
            finding: "Berberine reduced fasting glucose by 20% and HbA1c by 0.9% — comparable to metformin — in a 3-month RCT."
          }
        ],
        contraindications: "May interact with medications metabolized by CYP3A4. Not recommended during pregnancy. Consult physician if on diabetes medications.",
        targetBiomarkers: ["glucose", "hba1c"],
      }
    ]
  },

  hba1c: {
    id: "hba1c",
    name: "Hemoglobin A1c",
    shortName: "HbA1c",
    unit: "%",
    category: "metabolic",
    optimalMin: 4.8,
    optimalMax: 5.4,
    description: "3-month average blood glucose reflected in red blood cell glycation.",
    mechanismSummary: "HbA1c reflects the cumulative glycation burden on hemoglobin over ~90 days. Each 1% rise above 5.4% is associated with a 20–30% increase in cardiovascular event risk. It is a direct measure of the glycation stress placed on all proteins in the body.",
    clinicalSignificance: "HbA1c between 5.5–5.9% indicates prediabetes trajectory. Functional medicine optimal is 4.8–5.4%. Intervention at 5.5% is far more effective than waiting for the 6.5% diabetes threshold.",
    interventions: [
      {
        title: "Zone 2 aerobic exercise — 150 min/week",
        description: "5 sessions of 30 minutes at a comfortable conversational pace (brisk walk, cycling, swimming)",
        category: "Exercise",
        mechanism: "Sustained low-intensity aerobic exercise maximizes mitochondrial biogenesis and GLUT-4 expression in skeletal muscle. Unlike high-intensity training, Zone 2 specifically targets fat oxidation and metabolic efficiency, improving insulin sensitivity durably.",
        effectSize: "−0.5–0.7% HbA1c reduction over 12 weeks",
        timeToEffect: "Measurable improvement in 8–12 weeks; HbA1c reflects 90-day average",
        evidenceGrade: "A",
        citations: [
          {
            authors: "Umpierre D, et al.",
            year: 2011,
            title: "Physical activity advice only or structured exercise training and association with HbA1c levels in type 2 diabetes: a systematic review and meta-analysis",
            journal: "JAMA",
            pmid: "21540423",
            finding: "Structured exercise reduced HbA1c by 0.67% vs 0.43% for activity advice alone in a meta-analysis of 47 trials."
          }
        ],
        targetBiomarkers: ["hba1c", "glucose", "triglycerides"],
      }
    ]
  },

  fastingInsulin: {
    id: "fastingInsulin",
    name: "Fasting Insulin",
    shortName: "Insulin",
    unit: "µIU/mL",
    category: "metabolic",
    optimalMin: 2,
    optimalMax: 6,
    description: "Fasting insulin is the most sensitive early marker of insulin resistance, often elevated years before glucose rises.",
    mechanismSummary: "The pancreas compensates for early insulin resistance by secreting more insulin to maintain normal glucose. Fasting insulin above 6–8 µIU/mL with normal glucose is the hallmark of early insulin resistance (compensated hyperinsulinemia).",
    clinicalSignificance: "Elevated fasting insulin predicts metabolic syndrome, NAFLD, cardiovascular disease, and certain cancers independent of glucose levels. It is the earliest actionable metabolic biomarker.",
    interventions: [
      {
        title: "Time-restricted eating (16:8 window)",
        description: "Eat all meals within an 8-hour window (e.g., 12pm–8pm), fast for 16 hours including sleep",
        category: "Nutrition",
        mechanism: "Fasting periods allow insulin to return to baseline, preventing chronic insulin elevation. Extended fasting windows improve insulin sensitivity by reducing total insulin secretion burden and increasing AMPK activity.",
        effectSize: "−20–30% reduction in fasting insulin over 8–12 weeks",
        timeToEffect: "4–8 weeks for consistent practice",
        evidenceGrade: "B",
        citations: [
          {
            authors: "Sutton EF, et al.",
            year: 2018,
            title: "Early time-restricted feeding improves insulin sensitivity, blood pressure, and oxidative stress even without weight loss in men with prediabetes",
            journal: "Cell Metabolism",
            pmid: "29754952",
            finding: "5-week early TRE reduced fasting insulin by 3.4 µIU/mL and improved insulin sensitivity independent of weight loss."
          }
        ],
        targetBiomarkers: ["fastingInsulin", "glucose", "triglycerides"],
      }
    ]
  },

  // ── LIPIDS ─────────────────────────────────────────────────────────────────

  ldl: {
    id: "ldl",
    name: "LDL Cholesterol",
    shortName: "LDL-C",
    unit: "mg/dL",
    category: "lipid",
    optimalMin: 0,
    optimalMax: 100,
    description: "Low-density lipoprotein cholesterol — primary driver of atherosclerotic plaque.",
    mechanismSummary: "LDL particles penetrate arterial walls and undergo oxidation, triggering inflammatory cascade and foam cell formation. LDL particle number (LDL-P) is more predictive than LDL-C concentration, but LDL-C above 100 mg/dL warrants intervention.",
    clinicalSignificance: "Every 40 mg/dL reduction in LDL-C is associated with a 20–25% reduction in major cardiovascular events per decade of treatment. Functional medicine target is <100 mg/dL; high-risk patients <70 mg/dL.",
    interventions: [
      {
        title: "Psyllium husk fiber 10g daily",
        description: "1 tablespoon (5–7g) psyllium husk in water before breakfast and dinner",
        category: "Nutrition",
        mechanism: "Soluble fiber forms a viscous gel in the small intestine that binds bile acids, preventing their reabsorption. The liver compensates by pulling LDL-C from the bloodstream to synthesize new bile acids, directly lowering serum LDL.",
        effectSize: "−5–10 mg/dL LDL-C reduction",
        timeToEffect: "4–6 weeks",
        evidenceGrade: "A",
        citations: [
          {
            authors: "Brown L, et al.",
            year: 1999,
            title: "Cholesterol-lowering effects of dietary fiber: a meta-analysis",
            journal: "American Journal of Clinical Nutrition",
            pmid: "9925120",
            finding: "Meta-analysis: each additional gram of soluble fiber/day reduces LDL by approximately 2.2 mg/dL."
          }
        ],
        targetBiomarkers: ["ldl", "totalCholesterol"],
      },
      {
        title: "Replace saturated fat with olive oil and avocado",
        description: "Substitute butter, coconut oil, and animal fat with extra-virgin olive oil and avocado at every meal",
        category: "Nutrition",
        mechanism: "Replacing saturated fat (raises LDL via downregulation of hepatic LDL receptors) with monounsaturated fat maintains LDL receptor upregulation, lowering LDL by 8–15%.",
        effectSize: "−5–15 mg/dL LDL-C; +HDL; improved LDL particle size",
        timeToEffect: "4–8 weeks",
        evidenceGrade: "A",
        citations: [
          {
            authors: "Estruch R, et al.",
            year: 2013,
            title: "Primary prevention of cardiovascular disease with a Mediterranean diet (PREDIMED)",
            journal: "New England Journal of Medicine",
            pmid: "23432189",
            finding: "Mediterranean diet with olive oil reduced LDL and cardiovascular events by 30% over 5 years in high-risk adults."
          }
        ],
        targetBiomarkers: ["ldl", "hdl", "totalCholesterol"],
      },
      {
        title: "Red yeast rice 1200mg daily (with CoQ10)",
        description: "600mg red yeast rice twice daily with food; always pair with CoQ10 100–200mg to prevent depletion",
        category: "Supplement",
        mechanism: "Red yeast rice contains monacolin K, a natural HMG-CoA reductase inhibitor (same mechanism as statins). CoQ10 supplementation is essential as both statins and monacolin K inhibit CoQ10 synthesis.",
        effectSize: "−15–25% LDL-C reduction",
        timeToEffect: "6–8 weeks",
        evidenceGrade: "A",
        citations: [
          {
            authors: "Becker DJ, et al.",
            year: 2009,
            title: "Red yeast rice for dyslipidemia in statin-intolerant patients: a randomized trial",
            journal: "Annals of Internal Medicine",
            pmid: "19364997",
            finding: "Red yeast rice reduced LDL-C by 21% vs 9% placebo over 24 weeks in statin-intolerant patients."
          }
        ],
        contraindications: "Not recommended during pregnancy, liver disease, or with statin medications (double dosing). Always pair with CoQ10. Consult physician.",
        targetBiomarkers: ["ldl", "totalCholesterol"],
      }
    ]
  },

  hdl: {
    id: "hdl",
    name: "HDL Cholesterol",
    shortName: "HDL-C",
    unit: "mg/dL",
    category: "lipid",
    optimalMin: 60,
    optimalMax: 120,
    description: "High-density lipoprotein — reverse cholesterol transport, anti-inflammatory.",
    mechanismSummary: "HDL facilitates reverse cholesterol transport, removing cholesterol from arterial walls back to the liver for excretion. HDL functionality (capacity to accept cholesterol) matters as much as quantity — dysfunctional HDL in chronic inflammation loses its cardioprotective properties.",
    clinicalSignificance: "HDL below 60 mg/dL is an independent cardiovascular risk factor. Raising HDL by 1 mg/dL is associated with a 2–3% reduction in coronary artery disease risk.",
    interventions: [
      {
        title: "Aerobic exercise — 30+ min, 5x/week",
        description: "Any sustained moderate-intensity cardio: brisk walking, cycling, swimming, rowing",
        category: "Exercise",
        mechanism: "Aerobic exercise increases hepatic lipase activity and apolipoprotein A-I synthesis, the primary structural protein of HDL. It also promotes reverse cholesterol transport activity independent of HDL-C concentration.",
        effectSize: "+3–9% HDL-C increase; improved HDL particle functionality",
        timeToEffect: "8–12 weeks of consistent training",
        evidenceGrade: "A",
        citations: [
          {
            authors: "Kodama S, et al.",
            year: 2007,
            title: "Effect of aerobic exercise training on serum levels of high-density lipoprotein cholesterol",
            journal: "Archives of Internal Medicine",
            pmid: "17353497",
            finding: "Meta-analysis of 25 RCTs: aerobic exercise raised HDL-C by 2.53 mg/dL; higher duration and intensity produced greater benefit."
          }
        ],
        targetBiomarkers: ["hdl", "triglycerides"],
      },
      {
        title: "Niacin (niacinamide NOT effective — use nicotinic acid form)",
        description: "Immediate-release nicotinic acid 500mg with dinner — increase slowly under physician guidance",
        category: "Supplement",
        mechanism: "Nicotinic acid (not niacinamide) inhibits hepatic diacylglycerol O-acyltransferase 2, reducing VLDL production and increasing HDL-C via decreased HDL catabolism.",
        effectSize: "+15–35% HDL-C at therapeutic doses",
        timeToEffect: "4–8 weeks",
        evidenceGrade: "A",
        contraindications: "Can cause flushing; take with food and aspirin 325mg 30 min prior. Contraindicated with liver disease, active peptic ulcer, uncontrolled diabetes. Requires physician oversight.",
        citations: [
          {
            authors: "Guyton JR, et al.",
            year: 1998,
            title: "Extended-release niacin vs gemfibrozil for the treatment of low levels of high-density lipoprotein cholesterol",
            journal: "Archives of Internal Medicine",
            pmid: "9822816",
            finding: "Niacin raised HDL-C by 29% vs 7% for gemfibrozil over 14 weeks."
          }
        ],
        targetBiomarkers: ["hdl"],
      }
    ]
  },

  triglycerides: {
    id: "triglycerides",
    name: "Triglycerides",
    shortName: "TG",
    unit: "mg/dL",
    category: "lipid",
    optimalMin: 0,
    optimalMax: 100,
    description: "Blood fat reflecting carbohydrate intake, insulin resistance, and liver fat.",
    mechanismSummary: "Triglycerides are produced in the liver from excess carbohydrates (de novo lipogenesis), particularly fructose and refined carbs. Elevated TG promotes small dense LDL particles (most atherogenic), VLDL overproduction, and hepatic fat accumulation.",
    clinicalSignificance: "Triglycerides above 100 mg/dL indicate insulin resistance or excess refined carbohydrate intake. Above 150 mg/dL is a component of metabolic syndrome. Reducing triglycerides is one of the fastest-responding metabolic interventions.",
    interventions: [
      {
        title: "Eliminate added sugar and refined carbohydrates",
        description: "Remove sweetened beverages, desserts, white bread, white rice, and packaged snacks for 4 weeks",
        category: "Nutrition",
        mechanism: "Dietary fructose and rapidly absorbed carbohydrates are the primary substrate for hepatic de novo lipogenesis. The liver converts excess glucose/fructose into triglycerides and packages them into VLDL for secretion.",
        effectSize: "−20–50% triglyceride reduction in 4 weeks",
        timeToEffect: "2–4 weeks (fastest-responding lipid intervention)",
        evidenceGrade: "A",
        citations: [
          {
            authors: "Stanhope KL, et al.",
            year: 2009,
            title: "Consuming fructose-sweetened, not glucose-sweetened, beverages increases visceral adiposity and lipids and decreases insulin sensitivity in overweight/obese humans",
            journal: "Journal of Clinical Investigation",
            pmid: "19381015",
            finding: "10-week fructose consumption increased fasting triglycerides by 19% and reduced insulin sensitivity."
          }
        ],
        targetBiomarkers: ["triglycerides", "glucose", "hba1c"],
      },
      {
        title: "Omega-3 fatty acids (EPA+DHA) 2–4g daily",
        description: "2–4g combined EPA+DHA from fish oil with the largest meal of the day",
        category: "Supplement",
        mechanism: "EPA and DHA reduce hepatic VLDL-TG production by inhibiting fatty acid synthesis enzymes (SREBP-1c) and increasing beta-oxidation of fatty acids. FDA-approved at 4g/day for hypertriglyceridemia.",
        effectSize: "−15–30% TG reduction at 2–4g/day",
        timeToEffect: "4–8 weeks",
        evidenceGrade: "A",
        citations: [
          {
            authors: "Harris WS",
            year: 1997,
            title: "n-3 fatty acids and serum lipoproteins: human studies",
            journal: "American Journal of Clinical Nutrition",
            pmid: "9129497",
            finding: "Meta-analysis: 4g/day omega-3 reduces triglycerides by 25–30% in hypertriglyceridemic patients."
          },
          {
            authors: "Bhatt DL, et al.",
            year: 2019,
            title: "Cardiovascular Risk Reduction with Icosapentaenoic Acid for Hypertriglyceridemia (REDUCE-IT)",
            journal: "New England Journal of Medicine",
            pmid: "30145944",
            finding: "4g/day icosapentaenoic acid reduced major adverse cardiovascular events by 25% in patients with elevated TG."
          }
        ],
        targetBiomarkers: ["triglycerides", "ldl"],
      }
    ]
  },

  apoB: {
    id: "apoB",
    name: "Apolipoprotein B",
    shortName: "ApoB",
    unit: "mg/dL",
    category: "lipid",
    optimalMin: 0,
    optimalMax: 90,
    description: "The most precise marker of atherogenic particle burden — one ApoB per LDL, VLDL, and IDL particle.",
    mechanismSummary: "Every atherogenic lipoprotein particle (LDL, VLDL, IDL, Lp(a)) carries exactly one ApoB molecule. ApoB concentration directly measures the total number of atherogenic particles and is a better predictor of cardiovascular risk than LDL-C alone, especially in metabolic syndrome.",
    clinicalSignificance: "ApoB above 90 mg/dL indicates elevated atherogenic particle burden even when LDL-C appears acceptable. It should be the primary lipid target in patients with insulin resistance or high triglycerides.",
    interventions: [
      {
        title: "Reduce saturated fat + increase soluble fiber simultaneously",
        description: "Combine olive oil substitution with daily psyllium fiber — these two interventions have additive ApoB-lowering effects",
        category: "Nutrition",
        mechanism: "Saturated fat reduces hepatic LDL receptor expression (raises ApoB); soluble fiber removes bile acids (compensatory upregulation of LDL receptors lowers ApoB). Combined effect is greater than either alone.",
        effectSize: "−10–15% ApoB reduction combined",
        timeToEffect: "6–8 weeks",
        evidenceGrade: "B",
        citations: [
          {
            authors: "Jenkins DJ, et al.",
            year: 2003,
            title: "Effects of a dietary portfolio of cholesterol-lowering foods vs lovastatin on serum lipids and C-reactive protein",
            journal: "JAMA",
            pmid: "12851273",
            finding: "Dietary portfolio (soy, nuts, fiber, plant sterols) reduced LDL-C by 28.6% — comparable to first-generation statins."
          }
        ],
        targetBiomarkers: ["apoB", "ldl", "totalCholesterol"],
      }
    ]
  },

  lpa: {
    id: "lpa",
    name: "Lipoprotein(a)",
    shortName: "Lp(a)",
    unit: "nmol/L",
    category: "lipid",
    optimalMin: 0,
    optimalMax: 75,
    description: "Genetically determined atherogenic lipoprotein — independent cardiovascular risk factor.",
    mechanismSummary: "Lp(a) is an LDL-like particle with an additional apolipoprotein(a) attached, making it both atherogenic and prothrombotic. Unlike LDL, Lp(a) is largely genetically determined (~80% heritability) and resistant to lifestyle modification. Elevated Lp(a) is present in ~20% of the population.",
    clinicalSignificance: "Lp(a) above 75 nmol/L (or 30 mg/dL) doubles cardiovascular risk independent of LDL. It is not reducible with diet alone but is a critical risk stratifier that changes therapeutic targets for other risk factors.",
    interventions: [
      {
        title: "Accelerate LDL reduction targets given Lp(a) burden",
        description: "When Lp(a) is elevated, target LDL-C below 70 mg/dL rather than 100 mg/dL to compensate for the additive atherogenic risk",
        category: "Lifestyle",
        mechanism: "Because Lp(a) cannot be meaningfully reduced by lifestyle, reducing modifiable risk factors (LDL-C, inflammation, blood pressure) more aggressively is the evidence-based compensatory strategy.",
        effectSize: "Compensatory risk reduction — LDL lowering has additive benefit when Lp(a) is elevated",
        timeToEffect: "Ongoing risk management strategy",
        evidenceGrade: "B",
        citations: [
          {
            authors: "Nordestgaard BG, et al.",
            year: 2010,
            title: "Lipoprotein(a) as a cardiovascular risk factor: current status",
            journal: "European Heart Journal",
            pmid: "20965889",
            finding: "Meta-analysis of 36 studies: each 3.5-fold increase in Lp(a) is associated with 13% increase in coronary heart disease risk."
          }
        ],
        targetBiomarkers: ["lpa", "ldl"],
      },
      {
        title: "Niacin (nicotinic acid) 1–2g daily",
        description: "Nicotinic acid is the only widely available agent that reduces Lp(a) — under physician supervision",
        category: "Supplement",
        mechanism: "Niacin reduces hepatic Lp(a) synthesis. It is currently the most accessible Lp(a)-lowering agent pending FDA approval of newer therapies (PCSK9i have modest effect; RNA therapies in trials).",
        effectSize: "−15–25% Lp(a) reduction",
        timeToEffect: "8–12 weeks",
        evidenceGrade: "B",
        contraindications: "Requires physician oversight. Flushing, liver effects at higher doses. Not combined with statins without monitoring.",
        citations: [
          {
            authors: "Carlson LA, et al.",
            year: 1989,
            title: "Pronounced lowering of serum levels of lipoprotein Lp(a) in hyperlipidaemic subjects treated with nicotinic acid",
            journal: "Journal of Internal Medicine",
            pmid: "2643201",
            finding: "Nicotinic acid 3–4g/day reduced Lp(a) by 35% in hyperlipidemic patients."
          }
        ],
        targetBiomarkers: ["lpa"],
      }
    ]
  },

  // ── INFLAMMATORY ───────────────────────────────────────────────────────────

  hscrp: {
    id: "hscrp",
    name: "hs-CRP",
    shortName: "CRP",
    unit: "mg/L",
    category: "inflammatory",
    optimalMin: 0,
    optimalMax: 0.5,
    description: "High-sensitivity C-reactive protein — systemic inflammation marker.",
    mechanismSummary: "CRP is produced by the liver in response to IL-6 and TNF-α. Chronic low-grade elevation (>1 mg/L) indicates persistent inflammatory signaling from visceral fat, gut dysbiosis, chronic stress, sleep deprivation, or subclinical infection.",
    clinicalSignificance: "hs-CRP above 1 mg/L is an independent cardiovascular risk factor (JUPITER trial). Above 3 mg/L indicates high cardiovascular risk. Above 10 mg/L suggests acute infection or injury — do not make lifestyle adjustments until acute illness is resolved.",
    interventions: [
      {
        title: "Curcumin (BCM-95 or Meriva formulation) 500–1000mg daily",
        description: "500mg standardized curcumin extract with a fat-containing meal (enhances absorption) — bioavailable form required",
        category: "Supplement",
        mechanism: "Curcumin inhibits NF-κB transcription factor and reduces IL-6, TNF-α, and IL-1β — the upstream cytokines that drive hepatic CRP production. Standard curcumin has <1% bioavailability; BCM-95 or Meriva formulations achieve 7–27x higher absorption.",
        effectSize: "−15–35% hs-CRP reduction over 8–12 weeks",
        timeToEffect: "4–8 weeks for initial improvement; 12 weeks for full effect",
        evidenceGrade: "A",
        citations: [
          {
            authors: "Sahebkar A, et al.",
            year: 2016,
            title: "Effect of curcuminoids on oxidative stress: A systematic review and meta-analysis of randomized controlled trials",
            journal: "Journal of Functional Foods",
            doi: "10.1016/j.jff.2015.11.008",
            finding: "Meta-analysis of 8 RCTs: curcumin significantly reduced hs-CRP, IL-6, and TNF-α."
          }
        ],
        contraindications: "High doses may increase bleeding risk. Use caution with anticoagulants (warfarin, aspirin).",
        targetBiomarkers: ["hscrp"],
      },
      {
        title: "Prioritize 7.5–8 hours sleep nightly",
        description: "Set a consistent sleep/wake schedule — be asleep by 10:30pm, wake at 6–7am",
        category: "Sleep",
        mechanism: "Sleep deprivation activates the sympathetic nervous system and HPA axis, elevating cortisol and catecholamines that directly stimulate IL-6 and CRP production. Even one week of insufficient sleep produces measurable inflammatory elevation.",
        effectSize: "Significant CRP reduction within 2 weeks of sleep restoration; up to 40% reduction in chronically sleep-deprived individuals",
        timeToEffect: "1–2 weeks",
        evidenceGrade: "A",
        citations: [
          {
            authors: "Irwin MR, et al.",
            year: 2016,
            title: "Sleep Disturbance, Sleep Duration, and Inflammation: A Systematic Review and Meta-Analysis of Cohort Studies",
            journal: "Biological Psychiatry",
            pmid: "26140821",
            finding: "Short sleep duration was associated with 45% higher odds of elevated CRP and IL-6 compared to adequate sleep."
          }
        ],
        targetBiomarkers: ["hscrp", "cortisol", "glucose"],
      },
      {
        title: "Omega-3 fatty acids 2–4g EPA+DHA daily",
        description: "2–4g combined EPA+DHA from high-quality fish oil with meals",
        category: "Supplement",
        mechanism: "EPA and DHA are precursors to anti-inflammatory resolvins and protectins that actively resolve inflammation. They competitively inhibit arachidonic acid conversion to pro-inflammatory prostaglandins and leukotrienes.",
        effectSize: "−10–30% hs-CRP reduction",
        timeToEffect: "6–12 weeks",
        evidenceGrade: "A",
        citations: [
          {
            authors: "Calder PC",
            year: 2006,
            title: "n-3 polyunsaturated fatty acids, inflammation, and inflammatory diseases",
            journal: "American Journal of Clinical Nutrition",
            pmid: "16841861",
            finding: "Comprehensive review: EPA+DHA consistently reduces inflammatory markers including CRP, IL-6, and TNF-α."
          }
        ],
        targetBiomarkers: ["hscrp", "triglycerides"],
      }
    ]
  },

  homocysteine: {
    id: "homocysteine",
    name: "Homocysteine",
    shortName: "Hcy",
    unit: "µmol/L",
    category: "inflammatory",
    optimalMin: 0,
    optimalMax: 9,
    description: "Sulfur-containing amino acid — cardiovascular and cognitive risk marker; reflects B-vitamin status.",
    mechanismSummary: "Homocysteine damages arterial endothelium directly, promotes oxidative stress, and is prothrombotic. It reflects the efficiency of the methylation cycle — high homocysteine indicates insufficient folate, B6, or B12 for its conversion to methionine or cysteine.",
    clinicalSignificance: "Homocysteine above 10 µmol/L is associated with 2x increase in cardiovascular risk. Above 15 µmol/L (hyperhomocysteinemia) is associated with cognitive decline, stroke, and venous thrombosis. It is almost universally responsive to B-vitamin supplementation.",
    interventions: [
      {
        title: "Methylated B-vitamin complex",
        description: "Daily supplement containing: methyl-B12 (1000–2000mcg), methylfolate (5-MTHF, 800–1000mcg), and P5P (activated B6, 50mg)",
        category: "Supplement",
        mechanism: "Homocysteine is remethylated to methionine via methylfolate + B12 (MTHFR pathway), or transsulfurated to cysteine via B6. The methylated forms bypass common MTHFR polymorphisms (C677T, A1298C) that impair conversion of standard folic acid.",
        effectSize: "−25–50% homocysteine reduction over 8–12 weeks",
        timeToEffect: "4–8 weeks",
        evidenceGrade: "A",
        citations: [
          {
            authors: "Lonn E, et al. (HOPE-2 Investigators)",
            year: 2006,
            title: "Homocysteine lowering with folic acid and B vitamins in vascular disease",
            journal: "New England Journal of Medicine",
            pmid: "16531613",
            finding: "B-vitamin supplementation (folic acid + B6 + B12) reduced homocysteine by 25% and stroke risk by 25%."
          }
        ],
        contraindications: "Very high dose B12 (>5000mcg) may trigger acne in some individuals. Use methylated forms for best results.",
        targetBiomarkers: ["homocysteine"],
      }
    ]
  },

  uricAcid: {
    id: "uricAcid",
    name: "Uric Acid",
    shortName: "UA",
    unit: "mg/dL",
    category: "metabolic",
    optimalMin: 2.5,
    optimalMax: 5.5,
    description: "End product of purine metabolism — elevated levels indicate gout risk, insulin resistance, and cardiovascular risk.",
    mechanismSummary: "Uric acid is produced by xanthine oxidase from purine catabolism and fructose metabolism. Hyperuricemia promotes inflammation via NLRP3 inflammasome activation, impairs endothelial nitric oxide production, and is strongly linked to insulin resistance and metabolic syndrome.",
    clinicalSignificance: "Uric acid above 6 mg/dL in women and 7 mg/dL in men increases gout risk. Above 5.5 mg/dL is associated with hypertension, insulin resistance, and NAFLD independent of gout.",
    interventions: [
      {
        title: "Eliminate high-fructose corn syrup and reduce fructose",
        description: "Remove soda, fruit juice, and HFCS-containing foods — these are the primary dietary drivers of elevated uric acid",
        category: "Nutrition",
        mechanism: "Fructose metabolism generates uric acid as a byproduct via ATP depletion pathway — the only dietary macronutrient that does this. High-fructose corn syrup is the leading dietary cause of elevated uric acid.",
        effectSize: "−1–2 mg/dL uric acid reduction over 4–8 weeks",
        timeToEffect: "2–4 weeks",
        evidenceGrade: "A",
        citations: [
          {
            authors: "Nakagawa T, et al.",
            year: 2006,
            title: "A causal role for uric acid in fructose-induced metabolic syndrome",
            journal: "American Journal of Physiology — Renal Physiology",
            pmid: "16234313",
            finding: "Fructose feeding elevated uric acid by 25% and induced metabolic syndrome; uric acid-lowering prevented the syndrome."
          }
        ],
        targetBiomarkers: ["uricAcid", "glucose"],
      },
      {
        title: "Tart cherry juice or extract",
        description: "8oz tart cherry juice or 480mg tart cherry extract daily",
        category: "Supplement",
        mechanism: "Anthocyanins in tart cherries inhibit xanthine oxidase (the enzyme producing uric acid) and have direct anti-inflammatory effects on urate crystal-induced inflammation.",
        effectSize: "−0.5–1.5 mg/dL uric acid reduction; significant reduction in gout flare frequency",
        timeToEffect: "2–4 weeks",
        evidenceGrade: "B",
        citations: [
          {
            authors: "Zhang Y, et al.",
            year: 2012,
            title: "Cherry consumption and decreased risk of recurrent gout attacks",
            journal: "Arthritis & Rheumatism",
            pmid: "23023818",
            finding: "Cherry intake was associated with 35% lower risk of gout attacks; effect was additive with allopurinol."
          }
        ],
        targetBiomarkers: ["uricAcid"],
      }
    ]
  },

  // ── HORMONES ───────────────────────────────────────────────────────────────

  testosterone: {
    id: "testosterone",
    name: "Total Testosterone",
    shortName: "T",
    unit: "ng/dL",
    category: "hormone",
    optimalMin: 600,
    optimalMax: 900,
    optimalMinFemale: 50,
    optimalMaxFemale: 150,
    description: "Primary anabolic hormone — muscle, bone, cognition, libido, insulin sensitivity.",
    mechanismSummary: "Testosterone drives protein synthesis, erythropoiesis, bone mineral density, and insulin sensitivity. Levels decline 1–2%/year after age 30. Functional deficiency often occurs with 'normal' lab values due to elevated SHBG reducing free testosterone.",
    clinicalSignificance: "Testosterone below 400 ng/dL produces clinical symptoms in most men. Functional medicine optimal is 600–900 ng/dL. Subclinical deficiency at 400–600 ng/dL responds well to lifestyle intervention before hormonal therapy is needed.",
    interventions: [
      {
        title: "Heavy resistance training 3–4x/week",
        description: "Compound barbell or dumbbell movements: squat, deadlift, bench press, rows — 45–60 min per session at high effort",
        category: "Exercise",
        mechanism: "Mechanical loading of large muscle groups stimulates acute testosterone and growth hormone release. Progressive overload over time upregulates hypothalamic-pituitary-gonadal axis sensitivity and Leydig cell testosterone production.",
        effectSize: "+15–25% total testosterone with consistent training over 12 weeks; larger acute spikes post-workout",
        timeToEffect: "4–8 weeks for measurable baseline change",
        evidenceGrade: "A",
        citations: [
          {
            authors: "Kraemer WJ & Ratamess NA",
            year: 2005,
            title: "Hormonal responses and adaptations to resistance exercise and training",
            journal: "Sports Medicine",
            pmid: "15831061",
            finding: "Comprehensive review: resistance training consistently elevates testosterone; heavy multi-joint exercises with short rest periods maximize hormonal response."
          }
        ],
        targetBiomarkers: ["testosterone"],
      },
      {
        title: "Sleep optimization — 7.5–9 hours",
        description: "Prioritize sleep as the single highest-leverage testosterone intervention — aim for sleep before midnight",
        category: "Sleep",
        mechanism: "60–70% of daily testosterone is secreted during sleep in pulsatile bursts tied to slow-wave and REM sleep stages. Even one week of 5-hour sleep reduces testosterone by 10–15% — equivalent to 10 years of age-related decline.",
        effectSize: "Maintain full testosterone output vs −10–15% with sleep restriction",
        timeToEffect: "Immediate — testosterone restores within days of adequate sleep",
        evidenceGrade: "A",
        citations: [
          {
            authors: "Leproult R & Van Cauter E",
            year: 2011,
            title: "Effect of 1 week of sleep restriction on testosterone levels in young healthy men",
            journal: "JAMA",
            pmid: "21632481",
            finding: "One week of sleep restriction to 5 hours per night reduced daytime testosterone levels by 10–15% in healthy young men."
          }
        ],
        targetBiomarkers: ["testosterone", "cortisol"],
      },
      {
        title: "Zinc 25–45mg daily with dinner",
        description: "Zinc glycinate or zinc picolinate 25–45mg with an evening meal (separate from calcium supplements)",
        category: "Supplement",
        mechanism: "Zinc is a cofactor for 5-alpha reductase and aromatase, and is required for LH receptor function in Leydig cells. Zinc deficiency directly impairs testosterone synthesis — common in athletes, vegetarians, and those with gut dysbiosis.",
        effectSize: "+25–50% testosterone in zinc-deficient men; modest effect if already replete",
        timeToEffect: "4–8 weeks",
        evidenceGrade: "B",
        citations: [
          {
            authors: "Prasad AS, et al.",
            year: 1996,
            title: "Zinc status and serum testosterone levels of healthy adults",
            journal: "Nutrition",
            pmid: "8875519",
            finding: "Zinc restriction reduced testosterone from 39.9 to 10.6 nmol/L in 20 weeks; zinc supplementation in deficient elderly men increased testosterone 94%."
          }
        ],
        contraindications: "Long-term zinc above 40mg/day can deplete copper — supplement copper 1–2mg if using zinc for more than 3 months.",
        targetBiomarkers: ["testosterone"],
      },
      {
        title: "Ashwagandha KSM-66 extract 300–600mg daily",
        description: "300mg KSM-66 standardized extract twice daily (or 600mg once with dinner)",
        category: "Supplement",
        mechanism: "Ashwagandha reduces cortisol (which directly suppresses testosterone via hypothalamic-pituitary axis), and has direct effects on testicular steroidogenesis. KSM-66 is the most bioavailable and studied extract form.",
        effectSize: "+10–22% testosterone increase; −27% cortisol",
        timeToEffect: "8–12 weeks",
        evidenceGrade: "B",
        citations: [
          {
            authors: "Wankhede S, et al.",
            year: 2015,
            title: "Examining the effect of Withania somnifera supplementation on muscle strength and recovery: a randomized controlled trial",
            journal: "Journal of the International Society of Sports Nutrition",
            pmid: "26609282",
            finding: "Ashwagandha 300mg twice daily increased testosterone by 15% and muscle strength significantly vs placebo over 8 weeks."
          }
        ],
        targetBiomarkers: ["testosterone", "cortisol"],
      }
    ]
  },

  freeTesto: {
    id: "freeTesto",
    name: "Free Testosterone",
    shortName: "Free T",
    unit: "pg/mL",
    category: "hormone",
    optimalMin: 15,
    optimalMax: 35,
    optimalMinFemale: 1,
    optimalMaxFemale: 8.5,
    description: "Biologically active testosterone fraction — not bound to SHBG or albumin.",
    mechanismSummary: "Only 1–3% of total testosterone is free (unbound) and biologically active. SHBG (sex hormone binding globulin) binds testosterone tightly, rendering it inactive. High SHBG (common with thyroid disease, liver disease, aging, and high estrogen) can produce low free T despite normal total T.",
    clinicalSignificance: "Symptoms of testosterone deficiency with normal total T often indicate elevated SHBG reducing free T. This is the more clinically relevant measurement for symptomatic patients.",
    interventions: [
      {
        title: "Address SHBG elevation — optimize thyroid and reduce alcohol",
        description: "Elevated SHBG is best treated by addressing its root cause: optimize TSH (target 0.5–2.0), reduce alcohol, and reduce estrogen excess",
        category: "Lifestyle",
        mechanism: "SHBG is upregulated by thyroid hormone (hyperthyroidism raises SHBG), estrogen, alcohol, and low insulin. Reducing these drivers lowers SHBG and increases free testosterone fraction.",
        effectSize: "Variable — depends on SHBG root cause",
        timeToEffect: "4–8 weeks",
        evidenceGrade: "B",
        citations: [
          {
            authors: "Plymate SR, et al.",
            year: 1988,
            title: "Inhibition of sex hormone-binding globulin production in the human hepatoma (Hep G2) cell line by insulin and prolactin",
            journal: "Journal of Clinical Endocrinology & Metabolism",
            pmid: "2836495",
            finding: "Insulin directly suppresses hepatic SHBG production — improving insulin sensitivity reduces SHBG."
          }
        ],
        targetBiomarkers: ["freeTesto", "shbg"],
      }
    ]
  },

  shbg: {
    id: "shbg",
    name: "SHBG",
    shortName: "SHBG",
    unit: "nmol/L",
    category: "hormone",
    optimalMin: 20,
    optimalMax: 60,
    description: "Sex hormone binding globulin — modulates free testosterone and estrogen availability.",
    mechanismSummary: "SHBG is a glycoprotein produced by the liver that binds testosterone and estradiol, rendering them biologically inactive. High SHBG reduces bioavailable sex hormones; low SHBG (often from insulin resistance) increases free estrogen and testosterone but may indicate metabolic dysfunction.",
    clinicalSignificance: "High SHBG: reduces free testosterone, may indicate thyroid excess, liver disease, or caloric restriction. Low SHBG: increases free estrogen, associated with insulin resistance, obesity, and PCOS.",
    interventions: [
      {
        title: "Optimize insulin sensitivity to normalize low SHBG",
        description: "For low SHBG — address insulin resistance with dietary carbohydrate reduction and exercise",
        category: "Exercise",
        mechanism: "Insulin directly suppresses hepatic SHBG production. Improving insulin sensitivity (via carbohydrate reduction, exercise, weight loss) naturally raises SHBG toward optimal.",
        effectSize: "+20–40% SHBG increase with insulin resistance reversal",
        timeToEffect: "8–16 weeks",
        evidenceGrade: "B",
        citations: [
          {
            authors: "Wallace IR, et al.",
            year: 2013,
            title: "Sex hormone binding globulin and insulin resistance",
            journal: "Clinical Endocrinology",
            pmid: "23374084",
            finding: "SHBG is inversely correlated with fasting insulin; improving insulin sensitivity is the primary intervention for low SHBG."
          }
        ],
        targetBiomarkers: ["shbg", "freeTesto"],
      }
    ]
  },

  cortisol: {
    id: "cortisol",
    name: "Cortisol (AM)",
    shortName: "Cortisol",
    unit: "µg/dL",
    category: "hormone",
    optimalMin: 10,
    optimalMax: 18,
    description: "Primary stress hormone — catabolic effects when chronically elevated.",
    mechanismSummary: "AM cortisol should peak within 30–45 minutes of waking (cortisol awakening response, CAR). Chronically elevated cortisol drives muscle protein catabolism, visceral fat accumulation, hippocampal neuron atrophy, immune suppression, and HPA axis dysregulation.",
    clinicalSignificance: "AM cortisol above 18 µg/dL with symptoms (fatigue, weight gain, poor sleep, mood dysregulation) warrants further evaluation. Below 10 µg/dL may indicate adrenal insufficiency. Both extremes are clinically significant.",
    interventions: [
      {
        title: "Ashwagandha KSM-66 600mg daily",
        description: "300mg twice daily with meals (breakfast and dinner)",
        category: "Supplement",
        mechanism: "Ashwagandha (specifically the KSM-66 root extract) reduces cortisol via hypothalamic-pituitary-adrenal axis modulation. It appears to reduce adrenal sensitivity to ACTH rather than blocking cortisol directly.",
        effectSize: "−17–27% cortisol reduction over 60 days",
        timeToEffect: "4–8 weeks",
        evidenceGrade: "A",
        citations: [
          {
            authors: "Chandrasekhar K, et al.",
            year: 2012,
            title: "A prospective, randomized double-blind, placebo-controlled study of safety and efficacy of a high-concentration full-spectrum extract of ashwagandha root",
            journal: "Indian Journal of Psychological Medicine",
            pmid: "23439798",
            finding: "Ashwagandha 300mg twice daily reduced serum cortisol by 27.9% vs 7.9% placebo over 60 days."
          }
        ],
        targetBiomarkers: ["cortisol", "testosterone"],
      },
      {
        title: "Daily mindfulness or breathwork — 10 min",
        description: "Box breathing (4s inhale–4s hold–4s exhale–4s hold) or guided meditation immediately after waking or before bed",
        category: "Lifestyle",
        mechanism: "Slow diaphragmatic breathing activates the vagus nerve and parasympathetic nervous system, directly suppressing HPA axis activity and reducing ACTH stimulation of cortisol synthesis. Effects are cumulative with consistent practice.",
        effectSize: "−10–20% cortisol reduction with consistent 8-week practice",
        timeToEffect: "2–4 weeks for measurable effect; 8 weeks for full benefit",
        evidenceGrade: "A",
        citations: [
          {
            authors: "Turakitwanakan W, et al.",
            year: 2013,
            title: "Effects of mindfulness meditation on serum cortisol of medical students",
            journal: "Journal of the Medical Association of Thailand",
            pmid: "23724462",
            finding: "8-week mindfulness program reduced cortisol levels significantly vs control in medical students."
          }
        ],
        targetBiomarkers: ["cortisol", "hscrp"],
      }
    ]
  },

  dheas: {
    id: "dheas",
    name: "DHEA-S",
    shortName: "DHEA-S",
    unit: "µg/dL",
    category: "hormone",
    optimalMin: 200,
    optimalMax: 400,
    optimalMinFemale: 100,
    optimalMaxFemale: 250,
    description: "Adrenal androgen precursor — anti-aging, neuroprotective, immune-supportive.",
    mechanismSummary: "DHEA-S is the most abundant circulating steroid and serves as a precursor to testosterone and estrogens. It peaks in the mid-20s and declines ~10%/decade. Low DHEA-S is associated with reduced immune function, cognitive decline, osteoporosis, and loss of lean muscle mass.",
    clinicalSignificance: "DHEA-S below 200 µg/dL in men or 100 µg/dL in women indicates adrenal insufficiency or advanced aging-related decline. Associated with increased all-cause mortality in observational studies.",
    interventions: [
      {
        title: "DHEA supplementation 25–50mg daily (under physician supervision)",
        description: "25mg DHEA in the morning with food — start low, recheck labs in 6–8 weeks",
        category: "Supplement",
        mechanism: "Exogenous DHEA is converted peripherally to testosterone and estrogens. Supplementation reliably restores DHEA-S levels and downstream hormones. Dose should be individualized based on response and downstream hormone levels.",
        effectSize: "Restores DHEA-S to optimal range; +10–15% testosterone in men; improved well-being, bone density, and immune function",
        timeToEffect: "4–8 weeks",
        evidenceGrade: "B",
        contraindications: "Can worsen hormone-sensitive cancers (breast, prostate). Requires monitoring of downstream hormones (testosterone, estradiol). Not recommended without physician oversight.",
        citations: [
          {
            authors: "Baulieu EE, et al.",
            year: 2000,
            title: "Dehydroepiandrosterone (DHEA), DHEA sulfate, and aging: Contribution of the DHEAge Study",
            journal: "Proceedings of the National Academy of Sciences",
            pmid: "10899984",
            finding: "DHEA 50mg/day for 1 year improved bone density, skin quality, and libido in men and women ages 60–79."
          }
        ],
        targetBiomarkers: ["dheas", "testosterone"],
      }
    ]
  },

  estradiol: {
    id: "estradiol",
    name: "Estradiol (E2)",
    shortName: "E2",
    unit: "pg/mL",
    category: "hormone",
    optimalMin: 20,
    optimalMax: 40,
    optimalMinFemale: 50,
    optimalMaxFemale: 200,
    description: "Primary estrogen — bone health, cardiovascular protection, cognitive function, mood.",
    mechanismSummary: "In men, estradiol (converted from testosterone via aromatase) is essential for libido, bone density, and cardiovascular health at optimal levels. Excessive estradiol in men (often from obesity-related aromatase activity) suppresses testosterone via negative feedback and causes gynecomastia, water retention, and mood changes.",
    clinicalSignificance: "In men: optimal is 20–40 pg/mL. Above 40 pg/mL suppresses LH and testosterone. In women: highly variable by cycle phase; elevated in estrogen dominance (relative to progesterone), low in menopause.",
    interventions: [
      {
        title: "DIM (Diindolylmethane) 200mg daily — for estrogen excess",
        description: "200mg DIM with dinner (from broccoli/cruciferous vegetables or supplement)",
        category: "Supplement",
        mechanism: "DIM promotes conversion of estrone (E1) and estradiol (E2) to 2-hydroxyestrone — a weaker, less proliferative estrogen metabolite — via CYP1A2 induction. Also reduces aromatase activity, lowering conversion of testosterone to estradiol.",
        effectSize: "−15–25% reduction in estradiol in estrogen-dominant patients",
        timeToEffect: "4–8 weeks",
        evidenceGrade: "B",
        contraindications: "May interact with anticoagulants and CYP1A2-metabolized medications. Not recommended during pregnancy.",
        citations: [
          {
            authors: "Dalessandri KM, et al.",
            year: 2004,
            title: "Pilot study: effect of 3,3'-diindolylmethane supplements on urinary hormone metabolites in postmenopausal women with a history of early-stage breast cancer",
            journal: "Nutrition and Cancer",
            pmid: "15533678",
            finding: "DIM 108mg/day significantly altered estrogen metabolism toward favorable 2-hydroxyestrone pathway."
          }
        ],
        targetBiomarkers: ["estradiol", "testosterone"],
      }
    ]
  },

  progesterone: {
    id: "progesterone",
    name: "Progesterone",
    shortName: "Prog",
    unit: "ng/mL",
    category: "hormone",
    optimalMin: 1,
    optimalMax: 3,
    optimalMinFemale: 5,
    optimalMaxFemale: 25,
    description: "Balancing hormone to estrogen — critical for mood, sleep, and cycle regulation.",
    mechanismSummary: "Progesterone opposes estrogen proliferative effects, promotes GABA receptor activity (calming, sleep-promoting), and regulates thyroid hormone receptor expression. Low progesterone relative to estrogen (estrogen dominance) is common in perimenopause and with high stress.",
    clinicalSignificance: "Low progesterone in women causes irregular cycles, PMS, anxiety, poor sleep, and breast tenderness. In men, very low progesterone can indicate adrenal stress. Relative ratio to estrogen (progesterone:estrogen) is more clinically meaningful than absolute values.",
    interventions: [
      {
        title: "Reduce cortisol to restore progesterone — stress management priority",
        description: "Cortisol and progesterone share the same precursor (pregnenolone) — chronic stress steals from progesterone synthesis",
        category: "Lifestyle",
        mechanism: "Pregnenolone steal: under chronic stress, adrenal glands prioritize cortisol production over progesterone, depleting progesterone. Reducing HPA axis activation through sleep, stress management, and cortisol-lowering interventions restores pregnenolone to progesterone pathway.",
        effectSize: "Variable — proportional to cortisol reduction achieved",
        timeToEffect: "6–12 weeks",
        evidenceGrade: "C",
        citations: [
          {
            authors: "Genazzani AR, et al.",
            year: 1998,
            title: "Neuroactive steroids: relevance to psychiatric disorders",
            journal: "European Journal of Endocrinology",
            pmid: "9849817",
            finding: "Pregnenolone and progesterone are neuroactive steroids depleted under chronic stress, contributing to anxiety and poor sleep."
          }
        ],
        targetBiomarkers: ["progesterone", "cortisol"],
      }
    ]
  },

  igf1: {
    id: "igf1",
    name: "IGF-1",
    shortName: "IGF-1",
    unit: "ng/mL",
    category: "hormone",
    optimalMin: 150,
    optimalMax: 250,
    description: "Insulin-like growth factor — reflects growth hormone axis activity, muscle, and cellular repair.",
    mechanismSummary: "IGF-1 is the primary mediator of growth hormone effects. It drives cellular protein synthesis, muscle hypertrophy, and tissue repair. Age-related decline in GH/IGF-1 contributes significantly to sarcopenia, reduced recovery capacity, and cognitive decline.",
    clinicalSignificance: "IGF-1 below 150 ng/mL indicates growth hormone axis insufficiency — accelerated aging phenotype. Very high IGF-1 (>300 ng/mL) is associated with increased cancer risk. Target 150–250 ng/mL.",
    interventions: [
      {
        title: "High-intensity resistance training + adequate protein (1.6g/kg/day)",
        description: "Progressive resistance training 3–4x/week combined with protein intake of at least 1.6g per kg bodyweight daily",
        category: "Exercise",
        mechanism: "Resistance exercise is the most potent physiological stimulus for GH secretion, directly raising IGF-1 via hepatic production. Adequate protein provides leucine — the primary amino acid trigger for mTOR pathway activation and IGF-1 signaling.",
        effectSize: "+10–20% IGF-1 with consistent training and protein optimization",
        timeToEffect: "8–12 weeks",
        evidenceGrade: "B",
        citations: [
          {
            authors: "Kraemer WJ, et al.",
            year: 1995,
            title: "Hormonal responses to consecutive days of heavy-resistance exercise with or without nutritional supplementation",
            journal: "Journal of Applied Physiology",
            pmid: "8567521",
            finding: "Heavy resistance training consistently elevated IGF-1 and GH acutely and chronically."
          }
        ],
        targetBiomarkers: ["igf1"],
      },
      {
        title: "Optimize sleep — deep sleep drives growth hormone release",
        description: "80% of daily growth hormone (and IGF-1 downstream) is released during slow-wave sleep — the first 2 cycles of the night are most important",
        category: "Sleep",
        mechanism: "GH is secreted in pulsatile bursts during deep (N3) sleep, primarily in the first 2–3 hours after sleep onset. Fragmented sleep, late bedtime, and alcohol suppress slow-wave sleep and blunt GH/IGF-1 production.",
        effectSize: "+10–15% IGF-1 with sleep architecture optimization",
        timeToEffect: "2–4 weeks",
        evidenceGrade: "B",
        citations: [
          {
            authors: "Van Cauter E, et al.",
            year: 2000,
            title: "Age-related changes in slow wave sleep and REM sleep and relationship with growth hormone and cortisol levels in healthy men",
            journal: "JAMA",
            pmid: "10842604",
            finding: "Decline in slow-wave sleep explains most of the age-related reduction in GH secretion."
          }
        ],
        targetBiomarkers: ["igf1"],
      }
    ]
  },

  // ── THYROID ────────────────────────────────────────────────────────────────

  tsh: {
    id: "tsh",
    name: "TSH",
    shortName: "TSH",
    unit: "mIU/L",
    category: "thyroid",
    optimalMin: 0.5,
    optimalMax: 2.0,
    description: "Thyroid stimulating hormone — the master thyroid function signal.",
    mechanismSummary: "TSH follows an inverse log relationship with thyroid output — high TSH means the pituitary is working hard to stimulate an underperforming thyroid. The conventional 'normal' upper range of 4.5 mIU/L captures overtly hypothyroid patients; functional medicine targets 0.5–2.0 for optimal metabolic function.",
    clinicalSignificance: "TSH above 2.0 mIU/L with symptoms (fatigue, cold intolerance, constipation, weight gain, hair loss, cognitive slowing) warrants evaluation of free T4/T3 and thyroid antibodies. Many patients are symptomatic at TSH 2–4 mIU/L but within conventional 'normal'.",
    interventions: [
      {
        title: "Selenium 200mcg daily (selenomethionine form)",
        description: "200mcg selenomethionine with a meal — do not exceed 400mcg/day",
        category: "Supplement",
        mechanism: "Selenium is required for deiodinase enzymes (D1, D2, D3) that convert inactive T4 to active T3. It is also a cofactor for glutathione peroxidase, protecting the thyroid gland from oxidative damage. Deficiency is common and directly impairs thyroid hormone conversion.",
        effectSize: "Improved T4→T3 conversion; reduced thyroid antibodies in autoimmune thyroiditis by 30–50%",
        timeToEffect: "4–8 weeks for thyroid function; 3–6 months for antibody reduction",
        evidenceGrade: "A",
        citations: [
          {
            authors: "Toulis KA, et al.",
            year: 2010,
            title: "Selenium supplementation in the treatment of Hashimoto's thyroiditis: a systematic review and a meta-analysis",
            journal: "Thyroid",
            pmid: "20883174",
            finding: "Selenium supplementation reduced thyroid peroxidase antibody levels by 49% at 12 months in Hashimoto's thyroiditis."
          }
        ],
        contraindications: "Do not exceed 400mcg/day — selenium toxicity (selenosis) above 900mcg. Brazil nuts contain 70–90mcg each.",
        targetBiomarkers: ["tsh", "freeT3", "freeT4"],
      },
      {
        title: "Iodine from food sources (not high-dose supplements)",
        description: "Include iodine-rich foods: seaweed (nori, wakame), seafood, eggs, and dairy — avoid high-dose iodine supplements unless prescribed",
        category: "Nutrition",
        mechanism: "Iodine is required for thyroid hormone synthesis (T4 contains 4 iodine atoms; T3 contains 3). Mild deficiency is common in inland populations. Paradoxically, excessive iodine supplementation can trigger or worsen autoimmune thyroiditis (Wolff-Chaikoff effect).",
        effectSize: "Restores thyroid function in iodine-deficient patients; no effect if iodine replete",
        timeToEffect: "4–8 weeks",
        evidenceGrade: "B",
        citations: [
          {
            authors: "Zimmermann MB & Boelaert K",
            year: 2015,
            title: "Iodine deficiency and thyroid disorders",
            journal: "The Lancet Diabetes & Endocrinology",
            pmid: "25591468",
            finding: "Iodine deficiency is the most common cause of preventable thyroid dysfunction worldwide; correction restores thyroid function."
          }
        ],
        targetBiomarkers: ["tsh"],
      }
    ]
  },

  freeT3: {
    id: "freeT3",
    name: "Free T3",
    shortName: "fT3",
    unit: "pg/mL",
    category: "thyroid",
    optimalMin: 3.2,
    optimalMax: 4.2,
    description: "Active thyroid hormone — regulates metabolism in every cell of the body.",
    mechanismSummary: "T3 is the biologically active thyroid hormone. T4 (produced by the thyroid) must be converted to T3 by deiodinase enzymes in the liver, gut, and peripheral tissues. Low T3 with normal TSH/T4 indicates conversion impairment — often from selenium deficiency, chronic stress, inflammation, or caloric restriction.",
    clinicalSignificance: "Low free T3 with normal TSH is called 'low T3 syndrome' and produces hypothyroid symptoms despite normal standard thyroid tests. This is the pattern most often missed by conventional testing.",
    interventions: [
      {
        title: "Selenium + reduce chronic stress to improve T4→T3 conversion",
        description: "200mcg selenium daily + stress reduction protocol to optimize deiodinase enzyme activity",
        category: "Supplement",
        mechanism: "Deiodinase enzymes are selenoproteins — selenium deficiency directly impairs T4→T3 conversion. Additionally, high cortisol inhibits type 1 deiodinase, diverting T4 toward inactive reverse T3 (rT3) rather than active T3.",
        effectSize: "+10–20% free T3 improvement in deficient patients",
        timeToEffect: "4–8 weeks",
        evidenceGrade: "B",
        citations: [
          {
            authors: "Larsen PR & Berry MJ",
            year: 1995,
            title: "Nutritional and hormonal regulation of thyroid hormone deiodinases",
            journal: "Annual Review of Nutrition",
            pmid: "8527225",
            finding: "Selenium is an essential cofactor for all three iodothyronine deiodinase isozymes."
          }
        ],
        targetBiomarkers: ["freeT3", "tsh"],
      }
    ]
  },

  reverseT3: {
    id: "reverseT3",
    name: "Reverse T3",
    shortName: "rT3",
    unit: "ng/dL",
    category: "thyroid",
    optimalMin: 0,
    optimalMax: 15,
    description: "Inactive T4 metabolite — elevated in chronic stress, illness, and caloric restriction.",
    mechanismSummary: "Reverse T3 (rT3) is produced when T4 is converted by type 3 deiodinase to an inactive metabolite rather than active T3. Elevated rT3 competitively blocks T3 receptors, producing functional hypothyroidism even when T4 and TSH appear normal.",
    clinicalSignificance: "Elevated rT3 is a marker of physiological stress — common in caloric restriction, chronic illness, high cortisol, iron deficiency, and selenium deficiency. The free T3:rT3 ratio (optimal >20) is more informative than rT3 alone.",
    interventions: [
      {
        title: "Reduce HPA axis activation to lower rT3 production",
        description: "Prioritize the cortisol-lowering interventions: adequate caloric intake (do not restrict below 1500 kcal), sleep 8+ hrs, reduce acute stressors, consider ashwagandha",
        category: "Lifestyle",
        mechanism: "High cortisol and inflammatory cytokines upregulate type 3 deiodinase (D3), diverting T4 toward rT3. Reducing physiological and psychological stress lowers D3 activity and restores T3 production.",
        effectSize: "Normalization of rT3 with stress/cortisol reduction over 8–12 weeks",
        timeToEffect: "6–12 weeks",
        evidenceGrade: "C",
        citations: [
          {
            authors: "Peeters RP, et al.",
            year: 2003,
            title: "Reduced activation and increased inactivation of thyroid hormone in tissues of critically ill patients",
            journal: "Journal of Clinical Endocrinology & Metabolism",
            pmid: "12679467",
            finding: "Critical illness and physiological stress consistently elevate rT3 by increasing D3 activity."
          }
        ],
        targetBiomarkers: ["reverseT3", "freeT3", "cortisol"],
      }
    ]
  },

  tpoAntibodies: {
    id: "tpoAntibodies",
    name: "TPO Antibodies",
    shortName: "TPO-Ab",
    unit: "IU/mL",
    category: "thyroid",
    optimalMin: 0,
    optimalMax: 9,
    description: "Thyroid peroxidase antibodies — marker of autoimmune thyroid disease (Hashimoto's).",
    mechanismSummary: "Elevated TPO antibodies indicate autoimmune attack on thyroid peroxidase, the enzyme required for thyroid hormone synthesis. This is the diagnostic marker for Hashimoto's thyroiditis, the most common cause of hypothyroidism. Antibody levels correlate with the severity of autoimmune inflammation.",
    clinicalSignificance: "Elevated TPO antibodies in an asymptomatic patient with normal TSH indicate early Hashimoto's — years before hypothyroidism develops. Reducing antibody burden slows thyroid destruction and may prevent or delay hypothyroidism.",
    interventions: [
      {
        title: "Selenium 200mcg daily — most evidence-supported antibody reduction",
        description: "200mcg selenomethionine daily — the most evidence-backed intervention for TPO antibody reduction",
        category: "Supplement",
        mechanism: "Selenium reduces TPO antibodies via two mechanisms: (1) enhancing thyrocyte selenoprotein production that reduces local oxidative stress, and (2) modulating Th1/Th2 immune balance away from autoimmune activation.",
        effectSize: "−30–50% TPO antibody reduction over 3–6 months",
        timeToEffect: "3–6 months for full antibody effect",
        evidenceGrade: "A",
        citations: [
          {
            authors: "Ventura M, et al.",
            year: 2017,
            title: "Selenium and Thyroid Disease: From Pathophysiology to Treatment",
            journal: "International Journal of Endocrinology",
            pmid: "28255299",
            finding: "Systematic review: selenium supplementation significantly reduced TPO and TG antibody levels in Hashimoto's thyroiditis across multiple RCTs."
          }
        ],
        targetBiomarkers: ["tpoAntibodies", "tsh"],
      },
      {
        title: "Gluten-free diet trial (3–6 months) if NCGS suspected",
        description: "Strict gluten elimination for 3–6 months — track antibody response at 3 months",
        category: "Nutrition",
        mechanism: "Molecular mimicry between gliadin (gluten peptide) and thyroid antigens may drive autoimmune activation in genetically susceptible individuals. Non-celiac gluten sensitivity (NCGS) triggers intestinal permeability and systemic immune activation that can exacerbate thyroid autoimmunity.",
        effectSize: "Variable — most beneficial in patients with concurrent celiac disease or NCGS; significant antibody reduction in responsive patients",
        timeToEffect: "3–6 months for measurable antibody change",
        evidenceGrade: "C",
        citations: [
          {
            authors: "Sategna-Guidetti C, et al.",
            year: 2001,
            title: "Autoimmune thyroid diseases and coeliac disease",
            journal: "European Journal of Gastroenterology & Hepatology",
            pmid: "11246587",
            finding: "1-year gluten-free diet normalized thyroid function and significantly reduced antibodies in celiac patients with autoimmune thyroiditis."
          }
        ],
        targetBiomarkers: ["tpoAntibodies"],
      }
    ]
  },

  // ── VITAMINS & NUTRITION ───────────────────────────────────────────────────

  vitaminD: {
    id: "vitaminD",
    name: "Vitamin D (25-OH)",
    shortName: "Vit D",
    unit: "ng/mL",
    category: "vitamin",
    optimalMin: 50,
    optimalMax: 80,
    description: "Steroid hormone affecting 2,000+ gene pathways — immunity, metabolism, mood, cancer prevention.",
    mechanismSummary: "Vitamin D3 is a precursor to the steroid hormone calcitriol, which regulates the transcription of over 2,000 genes. Deficiency (below 30 ng/mL) is present in 40%+ of US adults and is associated with increased all-cause mortality, autoimmune disease, depression, and metabolic syndrome.",
    clinicalSignificance: "Vitamin D below 30 ng/mL is frank deficiency; 30–50 is insufficiency; 50–80 ng/mL is the functional medicine optimal associated with cancer risk reduction and immune optimization. Above 100 ng/mL may cause toxicity.",
    interventions: [
      {
        title: "Vitamin D3 + K2-MK7 — 4000–6000 IU D3 with 100mcg K2",
        description: "4000–6000 IU D3 with 100mcg K2-MK7 (MenaQ7 form) daily with the fattiest meal of the day — K2 directs calcium to bones rather than arteries",
        category: "Supplement",
        mechanism: "Vitamin D3 (cholecalciferol) is hydroxylated in the liver to 25-OH-D3 (the tested metabolite) and then in the kidney to active calcitriol. K2-MK7 activates matrix Gla protein (MGP) and osteocalcin, which prevent arterial calcification and direct calcium to bone respectively. The two work synergistically.",
        effectSize: "+20–30 ng/mL from deficient baseline over 90 days at 5000 IU",
        timeToEffect: "60–90 days for significant level change (slow tissue saturation)",
        evidenceGrade: "A",
        citations: [
          {
            authors: "Holick MF, et al.",
            year: 2011,
            title: "Evaluation, Treatment, and Prevention of Vitamin D Deficiency: an Endocrine Society Clinical Practice Guideline",
            journal: "Journal of Clinical Endocrinology & Metabolism",
            pmid: "21646368",
            finding: "1500–2000 IU/day maintains levels; deficient patients require 8000 IU/day for 8 weeks to achieve 30 ng/mL."
          }
        ],
        contraindications: "Monitor levels every 90 days — do not exceed 10,000 IU/day without testing. Granulomatous diseases (sarcoidosis) can cause hypercalcemia with supplementation.",
        targetBiomarkers: ["vitaminD"],
      }
    ]
  },

  vitaminB12: {
    id: "vitaminB12",
    name: "Vitamin B12",
    shortName: "B12",
    unit: "pg/mL",
    category: "vitamin",
    optimalMin: 700,
    optimalMax: 1100,
    description: "Essential for myelin synthesis, red blood cell production, and methylation.",
    mechanismSummary: "B12 is a cofactor for methionine synthase (homocysteine → methionine) and methylmalonyl-CoA mutase (energy metabolism). Deficiency causes megaloblastic anemia, peripheral neuropathy, and cognitive decline — often subclinical at levels 200–500 pg/mL despite being within conventional 'normal' range.",
    clinicalSignificance: "Conventional normal range (200–900 pg/mL) is inadequate — functional deficiency symptoms occur at levels considered 'normal'. Functional medicine optimal is 700–1100 pg/mL. At-risk populations: vegans, vegetarians, metformin users, those with gut dysbiosis, and anyone over 50 (reduced intrinsic factor).",
    interventions: [
      {
        title: "Methylcobalamin B12 1000–2000mcg daily (sublingual or oral)",
        description: "1000–2000mcg methylcobalamin under the tongue daily — methylated form bypasses gut absorption issues",
        category: "Supplement",
        mechanism: "Methylcobalamin is the active, methylated form of B12 that directly participates in the methylation cycle. Sublingual absorption bypasses the intrinsic factor-dependent gut absorption mechanism that fails in many people over 50 and those with gut issues.",
        effectSize: "Significant B12 level increase within 4–8 weeks; homocysteine reduction",
        timeToEffect: "4–8 weeks for level change; neurological symptoms may take months",
        evidenceGrade: "A",
        citations: [
          {
            authors: "Eussen SM, et al.",
            year: 2005,
            title: "Oral cyanocobalamin supplementation in older people with vitamin B12 deficiency",
            journal: "Archives of Internal Medicine",
            pmid: "16009874",
            finding: "500mcg oral B12 corrected deficiency in 87.5% of cases within 8 weeks."
          }
        ],
        targetBiomarkers: ["vitaminB12", "homocysteine"],
      }
    ]
  },

  folate: {
    id: "folate",
    name: "Folate (RBC)",
    shortName: "Folate",
    unit: "ng/mL",
    category: "vitamin",
    optimalMin: 10,
    optimalMax: 25,
    description: "B9 — DNA synthesis, methylation, homocysteine conversion, neural tube protection.",
    mechanismSummary: "Folate (as 5-MTHF) donates methyl groups to convert homocysteine to methionine via methionine synthase. It is also required for DNA synthesis and repair. The MTHFR C677T and A1298C polymorphisms (present in ~40% of the population) impair folic acid conversion to the active 5-MTHF form.",
    clinicalSignificance: "Low folate causes elevated homocysteine, megaloblastic anemia, and impaired methylation. MTHFR polymorphism carriers should use methylfolate (5-MTHF) rather than folic acid, which they cannot efficiently convert.",
    interventions: [
      {
        title: "Methylfolate (5-MTHF) 400–1000mcg daily",
        description: "400–1000mcg 5-methyltetrahydrofolate (5-MTHF) daily — use the active form, not folic acid",
        category: "Supplement",
        mechanism: "5-MTHF is the bioactive form of folate that directly participates in the methylation cycle. Standard folic acid requires MTHFR enzyme conversion — impaired in ~40% of people with MTHFR variants. 5-MTHF bypasses this entirely.",
        effectSize: "Significant folate level increase; −25–35% homocysteine reduction",
        timeToEffect: "4–8 weeks",
        evidenceGrade: "A",
        citations: [
          {
            authors: "Prinz-Langenohl R, et al.",
            year: 2009,
            title: "5-methyltetrahydrofolate increases plasma folate more effectively than folic acid in women with the homozygous or wild-type MTHFR 677C→T genotype",
            journal: "British Journal of Pharmacology",
            pmid: "19538261",
            finding: "5-MTHF raised plasma folate more effectively than folic acid in both MTHFR variants and wild-type subjects."
          }
        ],
        targetBiomarkers: ["folate", "homocysteine"],
      }
    ]
  },

  ferritin: {
    id: "ferritin",
    name: "Ferritin",
    shortName: "Ferritin",
    unit: "ng/mL",
    category: "vitamin",
    optimalMin: 50,
    optimalMax: 150,
    optimalMinFemale: 40,
    optimalMaxFemale: 100,
    description: "Iron storage protein — low indicates depletion; high may indicate inflammation or overload.",
    mechanismSummary: "Ferritin is the intracellular iron storage protein. Low ferritin indicates depleted iron stores and impairs oxygen transport (hemoglobin), electron transport chain function, thyroid hormone synthesis, and cognitive performance — often before hemoglobin falls below normal.",
    clinicalSignificance: "Ferritin below 50 ng/mL causes fatigue, hair loss, restless legs, cold intolerance, and cognitive fog even with 'normal' hemoglobin. Ferritin above 200 ng/mL (men) may indicate iron overload or chronic inflammation — high ferritin is NOT a target for iron supplementation.",
    interventions: [
      {
        title: "Heme iron from red meat + vitamin C co-ingestion",
        description: "3–4 servings of red meat weekly (beef, lamb) + 200mg vitamin C with each iron-containing meal",
        category: "Nutrition",
        mechanism: "Heme iron (from animal sources) is absorbed at 15–35% vs 2–8% for non-heme iron. Vitamin C reduces ferric iron (Fe3+) to ferrous iron (Fe2+) and chelates it for absorption — increases non-heme iron absorption 3–4 fold.",
        effectSize: "+5–15 ng/mL ferritin per month with optimized dietary iron",
        timeToEffect: "4–8 weeks for measurable change",
        evidenceGrade: "A",
        citations: [
          {
            authors: "Hallberg L, et al.",
            year: 1989,
            title: "The role of vitamin C in iron absorption",
            journal: "International Journal for Vitamin and Nutrition Research",
            pmid: "2507689",
            finding: "200mg vitamin C with iron-containing meals increases non-heme iron absorption 3-fold."
          }
        ],
        contraindications: "Do not supplement iron without confirmed low ferritin — iron overload (hemochromatosis) causes organ damage.",
        targetBiomarkers: ["ferritin"],
      },
      {
        title: "Iron bisglycinate 25–50mg (if dietary approach insufficient)",
        description: "25mg iron bisglycinate (most tolerated form) on an empty stomach or with vitamin C — away from calcium, coffee, and other supplements",
        category: "Supplement",
        mechanism: "Iron bisglycinate is chelated to glycine molecules, protecting iron from inhibitors in food and reducing GI side effects that limit compliance with other iron forms. Best absorbed on empty stomach but can be taken with food if GI intolerance.",
        effectSize: "+10–20 ng/mL ferritin per month at 25–50mg/day",
        timeToEffect: "4–8 weeks for ferritin; 2–4 weeks for energy symptoms",
        evidenceGrade: "A",
        contraindications: "Never supplement iron without confirmed low ferritin. Avoid in hemochromatosis. Take 2 hours apart from thyroid medications, antacids, and calcium.",
        citations: [
          {
            authors: "Szarfarc SC, et al.",
            year: 2001,
            title: "Relative effectiveness of iron bis-glycinate chelate (Ferrochel) and ferrous sulfate in the control of iron deficiency in pregnant women",
            journal: "Archivos Latinoamericanos de Nutricion",
            pmid: "11795265",
            finding: "Iron bisglycinate produced equivalent hemoglobin increase to ferrous sulfate with fewer GI side effects."
          }
        ],
        targetBiomarkers: ["ferritin"],
      }
    ]
  },

  magnesium: {
    id: "magnesium",
    name: "Magnesium (RBC)",
    shortName: "Mg",
    unit: "mg/dL",
    category: "vitamin",
    optimalMin: 5.2,
    optimalMax: 6.5,
    description: "Cofactor for 300+ enzymes — muscles, nerves, sleep, glucose metabolism, blood pressure.",
    mechanismSummary: "Serum magnesium is a poor marker (the body maintains serum levels at the expense of intracellular stores). RBC magnesium reflects intracellular status. Magnesium deficiency is estimated to affect 50–80% of adults due to soil depletion, processed food consumption, and stress-induced renal losses.",
    clinicalSignificance: "Subclinical magnesium deficiency causes muscle cramps, anxiety, poor sleep, constipation, elevated blood pressure, insulin resistance, and headaches. Nearly impossible to achieve deficiency from diet alone but very common with modern diet patterns.",
    interventions: [
      {
        title: "Magnesium glycinate 300–400mg nightly",
        description: "300–400mg magnesium glycinate 1 hour before bed — improves sleep quality in addition to correcting deficiency",
        category: "Supplement",
        mechanism: "Magnesium glycinate (bound to glycine) has superior absorption and is gentler on the GI tract than magnesium oxide. Glycine itself is inhibitory neurotransmitter that promotes sleep. Together they improve sleep architecture, reduce cortisol, and restore 300+ enzymatic functions.",
        effectSize: "Corrects deficiency within 4–6 weeks; improved sleep onset latency; −3–5 mg/dL fasting glucose",
        timeToEffect: "1–2 weeks for sleep improvement; 4–6 weeks for full repletion",
        evidenceGrade: "A",
        citations: [
          {
            authors: "Abbasi B, et al.",
            year: 2012,
            title: "The effect of magnesium supplementation on primary insomnia in elderly: A double-blind placebo-controlled clinical trial",
            journal: "Journal of Research in Medical Sciences",
            pmid: "23853635",
            finding: "Magnesium 500mg/day for 8 weeks significantly improved sleep time, sleep efficiency, and early morning awakening."
          }
        ],
        targetBiomarkers: ["magnesium", "glucose", "cortisol"],
      }
    ]
  },

  omega3Index: {
    id: "omega3Index",
    name: "Omega-3 Index",
    shortName: "O3I",
    unit: "%",
    category: "vitamin",
    optimalMin: 8,
    optimalMax: 12,
    description: "EPA+DHA as percentage of red blood cell fatty acids — cardiovascular and brain health.",
    mechanismSummary: "The omega-3 index measures EPA and DHA incorporation into red blood cell membranes, reflecting long-term dietary omega-3 status. Low omega-3 index is one of the most modifiable cardiovascular risk factors and is strongly associated with sudden cardiac death, depression, and cognitive decline.",
    clinicalSignificance: "Omega-3 index below 4% is associated with doubled risk of sudden cardiac death. The 8–12% target requires consistent supplementation for most people — typical Western diet achieves 3–5%.",
    interventions: [
      {
        title: "High-quality fish oil 2–4g EPA+DHA daily",
        description: "2–4g combined EPA+DHA from triglyceride-form fish oil with a meal — take with the fattiest meal for best absorption",
        category: "Supplement",
        mechanism: "EPA and DHA incorporate into cell membranes throughout the body, improving membrane fluidity, reducing inflammatory eicosanoid production, and serving as precursors to specialized pro-resolving mediators (resolvins, protectins, maresins).",
        effectSize: "+3–5% omega-3 index increase over 4–6 months at 2g/day; −20–30% triglycerides",
        timeToEffect: "3–6 months for full RBC membrane incorporation",
        evidenceGrade: "A",
        citations: [
          {
            authors: "Harris WS & Von Schacky C",
            year: 2004,
            title: "The Omega-3 Index: a new risk factor for death from coronary heart disease?",
            journal: "Preventive Medicine",
            pmid: "15208005",
            finding: "Omega-3 index <4% is associated with 10-fold higher risk of sudden cardiac death vs >8%."
          }
        ],
        targetBiomarkers: ["omega3Index", "triglycerides", "hscrp"],
      }
    ]
  },

  // ── CBC MARKERS ────────────────────────────────────────────────────────────

  hemoglobin: {
    id: "hemoglobin",
    name: "Hemoglobin",
    shortName: "Hgb",
    unit: "g/dL",
    category: "cbc",
    optimalMin: 13.5,
    optimalMax: 17.5,
    optimalMinFemale: 12.0,
    optimalMaxFemale: 16.0,
    description: "Oxygen-carrying protein in red blood cells.",
    mechanismSummary: "Hemoglobin transports oxygen from lungs to tissues. Low hemoglobin (anemia) reduces aerobic capacity, cognitive function, and thyroid hormone conversion. Most commonly caused by iron deficiency, B12 deficiency, folate deficiency, or chronic inflammation.",
    clinicalSignificance: "Hemoglobin below optimal causes fatigue, exertional intolerance, cognitive slowing, and pallor. Identifying the underlying cause (iron, B12, folate, or chronic disease) determines the intervention.",
    interventions: [
      {
        title: "Identify and address root cause (iron, B12, folate, inflammation)",
        description: "Work up anemia with ferritin, B12, folate, and reticulocyte count before supplementing — treatment depends entirely on cause",
        category: "Nutrition",
        mechanism: "Iron-deficiency anemia: iron supplementation. B12-deficiency anemia: methylcobalamin. Folate-deficiency: methylfolate. Anemia of chronic inflammation: treat underlying inflammatory condition.",
        effectSize: "Hemoglobin restoration to normal within 6–12 weeks with appropriate targeted treatment",
        timeToEffect: "4–12 weeks depending on cause",
        evidenceGrade: "A",
        citations: [
          {
            authors: "Short MW & Domagalski JE",
            year: 2013,
            title: "Iron deficiency anemia: evaluation and management",
            journal: "American Family Physician",
            pmid: "23317073",
            finding: "Iron replacement therapy raises hemoglobin 1–2 g/dL per week when appropriately dosed."
          }
        ],
        targetBiomarkers: ["hemoglobin", "ferritin"],
      }
    ]
  },

  // ── KIDNEY ─────────────────────────────────────────────────────────────────

  creatinine: {
    id: "creatinine",
    name: "Creatinine",
    shortName: "Creat",
    unit: "mg/dL",
    category: "kidney",
    optimalMin: 0.7,
    optimalMax: 1.1,
    optimalMinFemale: 0.6,
    optimalMaxFemale: 0.9,
    description: "Kidney filtration marker — reflects muscle mass and renal function.",
    mechanismSummary: "Creatinine is a waste product of creatine phosphate metabolism in muscle. It is filtered by the kidneys at a constant rate — elevated serum creatinine indicates reduced GFR (kidney filtration). Low creatinine may indicate low muscle mass.",
    clinicalSignificance: "Rising creatinine warrants monitoring of eGFR trend. Isolated elevated creatinine with high muscle mass may be physiological. Consult physician if eGFR is below 60 mL/min/1.73m².",
    interventions: [
      {
        title: "Adequate hydration — 2–3L water daily",
        description: "Drink 2–3 liters of water daily, spread throughout the day; avoid dehydration which concentrates creatinine",
        category: "Lifestyle",
        mechanism: "Dehydration reduces plasma volume and GFR, concentrating creatinine. Adequate hydration maintains GFR and dilutes creatinine. This is especially important with high protein intake or creatine supplementation.",
        effectSize: "Significant creatinine reduction with improved hydration if dehydration is contributing",
        timeToEffect: "Days to weeks",
        evidenceGrade: "B",
        citations: [
          {
            authors: "Perrone RD, et al.",
            year: 1992,
            title: "Serum creatinine as an index of renal function: new insights into old concepts",
            journal: "Clinical Chemistry",
            pmid: "1472554",
            finding: "Serum creatinine is significantly influenced by hydration status and muscle mass in addition to GFR."
          }
        ],
        targetBiomarkers: ["creatinine", "egfr"],
      }
    ]
  },

  egfr: {
    id: "egfr",
    name: "eGFR",
    shortName: "eGFR",
    unit: "mL/min/1.73m²",
    category: "kidney",
    optimalMin: 90,
    optimalMax: 120,
    description: "Estimated glomerular filtration rate — overall kidney function.",
    mechanismSummary: "eGFR estimates the rate at which kidneys filter blood per minute, calculated from creatinine, age, sex, and race. Progressive decline in eGFR is the primary marker of chronic kidney disease (CKD). Below 60 is Stage 3 CKD; below 15 requires dialysis.",
    clinicalSignificance: "eGFR above 90 is normal kidney function. 60–90 requires monitoring. Below 60 warrants nephrologist evaluation. Many supplement and dietary recommendations must be modified with reduced eGFR.",
    interventions: [
      {
        title: "Blood pressure control — the primary modifiable driver of eGFR decline",
        description: "Target blood pressure <130/80 mmHg — hypertension is the leading cause of progressive kidney function decline",
        category: "Lifestyle",
        mechanism: "Elevated blood pressure increases glomerular capillary pressure, causing hyperfiltration injury and progressive nephron loss. ACE inhibitor-equivalent effect can be achieved with DASH diet, weight reduction, sodium restriction, and exercise.",
        effectSize: "Slows eGFR decline by 30–50% with good blood pressure control",
        timeToEffect: "Ongoing — protective effect requires sustained BP control",
        evidenceGrade: "A",
        citations: [
          {
            authors: "Jafar TH, et al.",
            year: 2003,
            title: "Angiotensin-converting enzyme inhibitors and progression of nondiabetic renal disease",
            journal: "Annals of Internal Medicine",
            pmid: "12965983",
            finding: "Meta-analysis: blood pressure reduction is the single most important intervention to slow CKD progression."
          }
        ],
        targetBiomarkers: ["egfr", "creatinine"],
      }
    ]
  },

  // ── LIVER ──────────────────────────────────────────────────────────────────

  alt: {
    id: "alt",
    name: "ALT (SGPT)",
    shortName: "ALT",
    unit: "U/L",
    category: "liver",
    optimalMin: 7,
    optimalMax: 30,
    description: "Alanine aminotransferase — liver cell enzyme; elevated indicates hepatocyte stress.",
    mechanismSummary: "ALT is an intracellular liver enzyme released into bloodstream when hepatocytes are stressed or damaged. The most common causes of mild elevation (30–100 U/L) are NAFLD (non-alcoholic fatty liver disease), alcohol, medications (statins, NSAIDs), and vigorous exercise.",
    clinicalSignificance: "ALT above 30 U/L warrants investigation even if within conventional normal range. Functional medicine target is 7–30 U/L. Mild elevation combined with elevated triglycerides and insulin resistance strongly suggests NAFLD.",
    interventions: [
      {
        title: "Eliminate alcohol and reduce added sugar for 30 days",
        description: "Complete alcohol elimination for at least 30 days; remove all added sugars and fructose — the primary dietary drivers of hepatic fat and ALT elevation",
        category: "Nutrition",
        mechanism: "Alcohol is directly hepatotoxic and drives de novo lipogenesis. Fructose is metabolized exclusively in the liver and is the primary substrate for hepatic triglyceride synthesis (NAFLD). Eliminating both removes the two biggest modifiable sources of hepatocyte stress.",
        effectSize: "−30–50% ALT reduction with 30-day elimination",
        timeToEffect: "2–4 weeks",
        evidenceGrade: "A",
        citations: [
          {
            authors: "Browning JD, et al.",
            year: 2004,
            title: "Prevalence of hepatic steatosis in an urban population in the United States: impact of ethnicity",
            journal: "Hepatology",
            pmid: "15389858",
            finding: "Dietary fructose and saturated fat are the primary nutritional drivers of hepatic steatosis and elevated liver enzymes."
          }
        ],
        targetBiomarkers: ["alt", "ast", "triglycerides"],
      },
      {
        title: "Milk thistle (silymarin) 200mg three times daily",
        description: "Standardized silymarin extract (70–80% silybin) 200mg with each meal",
        category: "Supplement",
        mechanism: "Silymarin from milk thistle has direct hepatoprotective effects: inhibits lipid peroxidation, scavenges reactive oxygen species, inhibits inflammatory cytokines in hepatocytes, and stimulates liver cell regeneration via increased ribosomal protein synthesis.",
        effectSize: "−25–35% ALT reduction over 8–12 weeks",
        timeToEffect: "4–8 weeks",
        evidenceGrade: "A",
        citations: [
          {
            authors: "Zhong S, et al.",
            year: 2017,
            title: "The therapeutic effect of silymarin in the treatment of nonalcoholic fatty liver disease: a meta-analysis",
            journal: "Medicine",
            pmid: "28328817",
            finding: "Meta-analysis of 8 RCTs: silymarin significantly reduced ALT, AST, and liver fat in NAFLD patients."
          }
        ],
        targetBiomarkers: ["alt", "ast"],
      }
    ]
  },

  ast: {
    id: "ast",
    name: "AST (SGOT)",
    shortName: "AST",
    unit: "U/L",
    category: "liver",
    optimalMin: 10,
    optimalMax: 30,
    description: "Aspartate aminotransferase — liver and muscle enzyme.",
    mechanismSummary: "AST is found in liver, heart, muscle, kidney, and brain. It is less specific to liver than ALT. AST:ALT ratio above 2:1 suggests alcoholic liver disease; below 1:1 is typical of NAFLD. Elevated AST after exercise may reflect muscle breakdown, not liver disease.",
    clinicalSignificance: "Isolated AST elevation warrants checking creatine kinase (CK) to distinguish liver from muscle source. Combined ALT+AST elevation is more specific for hepatic disease.",
    interventions: [
      {
        title: "Same interventions as ALT — address root cause first",
        description: "Address alcohol, sugar, and NAFLD risk factors as with ALT — then retest to confirm improvement",
        category: "Nutrition",
        mechanism: "AST and ALT usually rise and fall together in hepatic disease. Addressing the underlying hepatic stressor (alcohol, fructose, medications, metabolic syndrome) reduces both.",
        effectSize: "Proportional to ALT improvement with same interventions",
        timeToEffect: "4–8 weeks",
        evidenceGrade: "A",
        citations: [
          {
            authors: "Chalasani N, et al.",
            year: 2018,
            title: "The diagnosis and management of nonalcoholic fatty liver disease: Practice guidance from the American Association for the Study of Liver Diseases",
            journal: "Hepatology",
            pmid: "28714183",
            finding: "Lifestyle modification (weight loss, exercise, dietary change) is the primary treatment for NAFLD and reduces liver enzymes."
          }
        ],
        targetBiomarkers: ["ast", "alt"],
      }
    ]
  },

  // ── ADDITIONAL METABOLIC ──────────────────────────────────────────────────

  vitaminB6: {
    id: "vitaminB6",
    name: "Vitamin B6 (P5P)",
    shortName: "B6",
    unit: "nmol/L",
    category: "vitamin",
    optimalMin: 30,
    optimalMax: 80,
    description: "Pyridoxal-5-phosphate — neurotransmitter synthesis, homocysteine metabolism, immune function.",
    mechanismSummary: "B6 (as P5P) is a cofactor for over 100 enzymatic reactions including neurotransmitter synthesis (serotonin, dopamine, GABA), homocysteine transsulfuration, and immune regulation. Deficiency is common with oral contraceptive use, alcohol consumption, and inflammatory conditions.",
    clinicalSignificance: "B6 deficiency causes depression, anxiety, peripheral neuropathy, elevated homocysteine, and impaired immune function. Elevated homocysteine with adequate B12 and folate often indicates B6 insufficiency.",
    interventions: [
      {
        title: "Pyridoxal-5-phosphate (P5P) 25–50mg daily",
        description: "25–50mg P5P (activated B6) daily with food — avoid doses above 200mg/day long-term",
        category: "Supplement",
        mechanism: "P5P is the active coenzyme form that requires no hepatic conversion, unlike pyridoxine. It directly serves as cofactor for cystathionine beta-synthase (homocysteine → cystathionine) and aromatic amino acid decarboxylase (dopamine and serotonin synthesis).",
        effectSize: "B6 level restoration within 4–6 weeks; improvement in homocysteine and neurotransmitter-related symptoms",
        timeToEffect: "2–4 weeks",
        evidenceGrade: "B",
        contraindications: "Do not exceed 200mg/day long-term — high-dose pyridoxine (not P5P) can cause sensory neuropathy. Separate from levodopa if used for Parkinson's.",
        citations: [
          {
            authors: "Clayton PT",
            year: 2006,
            title: "B6-responsive disorders: a model of vitamin dependency",
            journal: "Journal of Inherited Metabolic Disease",
            pmid: "16763894",
            finding: "P5P supplementation restores B6-dependent enzyme function in deficient individuals."
          }
        ],
        targetBiomarkers: ["vitaminB6", "homocysteine"],
      }
    ]
  },

  zinc: {
    id: "zinc",
    name: "Zinc (Plasma)",
    shortName: "Zinc",
    unit: "µg/dL",
    category: "vitamin",
    optimalMin: 90,
    optimalMax: 130,
    description: "Essential trace mineral — immune function, testosterone, wound healing, taste/smell.",
    mechanismSummary: "Zinc is a structural component or catalytic cofactor in over 300 enzymes and 1000 transcription factors. It is critical for immune function, testosterone synthesis, DNA repair, and insulin signaling. Plasma zinc is an imperfect marker (affected by inflammation) but is the most practical clinical measure.",
    clinicalSignificance: "Zinc deficiency impairs immune function, reduces testosterone, causes taste/smell loss, delays wound healing, and contributes to ADHD-like symptoms. At-risk groups: athletes (zinc lost in sweat), vegans/vegetarians, older adults, and those with GI disorders.",
    interventions: [
      {
        title: "Zinc bisglycinate 25–40mg daily with dinner",
        description: "25–40mg zinc bisglycinate or picolinate with an evening meal — separate from calcium and iron supplements by 2 hours",
        category: "Supplement",
        mechanism: "Zinc bisglycinate/picolinate are chelated forms with superior absorption (20–30%) vs zinc oxide (10%). Evening dosing minimizes competition with other minerals consumed at breakfast. Pair with 1–2mg copper if supplementing long-term.",
        effectSize: "Plasma zinc normalization within 4–8 weeks; improved immune parameters; +10–25% testosterone in deficient individuals",
        timeToEffect: "4–8 weeks for level restoration",
        evidenceGrade: "A",
        contraindications: "Long-term supplementation >40mg/day depletes copper. Always add 1–2mg copper if using zinc for more than 3 months.",
        citations: [
          {
            authors: "Prasad AS",
            year: 2013,
            title: "Discovery of Human Zinc Deficiency: Its Impact on Human Health and Disease",
            journal: "Advances in Nutrition",
            pmid: "23459198",
            finding: "Zinc supplementation reverses deficiency-related immune dysfunction, testosterone reduction, and growth impairment."
          }
        ],
        targetBiomarkers: ["zinc", "testosterone"],
      }
    ]
  },

};

// ── LOOKUP HELPERS ────────────────────────────────────────────────────────────

export function getBiomarkerMeta(id: string): BiomarkerMeta | undefined {
  return BIOMARKER_LIBRARY[id];
}

export function getInterventionsForBiomarker(id: string): ClinicalIntervention[] {
  return BIOMARKER_LIBRARY[id]?.interventions ?? [];
}

export function getAllBiomarkerIds(): string[] {
  return Object.keys(BIOMARKER_LIBRARY);
}

export function getBiomarkersByCategory(category: BiomarkerCategory): BiomarkerMeta[] {
  return Object.values(BIOMARKER_LIBRARY).filter(b => b.category === category);
}

// Build a flat list of all interventions across all biomarkers, deduplicated by title
export function getAllInterventions(): Array<ClinicalIntervention & { biomarkerIds: string[] }> {
  const map = new Map<string, ClinicalIntervention & { biomarkerIds: string[] }>();

  for (const [biomarkerId, meta] of Object.entries(BIOMARKER_LIBRARY)) {
    for (const intervention of meta.interventions) {
      if (map.has(intervention.title)) {
        map.get(intervention.title)!.biomarkerIds.push(biomarkerId);
      } else {
        map.set(intervention.title, { ...intervention, biomarkerIds: [biomarkerId] });
      }
    }
  }

  return Array.from(map.values());
}

// Format citations for display
export function formatCitation(citation: Citation): string {
  return `${citation.authors} (${citation.year}). ${citation.title}. ${citation.journal}.${citation.pmid ? ` PMID: ${citation.pmid}.` : ""}`;
}
