import React from "react";

const BACKDROP_STYLE = {
  position: "fixed",
  inset: 0,
  background: "rgba(15,23,42,0.45)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 9999,
  padding: 16,
};

const PANEL_STYLE = {
  width: "100%",
  maxWidth: 760,
  background: "var(--surface-panel)",
  border: "1px solid var(--border-soft)",
  borderRadius: 20,
  boxShadow: "var(--shadow-panel)",
  padding: 18,
  display: "flex",
  flexDirection: "column",
  gap: 16,
};

const SUMMARY_TILE = {
  padding: 12,
  borderRadius: 14,
  border: "1px solid var(--border-soft)",
  background: "var(--surface-muted)",
};

const TILE_LABEL = {
  fontSize: 11,
  fontWeight: 800,
  color: "var(--text-muted)",
  textTransform: "uppercase",
};

const TILE_VALUE = {
  marginTop: 4,
  fontSize: 16,
  fontWeight: 900,
  color: "var(--text-primary)",
};

const INPUT_STYLE = {
  width: "100%",
  border: "1px solid var(--input-border)",
  background: "var(--input-bg)",
  color: "var(--text-primary)",
  borderRadius: 12,
  padding: "10px 12px",
  fontSize: 13,
  fontWeight: 700,
  boxSizing: "border-box",
};

const replaceYearKey = (key) => String(key || "").replace("_", "/");

function ArchiveCountsRow({ preview }) {
  if (!preview) return null;
  const counts = preview.archiveCounts || {};
  return (
    <div
      style={{
        borderRadius: 16,
        border: "1px solid var(--border-soft)",
        background: "linear-gradient(180deg, var(--surface-panel), var(--surface-muted))",
        padding: 14,
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
        gap: 10,
      }}
    >
      {[
        ["Students", counts.students || 0],
        ["Parents", counts.parents || 0],
        ["Class Marks", counts.classMarks || 0],
        ["Lesson Plans", counts.lessonPlans || 0],
      ].map(([label, value]) => (
        <div key={label}>
          <div style={TILE_LABEL}>{label}</div>
          <div style={{ ...TILE_VALUE, fontSize: 20 }}>{value}</div>
        </div>
      ))}
    </div>
  );
}

