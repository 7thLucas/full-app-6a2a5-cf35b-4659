/*
 * Default Configurable Data — seeded into Mongo on first boot.
 *
 * BEFORE EDITING: read ./RULES.md (especially R5: schema and defaults must
 * stay in sync) and ./configurables.schema.ts. For per-type schema and
 * default-value samples, see RULES.md §5 "Field Type Reference".
 */

export type TBrandColor = {
  primary: string;
  secondary: string;
  accent: string;
};

export type TDefaultConfigurableData = {
  appName: string;
  logoUrl: string;
  brandColor: TBrandColor;
  heroTagline: string;
  heroSubtext: string;
  ctaLabel: string;
  ctaHref: string;
  heroImage: string;
  footerLine: string;
};

export const defaultConfigurablesData: TDefaultConfigurableData = {
  appName: "SusieQ Kitchen",
  logoUrl: "FILL_LOGO_URL_HERE",
  brandColor: {
    primary: "#C0395A",
    secondary: "#B02040",
    accent: "#F2A0B0",
  },
  heroTagline: "Home-Cooked Love, Delivered.",
  heroSubtext: "Fresh, soulful meals made with care — every order, every time.",
  ctaLabel: "Get in Touch",
  ctaHref: "mailto:hello@susieqkitchen.com",
  heroImage: "",
  footerLine: "hello@susieqkitchen.com  ·  @susieqkitchen",
};
