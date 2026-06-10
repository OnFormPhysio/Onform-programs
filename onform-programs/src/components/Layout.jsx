// src/components/Layout.jsx
// Shared nav, footer, colour tokens and layout wrapper.

import React from "react";

// ── On Form brand tokens ──────────────────────────────────────────────────────
export const C = {
  pink:        "#ff3d96",
  navy:        "#09068b",
  pinkGlow:    "rgba(255,61,150,0.25)",
  text:        "#0f2340",
  textSub:     "#374151",
  textMuted:   "#6b7a8d",
  bg:          "#f3f6fa",
  surface:     "#ffffff",
  surfaceHigh: "#f8fafc",
  border:      "#e5e7eb",
  borderMid:   "#d1d9e0",
  green:       "#16a34a",
  greenDim:    "#f0fdf4",
  amber:       "#d97706",
};

// ── PhysioScript logo mark ────────────────────────────────────────────────────
export function PSLogo({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="ps-c" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ff3d96" />
          <stop offset="100%" stopColor="#09068b" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="10" fill="url(#ps-c)" />
      <rect x="11" y="9" width="3.5" height="22" rx="1.75" fill="white" />
      <path d="M14 9.5 C14 9.5 27 9.5 27 17 C27 24.5 14 24.5 14 24.5" stroke="white" strokeWidth="3.5" strokeLinecap="round" fill="none" />
      <circle cx="29" cy="30" r="2.5" fill="white" fillOpacity="0.7" />
    </svg>
  );
}

// ── Page layout wrapper ───────────────────────────────────────────────────────
export function PageLayout({ children, maxWidth = 960 }) {
  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", flexDirection: "column" }}>
      <Nav />
      <main style={{ flex: 1, maxWidth, margin: "0 auto", width: "100%", padding: "32px 20px 64px" }}>
        {children}
      </main>
      <Footer />
    </div>
  );
}

// ── Nav ───────────────────────────────────────────────────────────────────────
function Nav() {
  return (
    <nav style={{
      background: C.surface,
      borderBottom: `1px solid ${C.border}`,
      padding: "0 24px",
      height: 56,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      position: "sticky",
      top: 0,
      zIndex: 50,
      boxShadow: "0 1px 8px rgba(0,0,0,0.04)",
    }}>
      <a href="/programs" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: `linear-gradient(135deg, ${C.pink}, ${C.navy})`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 16, fontWeight: 900, color: "#fff", flexShrink: 0,
        }}>+</div>
        <div>
          <span style={{ fontWeight: 800, fontSize: 15, color: C.text, letterSpacing: "-0.3px" }}>On Form</span>
          <span style={{ fontWeight: 400, fontSize: 15, color: C.textMuted }}> Programs</span>
        </div>
      </a>
      <a href="https://www.onformphysio.com.au" target="_blank" rel="noopener noreferrer"
        style={{ fontSize: 13, color: C.textMuted, textDecoration: "none", fontWeight: 500 }}>
        onformphysio.com.au ↗
      </a>
    </nav>
  );
}

// ── Footer ────────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer style={{ background: C.surface, borderTop: `1px solid ${C.border}`, padding: "24px 24px", textAlign: "center" }}>
      <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 8 }}>
        © {new Date().getFullYear()} On Form Physiotherapy · Perth, Western Australia
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
        <span style={{ fontSize: 11, color: "#9ca3af" }}>Powered by</span>
        <PSLogo size={14} />
        <span style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600 }}>PhysioScript</span>
      </div>
    </footer>
  );
}

// ── Reusable UI primitives ────────────────────────────────────────────────────
export function Spinner() {
  return (
    <div style={{ display: "flex", justifyContent: "center", padding: "64px 0" }}>
      <div style={{
        width: 36, height: 36, borderRadius: "50%",
        border: `3px solid ${C.border}`,
        borderTop: `3px solid ${C.pink}`,
        animation: "spin 0.8s linear infinite",
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export function ErrorMessage({ message }) {
  return (
    <div style={{
      background: "#fef2f2", border: "1px solid #fecaca", color: "#b91c1c",
      borderRadius: 12, padding: "16px 20px", fontSize: 14, lineHeight: 1.6,
    }}>
      {message || "Something went wrong. Please try again."}
    </div>
  );
}

export function DifficultyBadge({ difficulty }) {
  const colours = {
    beginner:     { bg: "rgba(34,197,94,0.1)",   color: "#15803d", border: "rgba(34,197,94,0.25)" },
    intermediate: { bg: "rgba(245,158,11,0.1)",  color: "#b45309", border: "rgba(245,158,11,0.25)" },
    advanced:     { bg: "rgba(239,68,68,0.1)",   color: "#b91c1c", border: "rgba(239,68,68,0.25)" },
  };
  const style = colours[difficulty] || colours.intermediate;
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 999,
      background: style.bg, color: style.color, border: `1px solid ${style.border}`,
      textTransform: "capitalize",
    }}>
      {difficulty}
    </span>
  );
}