export default function RolloverConfirmModal({
  open,
  onClose,
  working,
  pendingRollover,
  currentAcademicYear,
  targetRolloverYear,
  pendingCountdownMs,
  formatCountdown,
  formatDelayLabel,
  rolloverDelaySeconds,
  setRolloverDelaySeconds,
  rolloverDelayOptions,
  rolloverModalFeedback,
  expectedRolloverPhrase,
  rolloverPhraseInput,
  setRolloverPhraseInput,
  rolloverPassword,
  setRolloverPassword,
  handleArmRollover,
  handleRollover,
  handleCancelPendingRollover,
  canExecutePendingRollover,
}) {
  if (!open) return null;

  const isArmed = !!pendingRollover?.requestId;

  return (
    <div
      onClick={() => {
        if (!working) onClose();
      }}
      style={BACKDROP_STYLE}
    >
      <div onClick={(e) => e.stopPropagation()} style={PANEL_STYLE}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: "0.08em", color: "var(--accent-strong)", textTransform: "uppercase" }}>
              Protected Academic Rollover
            </div>
            <h3 style={{ margin: "6px 0 0", fontSize: 22, color: "var(--text-primary)", fontWeight: 900 }}>
              {isArmed ? "Countdown Guard Active" : "Arm The Rollover"}
            </h3>
            <p style={{ margin: "8px 0 0", fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6, maxWidth: 620 }}>
              {isArmed
                ? "The rollover is already armed. The registerer must wait the full selected time before execution is permitted. During that waiting time, the request may still be cancelled."
                : "Type the exact phrase, re-enter the registerer password, choose the forced waiting time, then arm the rollover. As soon as it is armed, the countdown starts and execution stays blocked until the entire time finishes."}
            </p>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
          <div style={SUMMARY_TILE}>
            <div style={TILE_LABEL}>From Year</div>
            <div style={TILE_VALUE}>
              {replaceYearKey(pendingRollover?.currentYear || currentAcademicYear || "Not set")}
            </div>
          </div>
          <div style={SUMMARY_TILE}>
            <div style={TILE_LABEL}>Target Year</div>
            <div style={TILE_VALUE}>
              {replaceYearKey(pendingRollover?.targetYear || targetRolloverYear || "Not selected")}
            </div>
          </div>
          <div
            style={{
              ...SUMMARY_TILE,
              background: isArmed
                ? "linear-gradient(145deg, color-mix(in srgb, var(--surface-panel) 84%, #dbeafe 16%), var(--surface-accent))"
                : SUMMARY_TILE.background,
            }}
          >
            <div style={TILE_LABEL}>{isArmed ? "Countdown" : "Selected Delay"}</div>
            <div style={TILE_VALUE}>
              {isArmed
                ? formatCountdown(pendingCountdownMs)
                : formatDelayLabel(rolloverDelaySeconds)}
            </div>
          </div>
        </div>

        {rolloverModalFeedback.text ? (
          <div
            style={{
              borderRadius: 14,
              padding: "11px 13px",
              fontSize: 13,
              fontWeight: 700,
              border: `1px solid ${rolloverModalFeedback.type === "error" ? "var(--danger-border)" : "var(--warning-border)"}`,
              background: rolloverModalFeedback.type === "error" ? "var(--danger-soft)" : "var(--warning-soft)",
              color: rolloverModalFeedback.type === "error" ? "var(--danger)" : "var(--warning)",
            }}
          >
            {rolloverModalFeedback.text}
          </div>
        ) : null}

        <ArchiveCountsRow preview={pendingRollover?.preview} />

        {!isArmed ? (
          <>
            <div
              style={{
                borderRadius: 16,
                border: "1px solid var(--border-soft)",
                background: "linear-gradient(180deg, var(--surface-muted), var(--surface-panel))",
                padding: 14,
                display: "flex",
                flexDirection: "column",
                gap: 14,
              }}
            >
              <div>
                <div style={{ fontSize: 12, fontWeight: 800, color: "var(--text-muted)", marginBottom: 8 }}>
                  Exact Confirmation Phrase
                </div>
                <div
                  style={{
                    borderRadius: 12,
                    border: "1px dashed var(--accent-strong)",
                    background: "var(--surface-panel)",
                    padding: "10px 12px",
                    fontSize: 14,
                    fontWeight: 900,
                    color: "var(--accent-strong)",
                    wordBreak: "break-word",
                  }}
                >
                  {expectedRolloverPhrase || "Select a target year first"}
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: 12 }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: "var(--text-muted)", marginBottom: 8 }}>
                    Type The Phrase
                  </div>
                  <input
                    value={rolloverPhraseInput}
                    onChange={(e) => setRolloverPhraseInput(e.target.value.toUpperCase())}
                    placeholder="ROLL OVER 2026_2027 TO 2027_2028"
                    style={INPUT_STYLE}
                  />
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: "var(--text-muted)", marginBottom: 8 }}>
                    Registerer Password
                  </div>
                  <input
                    type="password"
                    value={rolloverPassword}
                    onChange={(e) => setRolloverPassword(e.target.value)}
                    placeholder="Re-enter password"
                    style={INPUT_STYLE}
                  />
                </div>
              </div>

              <div>
                <div style={{ fontSize: 12, fontWeight: 800, color: "var(--text-muted)", marginBottom: 8 }}>
                  Countdown Window
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
                  {rolloverDelayOptions.map((option) => {
                    const active = rolloverDelaySeconds === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setRolloverDelaySeconds(option.value)}
                        style={{
                          textAlign: "left",
                          border: active ? "1px solid var(--accent-strong)" : "1px solid var(--border-soft)",
                          background: active
                            ? "linear-gradient(180deg, var(--surface-accent), color-mix(in srgb, var(--accent-soft) 45%, var(--surface-panel)))"
                            : "var(--surface-panel)",
                          color: "var(--text-primary)",
                          borderRadius: 14,
                          padding: "11px 12px",
                          cursor: "pointer",
                          boxShadow: active ? "var(--shadow-glow)" : "none",
                        }}
                      >
                        <div style={{ fontSize: 13, fontWeight: 900 }}>{option.label}</div>
                        <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 3 }}>{option.hint}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button
                onClick={onClose}
                disabled={working}
                style={{
                  border: "1px solid var(--border-soft)",
                  background: "var(--surface-panel)",
                  color: "var(--text-secondary)",
                  borderRadius: 10,
                  padding: "9px 13px",
                  fontSize: 12,
                  fontWeight: 800,
                  cursor: working ? "not-allowed" : "pointer",
                  opacity: working ? 0.7 : 1,
                }}
              >
                Close
              </button>
              <button
                onClick={handleArmRollover}
                disabled={working || !targetRolloverYear}
                style={{
                  border: "1px solid var(--accent-strong)",
                  background: "linear-gradient(180deg, var(--accent-strong), var(--accent))",
                  color: "#fff",
                  borderRadius: 10,
                  padding: "9px 13px",
                  fontSize: 12,
                  fontWeight: 800,
                  cursor: working || !targetRolloverYear ? "not-allowed" : "pointer",
                  opacity: working || !targetRolloverYear ? 0.6 : 1,
                }}
              >
                Arm Guarded Rollover
              </button>
            </div>
          </>
        ) : (
          <>
            <div
              style={{
                borderRadius: 16,
                border: "1px solid var(--border-soft)",
                background: "linear-gradient(180deg, var(--surface-muted), var(--surface-panel))",
                padding: 14,
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              <div style={{ ...TILE_LABEL, textTransform: "uppercase" }}>Expected Phrase</div>
              <div
                style={{
                  borderRadius: 12,
                  border: "1px dashed var(--accent-strong)",
                  background: "var(--surface-panel)",
                  padding: "10px 12px",
                  fontSize: 14,
                  fontWeight: 900,
                  color: "var(--accent-strong)",
                }}
              >
                {pendingRollover.expectedPhrase}
              </div>
              <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6 }}>
                {canExecutePendingRollover
                  ? "The timer has completed. Final execution is now available."
                  : "Final execution is force-blocked until the full countdown finishes. If anything looks wrong, cancel this pending rollover before the waiting time ends."}
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, flexWrap: "wrap" }}>
              <button
                onClick={onClose}
                disabled={working}
                style={{
                  border: "1px solid var(--border-soft)",
                  background: "var(--surface-panel)",
                  color: "var(--text-secondary)",
                  borderRadius: 10,
                  padding: "9px 13px",
                  fontSize: 12,
                  fontWeight: 800,
                  cursor: working ? "not-allowed" : "pointer",
                  opacity: working ? 0.7 : 1,
                }}
              >
                Close
              </button>
              <button
                onClick={handleCancelPendingRollover}
                disabled={working}
                style={{
                  border: "1px solid var(--warning)",
                  background: "var(--warning)",
                  color: "#fff",
                  borderRadius: 10,
                  padding: "9px 13px",
                  fontSize: 12,
                  fontWeight: 800,
                  cursor: working ? "not-allowed" : "pointer",
                  opacity: working ? 0.7 : 1,
                }}
              >
                Cancel Pending
              </button>
              <button
                onClick={handleRollover}
                disabled={working || !canExecutePendingRollover}
                style={{
                  border: "1px solid var(--danger)",
                  background:
                    "linear-gradient(180deg, color-mix(in srgb, var(--danger) 88%, #000 12%), var(--danger))",
                  color: "#fff",
                  borderRadius: 10,
                  padding: "9px 13px",
                  fontSize: 12,
                  fontWeight: 800,
                  cursor: working || !canExecutePendingRollover ? "not-allowed" : "pointer",
                  opacity: working || !canExecutePendingRollover ? 0.6 : 1,
                }}
              >
                Final Execute Rollover
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
