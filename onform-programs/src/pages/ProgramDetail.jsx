// src/pages/ProgramDetail.jsx
// Public program detail page — shown before purchase.
// Calls create-checkout-session edge function to start Stripe checkout.

import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import supabase from "../supabaseClient.js";
import { PageLayout, C, DifficultyBadge, Spinner, ErrorMessage } from "../components/Layout.jsx";

export default function ProgramDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();

  const [program,   setProgram]   = useState(null);
  const [weeks,     setWeeks]     = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);
  const [buying,    setBuying]     = useState(false);
  const [buyError,  setBuyError]  = useState(null);
  const [email,     setEmail]     = useState("");
  const [showEmail, setShowEmail] = useState(false);

  useEffect(() => {
    const load = async () => {
      // Load program
      const { data: prog, error: progErr } = await supabase
        .from("published_programs")
        .select("*")
        .eq("slug", slug)
        .eq("is_published", true)
        .single();

      if (progErr || !prog) { setError("Program not found."); setLoading(false); return; }
      setProgram(prog);

      // Load weeks + sessions for the outline (no exercise details — public view)
      const { data: weekData } = await supabase
        .from("program_weeks")
        .select("id, week_number, title, description")
        .eq("program_id", prog.id)
        .order("week_number");

      const { data: sessionData } = await supabase
        .from("program_sessions")
        .select("id, week_id, session_number, title, type")
        .eq("program_id", prog.id)
        .order("session_number");

      const weeksWithSessions = (weekData || []).map(w => ({
        ...w,
        sessions: (sessionData || []).filter(s => s.week_id === w.id),
      }));
      setWeeks(weeksWithSessions);
      setLoading(false);
    };
    load();
  }, [slug]);

  const handleBuy = async () => {
    if (!program?.stripe_price_id) {
      setBuyError("This program is not yet available for purchase. Please check back soon.");
      return;
    }
    if (!showEmail) { setShowEmail(true); return; }
    if (!email.trim() || !email.includes("@")) {
      setBuyError("Please enter a valid email address.");
      return;
    }

    setBuying(true);
    setBuyError(null);

    try {
      const appUrl = import.meta.env.VITE_APP_URL || "https://www.onformphysio.com.au/programs";
      const res = await fetch(`${import.meta.env.VITE_FUNCTIONS_URL}/create-checkout-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "apikey": import.meta.env.VITE_SUPABASE_ANON_KEY },
        body: JSON.stringify({
          purchase_type: "program",
          programSlug:   program.slug,
          customerEmail: email.trim(),
          successUrl:    `${appUrl}/success?program=${program.slug}`,
          cancelUrl:     `${appUrl}/${program.slug}`,
        }),
      });

      const result = await res.json();
      if (!res.ok || !result.url) {
        setBuyError(result.error || "Could not start checkout. Please try again.");
        setBuying(false);
        return;
      }

      // Redirect to Stripe checkout
      window.location.href = result.url;

    } catch (err) {
      setBuyError("Network error. Please check your connection and try again.");
      setBuying(false);
    }
  };

  if (loading) return <PageLayout><Spinner /></PageLayout>;
  if (error)   return <PageLayout><ErrorMessage message={error} /></PageLayout>;

  const totalSessions = (program.duration_weeks || 0) * (program.sessions_per_week || 0);

  return (
    <PageLayout maxWidth={1040}>
      {/* Back */}
      <button onClick={() => navigate("/programs")} style={{ background: "none", border: "none", color: C.textMuted, fontSize: 13, cursor: "pointer", marginBottom: 24, padding: 0, display: "flex", alignItems: "center", gap: 4 }}>
        ← All programs
      </button>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 40, alignItems: "start" }}>

        {/* ── Left column — program info ─────────────────────────────────── */}
        <div>
          {/* Cover */}
          <div style={{ height: 280, borderRadius: 16, overflow: "hidden", background: `linear-gradient(135deg, ${C.navy}, ${C.pink})`, marginBottom: 28, position: "relative" }}>
            {program.cover_image_url ? (
              <img src={program.cover_image_url} alt={program.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 64 }}>🏋️</div>
            )}
          </div>

          {/* Title + meta */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
            <DifficultyBadge difficulty={program.difficulty} />
            {program.target_body_region?.map(r => (
              <span key={r} style={{ fontSize: 11, padding: "3px 10px", borderRadius: 999, background: "rgba(13,122,138,0.08)", color: "#0d7a8a", border: "1px solid rgba(13,122,138,0.2)", fontWeight: 600 }}>{r}</span>
            ))}
          </div>

          <h1 style={{ fontSize: 32, fontWeight: 900, color: C.text, letterSpacing: "-0.8px", marginBottom: 12, lineHeight: 1.2 }}>{program.title}</h1>

          {program.description && (
            <p style={{ fontSize: 16, color: C.textSub, lineHeight: 1.7, marginBottom: 24 }}>{program.description}</p>
          )}

          {/* Stats row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 36 }}>
            {[
              { icon: "📅", label: "Duration",  value: `${program.duration_weeks} weeks` },
              { icon: "🏋️", label: "Sessions",  value: `${totalSessions} total` },
              { icon: "📊", label: "Frequency", value: `${program.sessions_per_week}x per week` },
            ].map(s => (
              <div key={s.label} style={{ background: C.surface, borderRadius: 12, padding: "14px 16px", border: `1px solid ${C.border}`, textAlign: "center" }}>
                <div style={{ fontSize: 22, marginBottom: 4 }}>{s.icon}</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: C.text }}>{s.value}</div>
                <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Program outline */}
          {weeks.length > 0 && (
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: C.text, marginBottom: 16, letterSpacing: "-0.4px" }}>What's included</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {weeks.map(week => (
                  <div key={week.id} style={{ background: C.surface, borderRadius: 12, border: `1px solid ${C.border}`, padding: "14px 18px" }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: C.text, marginBottom: week.sessions.length > 0 ? 8 : 0 }}>
                      {week.title || `Week ${week.week_number}`}
                      {week.description && <span style={{ fontWeight: 400, color: C.textMuted, fontSize: 13 }}> — {week.description}</span>}
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {week.sessions.map(s => (
                        <span key={s.id} style={{
                          fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 999,
                          background: s.type === "assessment" ? "rgba(245,158,11,0.08)" : C.surfaceHigh,
                          color: s.type === "assessment" ? "#b45309" : C.textMuted,
                          border: `1px solid ${s.type === "assessment" ? "rgba(245,158,11,0.2)" : C.border}`,
                        }}>
                          {s.type === "assessment" ? "📊 " : ""}{s.title}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Right column — purchase card ───────────────────────────────── */}
        <div style={{ position: "sticky", top: 76 }}>
          <div style={{ background: C.surface, borderRadius: 20, border: `1px solid ${C.border}`, padding: "28px 24px", boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}>
            <div style={{ fontSize: 36, fontWeight: 900, color: C.text, marginBottom: 4 }}>
              ${parseFloat(program.price_aud).toFixed(2)}
              <span style={{ fontSize: 14, fontWeight: 500, color: C.textMuted, marginLeft: 6 }}>AUD</span>
            </div>
            <div style={{ fontSize: 13, color: C.textMuted, marginBottom: 20 }}>One-time purchase · Lifetime access</div>

            {/* What you get */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
              {[
                `${totalSessions} professionally designed sessions`,
                "Track sets, reps and weights each session",
                "Built-in progress assessments",
                "Access on any device, anytime",
                "Lifetime access — work at your own pace",
              ].map(item => (
                <div key={item} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 13, color: C.textSub, lineHeight: 1.5 }}>
                  <span style={{ color: C.green, fontWeight: 700, flexShrink: 0, marginTop: 1 }}>✓</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>

            {/* Email input (shown after first click) */}
            {showEmail && (
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.6px", display: "block", marginBottom: 6 }}>
                  Your email address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setBuyError(null); }}
                  onKeyDown={e => e.key === "Enter" && handleBuy()}
                  placeholder="you@example.com"
                  autoFocus
                  style={{ width: "100%", padding: "11px 14px", borderRadius: 10, border: `1px solid ${C.borderMid}`, fontSize: 14, outline: "none", boxSizing: "border-box", fontFamily: "inherit", color: C.text }}
                />
                <div style={{ fontSize: 11, color: C.textMuted, marginTop: 5 }}>
                  We'll send your access link here after purchase.
                </div>
              </div>
            )}

            {buyError && (
              <div style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#b91c1c", borderRadius: 10, padding: "10px 14px", fontSize: 13, marginBottom: 14 }}>
                {buyError}
              </div>
            )}

            <button
              onClick={handleBuy}
              disabled={buying}
              style={{
                width: "100%", padding: "14px", borderRadius: 12, border: "none",
                background: buying ? "rgba(255,61,150,0.4)" : `linear-gradient(135deg, ${C.pink}, ${C.navy})`,
                color: "#fff", fontSize: 16, fontWeight: 700, cursor: buying ? "not-allowed" : "pointer",
                boxShadow: buying ? "none" : `0 4px 18px ${C.pinkGlow}`,
                letterSpacing: "-0.2px", marginBottom: 12,
              }}
            >
              {buying ? "Redirecting to checkout…" : showEmail ? "Continue to Payment →" : "Buy Now →"}
            </button>

            <div style={{ fontSize: 11, color: C.textMuted, textAlign: "center", lineHeight: 1.6 }}>
              🔒 Secure checkout via Stripe · GST included
            </div>
          </div>

          {/* Trust signals */}
          <div style={{ marginTop: 16, background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`, padding: "16px 18px" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.text, marginBottom: 10 }}>From On Form Physiotherapy</div>
            <div style={{ fontSize: 12, color: C.textMuted, lineHeight: 1.7 }}>
              Our programs are designed by qualified physiotherapists based in Perth, WA. Each program includes progressive loading, built-in assessments and clear instructions.
            </div>
          </div>
        </div>

      </div>
    </PageLayout>
  );
}
