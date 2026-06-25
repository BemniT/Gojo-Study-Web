import React from "react";

export default function StudentPaymentTab({ selectedStudent, paymentHistory }) {
  const entries = Object.entries(paymentHistory || {});

  return (
    <div
      style={{
        position: "relative",
        background: "var(--surface-panel)",
        border: "1px solid var(--border-soft)",
        borderRadius: 12,
        boxShadow: "var(--shadow-soft)",
        padding: 12,
      }}
    >
      <h3
        style={{
          margin: 0,
          marginBottom: 10,
          color: "var(--text-primary)",
          fontWeight: 800,
          fontSize: 13,
          textAlign: "center",
        }}
      >
        Monthly Payment History
      </h3>

      {!selectedStudent ? (
        <p style={{ textAlign: "center", color: "var(--text-muted)" }}>
          Select a student to view payment history.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {entries.length === 0 ? (
            <p style={{ textAlign: "center", color: "var(--text-muted)" }}>
              Loading payment history...
            </p>
          ) : (
            entries.map(([monthKey, paid]) => {
              const [year, monthShort] = monthKey.split("-");
              return (
                <div
                  key={monthKey}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 12px",
                    borderRadius: 8,
                    background: paid ? "var(--success-soft)" : "var(--danger-soft)",
                    border: paid ? "1px solid var(--success)" : "1px solid var(--danger)",
                  }}
                >
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <div
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: 999,
                        background: paid ? "var(--success)" : "var(--danger)",
                      }}
                    />
                    <div style={{ fontWeight: 700 }}>
                      {monthShort} {year}
                    </div>
                  </div>
                  <div style={{ fontWeight: 800, color: paid ? "var(--success)" : "var(--danger)" }}>
                    {paid ? "Paid" : "Unpaid"}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
