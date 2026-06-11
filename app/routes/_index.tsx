import { Link } from "react-router";
import { ArrowRight, BadgeCheck, Sparkles, SprayCan, UtensilsCrossed } from "lucide-react";
import logoUrl from "../../logo.png?url";

const features = [
  {
    icon: BadgeCheck,
    title: "Food-Safety Certification",
    desc: "Food handler cards, ServSafe, HACCP — uploaded, verified, scored",
  },
  {
    icon: SprayCan,
    title: "Hygiene & Sanitation",
    desc: "Deep-clean SOPs, sanitation logs and cleaning sign-offs",
  },
  {
    icon: UtensilsCrossed,
    title: "Allergy & Dietary Awareness",
    desc: "Allergen training and front-of-house dietary acknowledgements",
  },
  {
    icon: Sparkles,
    title: "SOP Sign-offs",
    desc: "Signed standard operating procedures with quiz assessments",
  },
];

export default function IndexPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#FBF5F1] text-[#3B1C26]">
      {/* tile texture */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.5]"
        style={{
          backgroundImage:
            "linear-gradient(#B85C72 1px, transparent 1px), linear-gradient(90deg, #B85C72 1px, transparent 1px)",
          backgroundSize: "44px 44px",
          maskImage: "radial-gradient(120% 80% at 50% 0%, #000 0%, transparent 70%)",
          WebkitMaskImage: "radial-gradient(120% 80% at 50% 0%, #000 0%, transparent 70%)",
          opacity: 0.05,
        }}
      />
      {/* soft glows */}
      <div className="pointer-events-none absolute left-1/4 top-[-80px] h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-[#B85C72]/10 blur-[120px]" />
      <div className="pointer-events-none absolute bottom-0 right-1/4 h-[380px] w-[380px] translate-x-1/2 rounded-full bg-[#D98BA0]/10 blur-[110px]" />

      <nav className="relative mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <Link to="/" className="flex items-center gap-3">
          <img src={logoUrl} alt="Susie Q's" className="block h-14 w-auto object-contain" />
          <span className="hidden flex-col leading-[1.05] sm:flex">
            <span className="font-mono text-[8px] font-medium uppercase tracking-[0.18em] text-[#B85C72]">
              Food-Safety Compliance
            </span>
          </span>
        </Link>
        <Link
          to="/login"
          className="flex items-center gap-2 rounded-full border border-[#3B1C26]/12 bg-white px-5 py-2 text-sm font-bold text-[#3B1C26] shadow-sm transition hover:border-[#B85C72]/40 hover:bg-[#F8E9ED]"
        >
          Login <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </nav>

      <section className="relative mx-auto grid max-w-7xl gap-16 px-6 pb-24 pt-16 lg:grid-cols-[1fr_1fr] lg:items-center">
        <div className="space-y-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#B85C72]/20 bg-[#F8E9ED] px-4 py-1.5">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#B85C72]" />
            <span className="text-xs font-black uppercase tracking-[0.2em] text-[#B85C72]">
              Kitchen Compliance Command Center
            </span>
          </div>

          <h1 className="text-5xl font-black leading-[0.98] tracking-tight md:text-[4.25rem]">
            Audit-ready
            <br />
            <span className="bg-gradient-to-r from-[#B85C72] to-[#D98BA0] bg-clip-text text-transparent">
              kitchens
            </span>
            <br />
            without the clipboard chaos.
          </h1>

          <p className="max-w-lg text-base leading-7 text-[#8A6670]">
            Every cook, server, and cleaner uploads training certificates, signed SOPs, and quiz
            results. Susie Q&rsquo;s calculates compliance automatically and keeps inspector-ready
            records — with real-time metrics, upcoming expirations, and escalation alerts in one place.
          </p>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              to="/login"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[#3B1C26] px-7 py-3 text-sm font-black text-white shadow-lg shadow-[#3B1C26]/15 transition hover:bg-[#52262F]"
            >
              Start Demo <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="#features"
              className="inline-flex items-center justify-center rounded-full border border-[#3B1C26]/12 bg-white px-7 py-3 text-sm font-bold text-[#52262F] transition hover:border-[#3B1C26]/25"
            >
              See all features
            </a>
          </div>

          <div className="flex items-center gap-6 border-t border-[#3B1C26]/10 pt-6">
            {[["3", "Stations"], ["Real-time", "Status"], ["100%", "Audit Ready"]].map(([val, label]) => (
              <div key={label}>
                <p className="font-mono text-xl font-black text-[#3B1C26]">{val}</p>
                <p className="text-xs text-[#B79AA3]">{label}</p>
              </div>
            ))}
          </div>
        </div>

        <div id="features" className="grid gap-3">
          {features.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="group flex items-start gap-4 rounded-2xl border border-[#3B1C26]/8 bg-white p-5 shadow-sm transition hover:border-[#B85C72]/25 hover:shadow-md"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#B85C72]/20 bg-[#F8E9ED] text-[#B85C72]">
                <Icon className="h-5 w-5" />
              </span>
              <div>
                <p className="font-black text-[#3B1C26]">{title}</p>
                <p className="mt-1 text-sm leading-6 text-[#8A6670]">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
