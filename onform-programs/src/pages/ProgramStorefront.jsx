// src/pages/ProgramStorefront.jsx
// Public storefront — lists all published programs.
// No authentication required.

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import supabase from "../supabaseClient.js";
import { PageLayout, C, DifficultyBadge, Spinner, ErrorMessage } from "../components/Layout.jsx";

export default function ProgramStorefront() {
  const [programs, setPrograms] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from("published_programs")
        .select("id, title, slug, description, duration_weeks, sessions_per_week, difficulty, target_body_region, price_aud, cover_image_url")
        .eq("is_published", true)
        .order("created_at", { ascending: false });

      if (error) { setError(error.message); }
      else { setPrograms(data || []); }
      setLoading(false);
    };
    load();
  }, []);

  return (
    <PageLayout>
      {/* Hero */}
      <div style={{ textAlign: "center", marginBottom: 48, padding: "48px 0 0" }}>
        <div style={{
          display: "inline-block", background: `linear-gradient(135deg, ${C.pink}, ${C.navy})`,
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          fontSize: 13, fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase",
          marginBottom: 12,
        }}>
          On Form Physiotherapy
        </div>
        <h1 style={{ fontSize: 40, fontWeight: 900, color: C.text, letterSpacing: "-1px", marginBottom: 16, lineHeight: 1.15 }}>
          Expert rehab programs,<br />
          <span style={{ background: `linear-gradient(135deg, ${C.pink}, ${C.navy})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            on your schedule
          </span>
        </h1>
        <p style={{ fontSize: 17, color: C.textMuted, maxWidth: 520, margin: "0 auto", lineHeight: 1.7 }}>
          Professionally designed rehabilitation and conditioning programs from our Perth physiotherapy team. Follow along at home, track your progress, and see real results.
        </p>
      </div>

      {/* Program grid */}
      {loading ? <Spinner /> : error ? <ErrorMessage message={error} /> : programs.length === 0 ? (
        <div style={{ textAlign: "center", padding: "64px 0", color: C.textMuted, fontSize: 15 }}>
          No programs available yet — check back soon.
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 24 }}>
          {programs.map(prog => (
            <ProgramCard key={prog.id} program={prog} onClick={() => navigate(`/programs/${prog.slug}`)} />
          ))}
        </div>
      )}
    </PageLayout>
  );
}

function ProgramCard({ program: p, onClick }) {
  const totalSessions = (p.duration_weeks || 0) * (p.sessions_per_week || 0);
  return (
    <div
      onClick={onClick}
      style={{
        background: C.surface, borderRadius: 16, border: `1px solid ${C.border}`,
        overflow: "hidden", cursor: "pointer",
        boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
        transition: "transform 0.15s, box-shadow 0.15s",
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 8px 32px rgba(0,0,0,0.12)"; }}
      onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,0.06)"; }}
    >
      {/* Cover image */}
      <div style={{ height: 180, background: `linear-gradient(135deg, ${C.navy}, ${C.pink})`, overflow: "hidden", position: "relative" }}>
        {p.cover_image_url ? (
          <img src={p.cover_image_url} alt={p.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 48 }}>🏋️</div>
        )}
        <div style={{ position: "absolute", top: 12, right: 12 }}>
          <DifficultyBadge difficulty={p.difficulty} />
        </div>
      </div>

      {/* Card body */}
      <div style={{ padding: "18px 20px 20px" }}>
        <h3 style={{ fontSize: 17, fontWeight: 800, color: C.text, marginBottom: 8, letterSpacing: "-0.3px", lineHeight: 1.3 }}>{p.title}</h3>

        {p.description && (
          <p style={{ fontSize: 13, color: C.textMuted, lineHeight: 1.6, marginBottom: 12,
            display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
            {p.description}
          </p>
        )}

        {/* Meta pills */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
          <MetaPill icon="📅" label={`${p.duration_weeks} weeks`} />
          <MetaPill icon="🏋️" label={`${totalSessions} sessions`} />
          {p.target_body_region?.slice(0, 2).map(r => <MetaPill key={r} label={r} />)}
        </div>

        {/* Price + CTA */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <span style={{ fontSize: 22, fontWeight: 900, color: C.text }}>
              ${parseFloat(p.price_aud).toFixed(2)}
            </span>
            <span style={{ fontSize: 12, color: C.textMuted, marginLeft: 4 }}>AUD</span>
          </div>
          <button style={{
            background: `linear-gradient(135deg, ${C.pink}, ${C.navy})`,
            border: "none", color: "#fff", padding: "9px 20px", borderRadius: 10,
            fontSize: 13, fontWeight: 700, cursor: "pointer",
            boxShadow: `0 4px 14px ${C.pinkGlow}`,
          }}>
            View Program →
          </button>
        </div>
      </div>
    </div>
  );
}

function MetaPill({ icon, label }) {
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 999,
      background: C.surfaceHigh, color: C.textMuted, border: `1px solid ${C.border}`,
      display: "inline-flex", alignItems: "center", gap: 4,
    }}>
      {icon && <span>{icon}</span>}{label}
    </span>
  );
}
