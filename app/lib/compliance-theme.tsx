/**
 * Shared design tokens + brand chrome for the Susie Q's diner food-safety
 * compliance app. Visual language: "Fresh Kitchen / Mint" — off-white kitchen
 * tile surfaces, a deep forest ink header/sidebar, Inter / Inter Tight /
 * IBM Plex Mono typography, mono eyebrow labels, soft shadows, an herb-green
 * brand accent and a warm clay secondary.
 *
 * Logic-free: this file only ships styles + a couple of presentational helpers
 * so the route files can stay focused on data + handlers.
 */
import type { ReactNode } from "react";

/** Injects the Google fonts + CSS custom properties used across compliance pages. */
export function ComplianceThemeStyle() {
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link
        href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Inter+Tight:wght@500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap"
        rel="stylesheet"
      />
      <style>{`
        .cmp {
          --ink:#3B1C26;--ink2:#52262F;--soft:#8A6670;--softer:#B79AA3;
          --paper:#FBF5F1;--surf:#FFFFFF;--line:#EFE0E4;--line2:#F6ECEF;
          --accent:#B85C72;--accent-f:#F8E9ED;
          --clay:#D98BA0;--herb:#C97D90;
          --teal:#B85C72;
          --ok:#3E8E5A;--ok-f:#E9F3EC;--ok-l:#BFE0C9;
          --bad:#A33145;--bad-f:#FBEAEE;--bad-l:#F0C9D2;
          --warn:#B07B12;--warn-f:#FBF4E3;--warn-l:#EFDFA8;
          --mono:'IBM Plex Mono',ui-monospace,monospace;
          --ui:'Inter',system-ui,sans-serif;
          --dp:'Inter Tight','Inter',sans-serif;
          --sh:0 1px 3px rgba(59,28,38,.05),0 4px 16px -8px rgba(59,28,38,.14);
          --shl:0 16px 48px -12px rgba(59,28,38,.26);
          font-family:var(--ui);
          color:var(--ink);
          -webkit-font-smoothing:antialiased;
          font-size:13.5px;
          line-height:1.5;
        }
        .cmp .dp{font-family:var(--dp);letter-spacing:-.015em}
        .cmp .mono{font-family:var(--mono);font-variant-numeric:tabular-nums}
        .cmp .ey{font-family:var(--mono);font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:var(--softer)}

        /* form inputs shared by the compliance pages */
        .cmp .form-input{
          width:100%;background:var(--surf);border:1px solid var(--line);border-radius:8px;
          padding:.5rem .75rem;font-family:var(--ui);font-size:13px;color:var(--ink);
          outline:none;transition:border-color .15s, box-shadow .15s;
        }
        .cmp .form-input::placeholder{color:var(--softer)}
        .cmp .form-input:focus{border-color:var(--accent);box-shadow:0 0 0 3px var(--accent-f)}
        .cmp .form-input option{background:var(--surf);color:var(--ink)}

        .cmp ::selection{background:rgba(184,92,114,.20)}
      `}</style>
    </>
  );
}

/**
 * Susie Q's brand lockup — the `logo.png` wordmark + a mono compliance kicker.
 *
 * The logo is a rosy-pink "SUSIE Q'S" wordmark on a transparent background. It reads
 * well on paper, but the mauve-pink wordmark sits too close in tone to the dark plum
 * header to read on its own — so on dark surfaces we back it with a soft light pill.
 * `tone="dark"` is for the header/sidebar; `tone="light"` for paper.
 */
export function BrandMark({ tone = "light", logoSrc }: { tone?: "dark" | "light"; logoSrc: string }) {
  const kicker = tone === "dark" ? "#E7B7C4" : "var(--accent)";
  return (
    <span className="flex items-center gap-2.5">
      <span
        className="inline-flex h-11 flex-none items-center justify-center rounded-xl"
        style={
          tone === "dark"
            ? { background: "#FBF4EE", padding: "6px 12px" }
            : { background: "transparent", padding: "2px 0" }
        }
      >
        <img
          src={logoSrc}
          alt="Susie Q's"
          style={{ height: "100%", width: "auto", objectFit: "contain" }}
          className="block flex-none"
        />
      </span>
      <span className="hidden flex-col leading-[1.05] sm:flex">
        <span style={{ fontFamily: "var(--mono)", fontSize: 8, letterSpacing: ".18em", textTransform: "uppercase", color: kicker, fontWeight: 500 }}>
          Food-Safety Compliance
        </span>
      </span>
    </span>
  );
}

/** Mono uppercase eyebrow label. */
export function Eyebrow({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <p className={`ey ${className}`}>{children}</p>;
}

type ChipTone = "ok" | "bad" | "warn" | "neu";

const CHIP_STYLES: Record<ChipTone, { bg: string; fg: string; bd: string; dot: string }> = {
  ok: { bg: "var(--ok-f)", fg: "var(--ok)", bd: "var(--ok-l)", dot: "var(--ok)" },
  bad: { bg: "var(--bad-f)", fg: "var(--bad)", bd: "var(--bad-l)", dot: "var(--bad)" },
  warn: { bg: "var(--warn-f)", fg: "var(--warn)", bd: "var(--warn-l)", dot: "var(--warn)" },
  neu: { bg: "var(--line2)", fg: "var(--soft)", bd: "var(--line)", dot: "var(--soft)" },
};

/** Status / state chip with an optional leading dot, matching the reference. */
export function Chip({ tone, dot = true, children }: { tone: ChipTone; dot?: boolean; children: ReactNode }) {
  const s = CHIP_STYLES[tone];
  return (
    <span
      className="mono inline-flex items-center gap-1.5 whitespace-nowrap rounded font-medium"
      style={{ fontSize: 11, padding: "2px 8px", background: s.bg, color: s.fg, border: `1px solid ${s.bd}` }}
    >
      {dot ? <span className="h-[5px] w-[5px] rounded-full" style={{ background: s.dot }} /> : null}
      {children}
    </span>
  );
}

/** Small AI provenance tag. */
export function AiTag({ children, icon }: { children: ReactNode; icon?: ReactNode }) {
  return (
    <span
      className="mono inline-flex items-center gap-1 rounded font-medium uppercase"
      style={{
        fontSize: 9.5,
        letterSpacing: ".06em",
        color: "var(--soft)",
        background: "var(--line2)",
        border: "1px solid var(--line)",
        padding: "2px 6px",
      }}
    >
      {icon}
      {children}
    </span>
  );
}
