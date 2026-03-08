"use client";

import { type ReactNode } from "react";

// ── Panel ──────────────────────────────────────────────
export function Panel({
  title,
  tag,
  children,
}: {
  title: string;
  tag?: string;
  children: ReactNode;
}) {
  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 6,
        overflow: "hidden",
        animation: "fadeIn 0.3s ease",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 16px",
          borderBottom: "1px solid var(--border)",
          background: "var(--surface2)",
        }}
      >
        <span
          style={{
            fontFamily: "var(--mono)",
            fontSize: 11,
            fontWeight: 600,
            color: "var(--text-muted)",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
          }}
        >
          {title}
        </span>
        {tag && (
          <span
            style={{
              fontFamily: "var(--mono)",
              fontSize: 10,
              color: "var(--primary)",
              background: "var(--primary-dim)",
              padding: "2px 8px",
              borderRadius: 3,
              letterSpacing: "0.08em",
            }}
          >
            {tag}
          </span>
        )}
      </div>
      <div style={{ padding: 16 }}>{children}</div>
    </div>
  );
}

// ── Field ──────────────────────────────────────────────
export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label
        style={{
          display: "block",
          fontFamily: "var(--mono)",
          fontSize: 11,
          color: "var(--text-muted)",
          marginBottom: 5,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
        }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}

// ── Btn ────────────────────────────────────────────────
export function Btn({
  children,
  onClick,
  disabled,
  variant = "primary",
  full,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "primary" | "danger" | "ghost" | "success";
  full?: boolean;
}) {
  const colors = {
    primary: {
      bg: "var(--primary-dim)",
      border: "var(--primary)",
      color: "var(--primary)",
      hover: "rgba(0,212,255,0.2)",
    },
    danger: {
      bg: "var(--red-dim)",
      border: "var(--red)",
      color: "var(--red)",
      hover: "rgba(255,69,102,0.2)",
    },
    ghost: {
      bg: "transparent",
      border: "var(--border)",
      color: "var(--text-muted)",
      hover: "var(--surface2)",
    },
    success: {
      bg: "var(--green-dim)",
      border: "var(--green)",
      color: "var(--green)",
      hover: "rgba(0,255,148,0.2)",
    },
  }[variant];

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: colors.bg,
        border: `1px solid ${colors.border}`,
        color: disabled ? "var(--text-dim)" : colors.color,
        padding: "8px 16px",
        width: full ? "100%" : undefined,
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
        borderColor: disabled ? "var(--border)" : colors.border,
      }}
      onMouseEnter={(e) => {
        if (!disabled) e.currentTarget.style.background = colors.hover;
      }}
      onMouseLeave={(e) => {
        if (!disabled) e.currentTarget.style.background = colors.bg;
      }}
    >
      {children}
    </button>
  );
}

// ── TxResult ───────────────────────────────────────────
export function TxResult({
  sig,
  network,
  error,
}: {
  sig?: string;
  network?: string;
  error?: string;
}) {
  if (error)
    return (
      <div
        style={{
          marginTop: 12,
          padding: "10px 12px",
          background: "var(--red-dim)",
          border: "1px solid var(--red)",
          borderRadius: 4,
          fontFamily: "var(--mono)",
          fontSize: 11,
          color: "var(--red)",
          wordBreak: "break-all",
        }}
      >
        <span style={{ opacity: 0.6 }}>ERR </span>
        {error}
      </div>
    );
  if (!sig) return null;
  const explorerBase =
    network === "devnet"
      ? `https://explorer.solana.com/tx/${sig}?cluster=devnet`
      : `https://explorer.solana.com/tx/${sig}?cluster=custom&customUrl=http://localhost:8899`;
  return (
    <div
      style={{
        marginTop: 12,
        padding: "10px 12px",
        background: "var(--green-dim)",
        border: "1px solid var(--green)",
        borderRadius: 4,
        fontFamily: "var(--mono)",
        fontSize: 11,
      }}
    >
      <div style={{ color: "var(--green)", marginBottom: 4 }}>✓ confirmed</div>
      <a
        href={explorerBase}
        target="_blank"
        rel="noreferrer"
        style={{ color: "var(--text-muted)", wordBreak: "break-all" }}
      >
        {sig.slice(0, 32)}…{sig.slice(-8)}
      </a>
    </div>
  );
}

// ── Spinner ────────────────────────────────────────────
export function Spinner() {
  return (
    <span
      style={{
        display: "inline-block",
        width: 12,
        height: 12,
        border: "2px solid var(--border)",
        borderTopColor: "var(--primary)",
        borderRadius: "50%",
        animation: "spin 0.7s linear infinite",
        marginRight: 8,
      }}
    />
  );
}

// ── Tag ────────────────────────────────────────────────
export function Tag({
  children,
  color = "primary",
}: {
  children: ReactNode;
  color?: "primary" | "green" | "yellow" | "red";
}) {
  const c = {
    primary: ["var(--primary-dim)", "var(--primary)"],
    green: ["var(--green-dim)", "var(--green)"],
    yellow: ["var(--yellow-dim)", "var(--yellow)"],
    red: ["var(--red-dim)", "var(--red)"],
  }[color];
  return (
    <span
      style={{
        fontFamily: "var(--mono)",
        fontSize: 10,
        background: c[0],
        color: c[1],
        padding: "2px 7px",
        borderRadius: 3,
        letterSpacing: "0.06em",
      }}
    >
      {children}
    </span>
  );
}
