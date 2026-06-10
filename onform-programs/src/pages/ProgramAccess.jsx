// src/pages/ProgramAccess.jsx
// Consumer program dashboard — requires authentication.
// Handles magic link landing, session listing, exercise check-off,
// actual sets/reps/weight logging, and assessment scoring.

import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import supabase from "../supabaseClient.js";
import { PageLayout, C, DifficultyBadge, Spinner, ErrorMessage } from "../components/Layout.jsx";

export default function ProgramAccess() {
  const { slug }   = useParams();
  const navigate   = useNavigate();

  const [user,         setUser]         = useState(null);
  const [purchase,     setPurchase]     = useState(null);
  const [program,      setProgram]      = useState(null);
  const [weeks,        setWeeks]        = useState([]);
  const [sessionLogs,  setSessionLogs]  = useState({}); // session_id → log row
  const [exerciseLogs, setExerciseLogs] = useState({}); // session_exercise_id → log row
  const [assessLogs,   setAssessLogs]   = useState({}); // session_assessment_id → log row
  const [activeSession, setActiveSession] = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [authLoading,  setAuthLoading]  = useState(true);
  const [error,        setError]        = useState(null);
  const [savingLog,    setSavingLog]    = useState(null);
  const [toast,        setToast]        = useState("");

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 3000); };

  // ── Auth — handle magic link + session restore ──────────────────────────────
  useEffect(() => {
    const init = async () => {
      // Let Supabase process the magic link token from URL if present
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
      } else {
        // No session — redirect to program detail to purchase/login
        navigate(`/programs/${slug}`, { replace: true });
        return;
      }
      setAuthLoading(false);
    };

    // Listen for auth state changes (magic link sign-in fires this)
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        setUser(session.user);
        setAuthLoading(false);
      }
      if (event === "SIGNED_OUT") {
        navigate(`/programs/${slug}`, { replace: true });
      }
    });

    init();
    return () => listener?.subscription?.unsubscribe?.();
  }, [slug]);

  // ── Load program data once authed ───────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    loadAll();
  }, [user, slug]);

  const loadAll = async () => {
    setLoading(true);

    // Load program
    const { data: prog, error: progErr } = await supabase
      .from("published_programs")
      .select("*")
      .eq("slug", slug)
      .eq("is_published", true)
      .single();

    if (progErr || !prog) { setError("Program not found."); setLoading(false); return; }

    // Verify purchase
    const { data: purch, error: purchErr } = await supabase
      .from("consumer_purchases")
      .select("*")
      .eq("user_id", user.id)
      .eq("program_id", prog.id)
      .maybeSingle();

    if (purchErr || !purch) {
      setError("You don't have access to this program. Please purchase it first.");
      setLoading(false);
      return;
    }

    setPurchase(purch);
    setProgram(prog);

    // Load weeks
    const { data: weekData } = await supabase
      .from("program_weeks")
      .select("*")
      .eq("program_id", prog.id)
      .order("week_number");

    // Load sessions
    const { data: sessionData } = await supabase
      .from("program_sessions")
      .select("*")
      .eq("program_id", prog.id)
      .order("session_number");

    // Load session exercises
    const { data: exData } = await supabase
      .from("session_exercises")
      .select("*, exercises(id, name, body_region, exercise_type, image_url, video_url, default_notes)")
      .in("session_id", (sessionData || []).map(s => s.id));

    // Load session assessments
    const { data: assessData } = await supabase
      .from("session_assessments")
      .select("*")
      .in("session_id", (sessionData || []).map(s => s.id));

    // Load consumer logs
    const { data: sLogs } = await supabase
      .from("consumer_session_logs")
      .select("*")
      .eq("user_id", user.id)
      .eq("program_id", prog.id);

    const { data: eLogs } = await supabase
      .from("consumer_exercise_logs")
      .select("*")
      .eq("user_id", user.id);

    const { data: aLogs } = await supabase
      .from("consumer_assessment_logs")
      .select("*")
      .eq("user_id", user.id)
      .eq("program_id", prog.id);

    // Build lookup maps
    const sessionLogMap  = {};
    (sLogs || []).forEach(l => { sessionLogMap[l.session_id] = l; });
    const exerciseLogMap = {};
    (eLogs || []).forEach(l => { exerciseLogMap[l.session_exercise_id] = l; });
    const assessLogMap   = {};
    (aLogs || []).forEach(l => { assessLogMap[l.session_assessment_id] = l; });

    // Stitch together
    const sessionsWithContent = (sessionData || []).map(s => ({
      ...s,
      session_exercises:   (exData    || []).filter(e => e.session_id === s.id).sort((a,b) => a.sort_order - b.sort_order),
      session_assessments: (assessData|| []).filter(a => a.session_id === s.id).sort((a,b) => a.sort_order - b.sort_order),
    }));

    const weeksWithSessions = (weekData || []).map(w => ({
      ...w,
      sessions: sessionsWithContent.filter(s => s.week_id === w.id),
    }));

    setWeeks(weeksWithSessions);
    setSessionLogs(sessionLogMap);
    setExerciseLogs(exerciseLogMap);
    setAssessLogs(assessLogMap);
    setLoading(false);
  };

  // ── Log an exercise actual ──────────────────────────────────────────────────
  const logExercise = async (session, se, field, value) => {
    const existing = exerciseLogs[se.id];
    const payload  = {
      user_id:            user.id,
      session_exercise_id: se.id,
      session_id:         session.id,
      [field]:            value || null,
      logged_at:          new Date().toISOString(),
    };
    let result;
    if (existing) {
      result = await supabase.from("consumer_exercise_logs").update({ [field]: value || null, logged_at: new Date().toISOString() }).eq("id", existing.id).select().single();
    } else {
      result = await supabase.from("consumer_exercise_logs").insert(payload).select().single();
    }
    if (!result.error) {
      setExerciseLogs(prev => ({ ...prev, [se.id]: result.data }));
    }
  };

  // ── Log an assessment result ────────────────────────────────────────────────
  const logAssessment = async (session, a, field, value) => {
    const existing = assessLogs[a.id];
    const payload  = {
      user_id:               user.id,
      session_assessment_id: a.id,
      session_id:            session.id,
      program_id:            program.id,
      [field]:               value,
      logged_at:             new Date().toISOString(),
    };
    let result;
    if (existing) {
      result = await supabase.from("consumer_assessment_logs").update({ [field]: value, logged_at: new Date().toISOString() }).eq("id", existing.id).select().single();
    } else {
      result = await supabase.from("consumer_assessment_logs").insert(payload).select().single();
    }
    if (!result.error) {
      setAssessLogs(prev => ({ ...prev, [a.id]: result.data }));
    }
  };

  // ── Complete a session ──────────────────────────────────────────────────────
  const completeSession = async (session, rpe) => {
    setSavingLog(session.id);
    const existing = sessionLogs[session.id];
    const payload  = {
      user_id:    user.id,
      session_id: session.id,
      program_id: program.id,
      rpe:        rpe || null,
      completed_at: new Date().toISOString(),
    };
    let result;
    if (existing) {
      result = await supabase.from("consumer_session_logs").update(payload).eq("id", existing.id).select().single();
    } else {
      result = await supabase.from("consumer_session_logs").insert(payload).select().single();
    }
    if (!result.error) {
      setSessionLogs(prev => ({ ...prev, [session.id]: result.data }));
      showToast("Session complete! 🎉");
      setActiveSession(null);
    }
    setSavingLog(null);
  };

  // ── Progress stats ──────────────────────────────────────────────────────────
  const allSessions   = weeks.flatMap(w => w.sessions);
  const completedCount = allSessions.filter(s => sessionLogs[s.id]).length;
  const totalCount     = allSessions.length;
  const progressPct    = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // ── Render ──────────────────────────────────────────────────────────────────
  if (authLoading || (loading && user)) return <PageLayout><Spinner /></PageLayout>;
  if (error) return (
    <PageLayout maxWidth={560}>
      <ErrorMessage message={error} />
      <div style={{ textAlign: "center", marginTop: 24 }}>
        <button onClick={() => navigate(`/programs/${slug}`)} style={{ background: `linear-gradient(135deg, ${C.pink}, ${C.navy})`, border: "none", color: "#fff", padding: "11px 24px", borderRadius: 10, cursor: "pointer", fontSize: 14, fontWeight: 700 }}>
          View Program →
        </button>
      </div>
    </PageLayout>
  );

  return (
    <PageLayout maxWidth={800}>
      {toast && (
        <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", background: C.text, color: "#fff", borderRadius: 12, padding: "12px 24px", fontSize: 14, fontWeight: 600, zIndex: 999, boxShadow: "0 8px 32px rgba(0,0,0,0.2)" }}>{toast}</div>
      )}

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
          <DifficultyBadge difficulty={program.difficulty} />
          {program.target_body_region?.map(r => (
            <span key={r} style={{ fontSize: 11, padding: "3px 10px", borderRadius: 999, background: "rgba(13,122,138,0.08)", color: "#0d7a8a", border: "1px solid rgba(13,122,138,0.2)", fontWeight: 600 }}>{r}</span>
          ))}
        </div>
        <h1 style={{ fontSize: 26, fontWeight: 900, color: C.text, letterSpacing: "-0.5px", marginBottom: 4 }}>{program.title}</h1>
        <div style={{ fontSize: 13, color: C.textMuted }}>
          {program.duration_weeks} weeks · {program.sessions_per_week} sessions/week · {user.email}
          <button onClick={() => supabase.auth.signOut()} style={{ marginLeft: 12, background: "none", border: "none", color: C.pink, fontSize: 13, cursor: "pointer", fontWeight: 600 }}>Sign out</button>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`, padding: "16px 20px", marginBottom: 28 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>Your progress</span>
          <span style={{ fontSize: 13, color: C.textMuted }}>{completedCount} of {totalCount} sessions complete</span>
        </div>
        <div style={{ height: 10, background: C.border, borderRadius: 999, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${progressPct}%`, background: `linear-gradient(90deg, ${C.pink}, ${C.navy})`, borderRadius: 999, transition: "width 0.4s ease" }} />
        </div>
        <div style={{ fontSize: 12, color: C.textMuted, marginTop: 6 }}>{progressPct}% complete</div>
      </div>

      {/* Session list */}
      {activeSession ? (
        <SessionView
          session={activeSession}
          exerciseLogs={exerciseLogs}
          assessLogs={assessLogs}
          sessionLog={sessionLogs[activeSession.id]}
          onLogExercise={logExercise}
          onLogAssessment={logAssessment}
          onComplete={completeSession}
          onBack={() => setActiveSession(null)}
          saving={savingLog === activeSession.id}
        />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {weeks.map(week => (
            <div key={week.id}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 10 }}>
                {week.title || `Week ${week.week_number}`}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {week.sessions.map(session => {
                  const log       = sessionLogs[session.id];
                  const isComplete = !!log;
                  const exCount   = session.session_exercises?.length || 0;
                  const loggedEx  = (session.session_exercises || []).filter(se => exerciseLogs[se.id]).length;
                  return (
                    <div
                      key={session.id}
                      onClick={() => setActiveSession(session)}
                      style={{
                        background: C.surface, borderRadius: 12,
                        border: `1px solid ${isComplete ? "rgba(34,197,94,0.3)" : C.border}`,
                        padding: "14px 18px", cursor: "pointer", display: "flex", alignItems: "center", gap: 14,
                        transition: "box-shadow 0.15s",
                      }}
                      onMouseEnter={e => e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.08)"}
                      onMouseLeave={e => e.currentTarget.style.boxShadow = "none"}
                    >
                      {/* Status icon */}
                      <div style={{ width: 36, height: 36, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, background: isComplete ? "rgba(34,197,94,0.1)" : session.type === "assessment" ? "rgba(245,158,11,0.1)" : C.surfaceHigh, border: `1px solid ${isComplete ? "rgba(34,197,94,0.3)" : session.type === "assessment" ? "rgba(245,158,11,0.25)" : C.border}` }}>
                        {isComplete ? "✓" : session.type === "assessment" ? "📊" : "🏋️"}
                      </div>
                      {/* Info */}
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: C.text, marginBottom: 2 }}>
                          {session.title}
                        </div>
                        <div style={{ fontSize: 12, color: C.textMuted }}>
                          Session {session.session_number}
                          {session.type === "training" && exCount > 0 && ` · ${loggedEx}/${exCount} exercises logged`}
                          {session.type === "assessment" && " · Assessment"}
                          {isComplete && log.rpe && ` · RPE ${log.rpe}/10`}
                        </div>
                      </div>
                      {/* Status badge */}
                      <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 999, background: isComplete ? "rgba(34,197,94,0.1)" : C.surfaceHigh, color: isComplete ? C.green : C.textMuted, border: `1px solid ${isComplete ? "rgba(34,197,94,0.25)" : C.border}`, flexShrink: 0 }}>
                        {isComplete ? "Complete" : "Start →"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </PageLayout>
  );
}

// ── Session view — shown when user opens a session ────────────────────────────
function SessionView({ session, exerciseLogs, assessLogs, sessionLog, onLogExercise, onLogAssessment, onComplete, onBack, saving }) {
  const [rpe,         setRpe]         = useState(sessionLog?.rpe || null);
  const [showComplete, setShowComplete] = useState(false);

  const isTraining   = session.type === "training";
  const isAssessment = session.type === "assessment";
  const loggedExCount = (session.session_exercises || []).filter(se => exerciseLogs[se.id]).length;
  const totalExCount  = session.session_exercises?.length || 0;

  return (
    <div>
      {/* Back + header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <button onClick={onBack} style={{ background: "none", border: `1px solid ${C.border}`, color: C.textMuted, padding: "7px 14px", borderRadius: 8, cursor: "pointer", fontSize: 13 }}>← Back</button>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: C.text, margin: 0 }}>{session.title}</h2>
          <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>Session {session.session_number} · {isAssessment ? "Assessment" : `${loggedExCount}/${totalExCount} exercises logged`}</div>
        </div>
      </div>

      {/* Coach note */}
      {session.notes && (
        <div style={{ background: "rgba(9,6,139,0.04)", border: "1px solid rgba(9,6,139,0.12)", borderRadius: 12, padding: "14px 18px", marginBottom: 20, fontSize: 14, color: C.textSub, lineHeight: 1.6 }}>
          💬 {session.notes}
        </div>
      )}

      {/* Training session */}
      {isTraining && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
          {(session.session_exercises || []).map(se => {
            const log = exerciseLogs[se.id];
            const isLogged = !!log;
            return (
              <div key={se.id} style={{ background: C.surface, borderRadius: 14, border: `1px solid ${isLogged ? "rgba(34,197,94,0.3)" : C.border}`, padding: "16px 18px" }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15, color: C.text, marginBottom: 4 }}>{se.exercises?.name || "Exercise"}</div>
                    {/* Prescription */}
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {se.sets      && <span style={{ fontSize: 12, color: C.textMuted }}>{se.sets} sets</span>}
                      {se.reps      && <span style={{ fontSize: 12, color: C.textMuted }}>× {se.reps} reps</span>}
                      {se.weight    && <span style={{ fontSize: 12, color: C.textMuted }}>@ {se.weight}</span>}
                      {se.rest_seconds && <span style={{ fontSize: 12, color: C.textMuted }}>Rest {se.rest_seconds}s</span>}
                    </div>
                    {se.notes && <div style={{ fontSize: 12, color: C.textMuted, marginTop: 4, fontStyle: "italic" }}>{se.notes}</div>}
                  </div>
                  {isLogged && <span style={{ fontSize: 18, flexShrink: 0 }}>✅</span>}
                </div>

                {/* Actual logging */}
                <div style={{ background: C.surfaceHigh, borderRadius: 10, padding: "12px 14px" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 10 }}>
                    What did you do?
                  </div>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    {[
                      { label: "Sets",   field: "actual_sets",   type: "number", width: 70,  placeholder: se.sets  || "—" },
                      { label: "Reps",   field: "actual_reps",   type: "number", width: 70,  placeholder: se.reps  || "—" },
                      { label: "Weight", field: "actual_weight", type: "text",   width: 90,  placeholder: se.weight || "BW" },
                    ].map(ctrl => (
                      <div key={ctrl.field}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 }}>{ctrl.label}</div>
                        <input
                          type={ctrl.type}
                          defaultValue={log?.[ctrl.field] || ""}
                          onBlur={e => onLogExercise(session, se, ctrl.field, e.target.value)}
                          key={se.id + "_" + ctrl.field + "_" + (log?.id || "new")}
                          placeholder={String(ctrl.placeholder)}
                          style={{ width: ctrl.width, padding: "7px 9px", borderRadius: 8, border: `1px solid ${C.borderMid}`, fontSize: 14, textAlign: "center", outline: "none", fontFamily: "inherit", color: C.text, background: C.surface }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Assessment session */}
      {isAssessment && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 24 }}>
          {(session.session_assessments || []).map(a => {
            const log = assessLogs[a.id];
            return (
              <div key={a.id} style={{ background: C.surface, borderRadius: 14, border: "1px solid rgba(245,158,11,0.25)", padding: "16px 18px" }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: C.text, marginBottom: a.instructions ? 6 : 12 }}>{a.test_name}</div>
                {a.instructions && <p style={{ fontSize: 13, color: C.textMuted, lineHeight: 1.6, marginBottom: 14 }}>{a.instructions}</p>}
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {(a.metric_type === "numeric" || a.metric_type === "both") && (
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 600, color: C.textSub, display: "block", marginBottom: 6 }}>
                        {a.numeric_label || "Enter your result"}
                        {a.numeric_unit && <span style={{ color: C.textMuted, fontWeight: 400 }}> ({a.numeric_unit})</span>}
                      </label>
                      <input
                        type="number"
                        defaultValue={log?.numeric_score || ""}
                        onBlur={e => onLogAssessment(session, a, "numeric_score", parseFloat(e.target.value) || null)}
                        key={a.id + "_numeric_" + (log?.id || "new")}
                        placeholder="0"
                        style={{ width: 120, padding: "9px 12px", borderRadius: 9, border: `1px solid ${C.borderMid}`, fontSize: 16, textAlign: "center", outline: "none", fontFamily: "inherit", color: C.text }}
                      />
                    </div>
                  )}
                  {(a.metric_type === "rating" || a.metric_type === "both") && (
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 600, color: C.textSub, display: "block", marginBottom: 8 }}>
                        {a.rating_label || "Rate 0–10"}
                      </label>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {Array.from({ length: (a.rating_max || 10) - (a.rating_min || 0) + 1 }, (_, i) => i + (a.rating_min || 0)).map(n => (
                          <button
                            key={n}
                            onClick={() => onLogAssessment(session, a, "rating_score", n)}
                            style={{
                              width: 38, height: 38, borderRadius: 9, border: `1px solid ${log?.rating_score === n ? C.pink : C.border}`,
                              background: log?.rating_score === n ? `linear-gradient(135deg, ${C.pink}, ${C.navy})` : C.surfaceHigh,
                              color: log?.rating_score === n ? "#fff" : C.text,
                              fontSize: 13, fontWeight: 700, cursor: "pointer",
                            }}
                          >{n}</button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Complete session */}
      {!showComplete ? (
        <button
          onClick={() => setShowComplete(true)}
          style={{ width: "100%", padding: "14px", borderRadius: 12, border: "none", background: `linear-gradient(135deg, ${C.pink}, ${C.navy})`, color: "#fff", fontSize: 16, fontWeight: 700, cursor: "pointer", boxShadow: `0 4px 18px ${C.pinkGlow}`, marginBottom: 8 }}
        >
          {sessionLog ? "Update Session" : "Complete Session ✓"}
        </button>
      ) : (
        <div style={{ background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`, padding: "20px 22px", marginBottom: 8 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: C.text, marginBottom: 16 }}>How hard was that session?</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
            {[1,2,3,4,5,6,7,8,9,10].map(n => (
              <button key={n} onClick={() => setRpe(n)} style={{ width: 42, height: 42, borderRadius: 10, border: `1px solid ${rpe === n ? C.pink : C.border}`, background: rpe === n ? `linear-gradient(135deg, ${C.pink}, ${C.navy})` : C.surfaceHigh, color: rpe === n ? "#fff" : C.text, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>{n}</button>
            ))}
          </div>
          <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 16 }}>1 = Very easy · 10 = Maximum effort</div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => setShowComplete(false)} style={{ background: C.surfaceHigh, border: `1px solid ${C.border}`, color: C.textMuted, padding: "10px 18px", borderRadius: 9, cursor: "pointer", fontSize: 14, fontWeight: 600 }}>Cancel</button>
            <button
              onClick={() => onComplete(session, rpe)}
              disabled={saving}
              style={{ flex: 1, padding: "10px", borderRadius: 9, border: "none", background: saving ? "rgba(255,61,150,0.4)" : `linear-gradient(135deg, ${C.pink}, ${C.navy})`, color: "#fff", fontSize: 14, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer" }}
            >
              {saving ? "Saving…" : "Mark Complete ✓"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
