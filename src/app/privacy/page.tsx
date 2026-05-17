export const metadata = {
  title: "Privacy Policy — BioPrecision",
  description: "Privacy Policy for the BioPrecision health intelligence platform.",
};

export default function PrivacyPolicy() {
  const updated = "May 16, 2026";

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "48px 24px", fontFamily: "system-ui, sans-serif", color: "#1f2937", lineHeight: 1.7 }}>
      <div style={{ marginBottom: 40 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "#C96A2B", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
              <path d="M2 12h3l3-8 3 16 3-10 3 5 2-3h3" />
            </svg>
          </div>
          <span style={{ fontWeight: 700, fontSize: 18, color: "#111827" }}>BioPrecision</span>
        </div>
        <h1 style={{ fontSize: 32, fontWeight: 800, color: "#111827", margin: "0 0 8px" }}>Privacy Policy</h1>
        <p style={{ color: "#6b7280", fontSize: 14, margin: 0 }}>Last updated: {updated}</p>
      </div>

      <Section title="Overview">
        BioPrecision ("we," "our," or "us") operates a health intelligence platform that converts laboratory biomarker results into personalised daily actions. We take your privacy and the security of your health data seriously. This Privacy Policy explains what information we collect, how we use it, and your rights regarding that information.
      </Section>

      <Section title="Information We Collect">
        <Strong>Health and Lab Data</Strong>
        <p>When you use BioPrecision, you may provide laboratory test results (via PDF or CSV upload), including biomarker values such as cholesterol, glucose, hormones, vitamins, and inflammatory markers. This data is used solely to generate your personalised health recommendations.</p>

        <Strong>Personal Profile Information</Strong>
        <p>We collect information you provide during onboarding, including your name, age, biological sex, height, weight, health goals, symptoms, sleep habits, exercise habits, dietary preferences, stress levels, and alcohol consumption. This information is used to personalise your recommendations and is never sold to third parties.</p>

        <Strong>Device and Usage Data</Strong>
        <p>We collect an anonymous device identifier to associate your data across app sessions. We do not collect your name, email, or phone number unless you provide them during registration.</p>

        <Strong>Wearable Data (Optional)</Strong>
        <p>If you choose to connect a wearable device (Oura Ring, WHOOP), we collect activity, sleep, and heart rate variability data via OAuth2. You can disconnect your wearable at any time from your profile settings.</p>

        <Strong>Communications</Strong>
        <p>If you use the in-app messaging feature, messages between you and your care team are stored securely and are only accessible to you and your assigned practitioners.</p>
      </Section>

      <Section title="How We Use Your Information">
        <ul style={{ paddingLeft: 20, margin: "8px 0" }}>
          <li>To generate personalised daily health actions based on your biomarker results</li>
          <li>To provide AI-powered health coaching responses informed by your lab data</li>
          <li>To track your progress over time through daily check-ins and longitudinal biomarker trends</li>
          <li>To allow your assigned practitioners or clinicians to monitor your adherence and progress</li>
          <li>To send push notifications for daily action reminders and weekly progress summaries</li>
          <li>To generate clinical reports for your care team</li>
        </ul>
        <p>We do not use your health data for advertising, do not sell it to third parties, and do not share it with insurance companies or employers.</p>
      </Section>

      <Section title="AI and Third-Party Processing">
        <p>BioPrecision uses Anthropic's Claude AI to process your lab data and generate health recommendations. Your data is sent to Anthropic's API for this purpose and is subject to <a href="https://www.anthropic.com/privacy" style={{ color: "#C96A2B" }}>Anthropic's Privacy Policy</a>. Anthropic does not use your data to train AI models.</p>
        <p>We use Supabase to securely store your health data. Supabase stores data in the United States and is SOC 2 Type II certified.</p>
      </Section>

      <Section title="Data Sharing">
        <Strong>Your Care Team</Strong>
        <p>If you are enrolled through a clinic, your assigned practitioners and clinicians can view your lab results, biomarker trends, action completion rates, and check-in data for the purpose of providing care.</p>

        <Strong>No Sale of Data</Strong>
        <p>We do not sell, rent, or trade your personal health information to any third party under any circumstances.</p>

        <Strong>Legal Requirements</Strong>
        <p>We may disclose your information if required by law, court order, or government regulation.</p>
      </Section>

      <Section title="Data Security">
        Your health data is encrypted in transit (TLS 1.2+) and at rest. We use row-level access controls to ensure that only authorised parties can access your records. Anonymous device identifiers are used in place of email addresses or names where possible.
      </Section>

      <Section title="Data Retention">
        We retain your health data for as long as your account is active or as needed to provide you with the service. You may request deletion of your account and all associated data at any time by contacting us at the address below. Deletion requests are processed within 30 days.
      </Section>

      <Section title="Push Notifications">
        BioPrecision sends push notifications for daily action reminders (8:00 AM), evening nudges (7:00 PM), and weekly progress summaries (Sunday mornings). You can disable notifications at any time in your device's Settings app.
      </Section>

      <Section title="Children's Privacy">
        BioPrecision is not intended for use by individuals under the age of 18. We do not knowingly collect personal information from children. If you believe a child has provided us with personal information, please contact us and we will delete it promptly.
      </Section>

      <Section title="Your Rights">
        Depending on your location, you may have the right to:
        <ul style={{ paddingLeft: 20, margin: "8px 0" }}>
          <li>Access the personal data we hold about you</li>
          <li>Request correction of inaccurate data</li>
          <li>Request deletion of your data</li>
          <li>Object to or restrict certain processing of your data</li>
          <li>Request a portable copy of your data</li>
        </ul>
        To exercise any of these rights, contact us at <a href="mailto:privacy@bioprecision.org" style={{ color: "#C96A2B" }}>privacy@bioprecision.org</a>.
      </Section>

      <Section title="Medical Disclaimer">
        BioPrecision is a health intelligence and accountability platform. It is not a medical device and does not provide medical diagnoses, prescriptions, or treatment plans. All recommendations are for informational and educational purposes only. Always consult a qualified healthcare provider before making changes to your health regimen.
      </Section>

      <Section title="Changes to This Policy">
        We may update this Privacy Policy from time to time. We will notify you of significant changes via in-app notification. Continued use of the app after changes constitutes acceptance of the updated policy.
      </Section>

      <Section title="Contact Us">
        <p>For privacy-related questions or requests:</p>
        <p style={{ margin: 0 }}>
          <strong>BioPrecision</strong><br />
          Email: <a href="mailto:privacy@bioprecision.org" style={{ color: "#C96A2B" }}>privacy@bioprecision.org</a><br />
          Website: <a href="https://www.bioprecision.org" style={{ color: "#C96A2B" }}>www.bioprecision.org</a>
        </p>
      </Section>

      <div style={{ marginTop: 48, paddingTop: 24, borderTop: "1px solid #e5e7eb", color: "#9ca3af", fontSize: 13 }}>
        © {new Date().getFullYear()} BioPrecision. All rights reserved.
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 32 }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: "#111827", marginBottom: 12, marginTop: 0 }}>{title}</h2>
      <div style={{ fontSize: 15, color: "#374151" }}>{children}</div>
    </div>
  );
}

function Strong({ children }: { children: React.ReactNode }) {
  return <p style={{ fontWeight: 600, color: "#111827", margin: "16px 0 4px" }}>{children}</p>;
}
