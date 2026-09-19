/**
 * Structured data.
 *
 * The only place in the app that writes raw HTML, and it writes a string the
 * app itself produced: `JSON.stringify` of an object built from typed data.
 * `<` is escaped so a value can never close the script tag early, which is the
 * one way a JSON-LD block turns into an injection.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}

/** The publisher behind every article and every plan. */
export function organizationLd(siteUrl: string): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "هلوفیت",
    alternateName: "HelloFit",
    url: siteUrl,
    logo: `${siteUrl}/icons/icon-512.png`,
    description:
      "پلتفرم رژیم غذایی، تمرین و مشاوره با متخصصین تغذیه و مربیان بدنسازی.",
    areaServed: "IR",
    knowsLanguage: ["fa-IR"],
  };
}

export function webApplicationLd(siteUrl: string): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "هلوفیت",
    url: siteUrl,
    applicationCategory: "HealthApplication",
    operatingSystem: "Android, iOS, Web",
    inLanguage: "fa-IR",
    offers: { "@type": "Offer", price: "0", priceCurrency: "IRR" },
  };
}
