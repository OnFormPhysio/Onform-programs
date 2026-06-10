// src/pages/PurchaseSuccess.jsx
// Shown after successful Stripe checkout.
// No sensitive data — just a confirmation and instruction to check email.

import React from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { PageLayout, C } from "../components/Layout.jsx";

export default function PurchaseSuccess() {
  const [params]  = useSearchParams();
  const navigate  = useNavigate();
  const programSlug = params.get("program");

  return (
    <PageLayout maxWidth={560}>
      <div style={{ textAlign: "center", padding: "48px 0" }}>
        {/* Success icon */}
        <div style={{
          width: 80, height: 80, borderRadius: "50%", margin: "0 auto 24px",
          background: "rgba(34,197,94,0.1)", border: "2px solid rgba(34,197,94,0.3)",
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36,
        }}>
          🎉
        </div>

        <h1 style={{ fontSize: 28, fontWeight: 900, color: C.text, marginBottom: 12, letterSpacing: "-0.6px" }}>
          Purchase complete!
        </h1>
        <p style={{ fontSize: 16, color: C.textMuted, lineHeight: 1.7, marginBottom: 32, maxWidth: 420, margin: "0 auto 32px" }}>
          Thank you for your purchase. We've sent you an email with a link to access your program — check your inbox (and spam folder, just in case).
        </p>

        {/* Steps */}
        <div style={{ background: C.surface, borderRadius: 16, border: `1px solid ${C.border}`, padding: "24px 28px", textAlign: "left", marginBottom: 32 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 16, textTransform: "uppercase", letterSpacing: "0.8px" }}>
            What happens next
          </div>
          {[
            { step: "1", text: "Check your email for your access link" },
            { step: "2", text: "Click the link to set up your account password" },
            { step: "3", text: "Start your program — work at your own pace" },
          ].map(({ step, text }) => (
            <div key={step} style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 14 }}>
              <div style={{
                width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                background: `linear-gradient(135deg, ${C.pink}, ${C.navy})`,
                color: "#fff", fontSize: 13, fontWeight: 800,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>{step}</div>
              <span style={{ fontSize: 14, color: C.textSub, lineHeight: 1.6, paddingTop: 4 }}>{text}</span>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <button
            onClick={() => navigate("/programs")}
            style={{ background: C.surfaceHigh, border: `1px solid ${C.border}`, color: C.textSub, padding: "10px 22px", borderRadius: 10, cursor: "pointer", fontSize: 14, fontWeight: 600 }}
          >
            Browse more programs
          </button>
          <a
            href="mailto:contact@onformphysio.com.au"
            style={{ background: `linear-gradient(135deg, ${C.pink}, ${C.navy})`, color: "#fff", padding: "10px 22px", borderRadius: 10, fontSize: 14, fontWeight: 700, textDecoration: "none", boxShadow: `0 4px 14px ${C.pinkGlow}` }}
          >
            Contact us
          </a>
        </div>

        <p style={{ fontSize: 12, color: C.textMuted, marginTop: 32 }}>
          Didn't receive an email? Contact us at{" "}
          <a href="mailto:contact@onformphysio.com.au" style={{ color: C.pink }}>contact@onformphysio.com.au</a>
        </p>
      </div>
    </PageLayout>
  );
}
