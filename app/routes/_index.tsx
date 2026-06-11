import { useConfigurables } from "~/modules/configurables";

export default function IndexPage() {
  const { config, loading } = useConfigurables();

  if (loading) {
    return (
      <div
        style={{ backgroundColor: "#C0395A" }}
        className="min-h-screen flex items-center justify-center"
      >
        <span className="text-white/60 text-sm tracking-widest uppercase">
          Loading…
        </span>
      </div>
    );
  }

  const appName = config?.appName || "SusieQ Kitchen";
  const tagline = config?.heroTagline || "Home-Cooked Love, Delivered.";
  const subtext =
    config?.heroSubtext ||
    "Fresh, soulful meals made with care — every order, every time.";
  const ctaLabel = config?.ctaLabel || "Get in Touch";
  const ctaHref = config?.ctaHref || "mailto:hello@susieqkitchen.com";
  const footerLine = config?.footerLine || "hello@susieqkitchen.com · @susieqkitchen";
  const heroImage = config?.heroImage || "";
  const logoUrl = config?.logoUrl || "";
  const primary = config?.brandColor?.primary || "#C0395A";
  const secondary = config?.brandColor?.secondary || "#B02040";
  const accent = config?.brandColor?.accent || "#F2A0B0";

  return (
    <main
      className="relative min-h-screen flex flex-col overflow-hidden"
      style={{ backgroundColor: secondary }}
    >
      {/* Background hero image with deep overlay */}
      {heroImage && (
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat z-0"
          style={{ backgroundImage: `url(${heroImage})` }}
          aria-hidden="true"
        />
      )}
      {/* Color overlay — always present, deeper when image exists */}
      <div
        className="absolute inset-0 z-10"
        style={{
          background: heroImage
            ? `linear-gradient(135deg, ${secondary}ee 0%, ${primary}cc 100%)`
            : `linear-gradient(135deg, ${secondary} 0%, ${primary} 100%)`,
        }}
        aria-hidden="true"
      />

      {/* Wordmark-only header */}
      <header className="relative z-20 flex items-center px-6 sm:px-10 pt-8">
        {logoUrl && !logoUrl.startsWith("FILL_") ? (
          <img
            src={logoUrl}
            alt={`${appName} logo`}
            className="h-9 w-auto object-contain"
          />
        ) : (
          <span
            className="text-sm font-semibold tracking-[0.18em] uppercase"
            style={{ color: accent }}
          >
            {appName}
          </span>
        )}
      </header>

      {/* Hero — centred content */}
      <section className="relative z-20 flex-1 flex flex-col items-center justify-center text-center px-6 sm:px-10 py-20">
        {/* Decorative blush pill */}
        <div
          className="mb-8 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold tracking-widest uppercase"
          style={{ backgroundColor: `${accent}22`, color: accent }}
        >
          <span
            className="inline-block h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: accent }}
          />
          Est. with Love
        </div>

        {/* Brand name */}
        <h1
          className="text-5xl sm:text-7xl lg:text-8xl font-extrabold leading-none tracking-tight text-white"
          style={{ fontFamily: "'Plus Jakarta Sans', 'Poppins', sans-serif" }}
        >
          {appName}
        </h1>

        {/* Tagline */}
        <p
          className="mt-5 text-xl sm:text-2xl font-medium leading-snug max-w-xl"
          style={{ color: accent }}
        >
          {tagline}
        </p>

        {/* Subtext */}
        <p className="mt-4 text-sm sm:text-base leading-relaxed max-w-sm text-white/70">
          {subtext}
        </p>

        {/* CTA */}
        <a
          href={ctaHref}
          className="mt-10 inline-block rounded-none px-10 py-4 text-sm font-semibold tracking-widest uppercase transition-all duration-200 hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
          style={{
            backgroundColor: "white",
            color: primary,
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLAnchorElement).style.backgroundColor = accent;
            (e.currentTarget as HTMLAnchorElement).style.color = secondary;
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLAnchorElement).style.backgroundColor = "white";
            (e.currentTarget as HTMLAnchorElement).style.color = primary;
          }}
        >
          {ctaLabel}
        </a>
      </section>

      {/* Footer line */}
      <footer className="relative z-20 flex items-center justify-center px-6 pb-8">
        <p
          className="text-xs tracking-widest text-center"
          style={{ color: `${accent}99` }}
        >
          {footerLine}
        </p>
      </footer>
    </main>
  );
}
