import { describe, expect, it } from "@jest/globals";

import {
  ORGANIZATION_JSON_LD,
  SOFTWARE_APPLICATION_JSON_LD,
  SITE_URL,
  WEBSITE_JSON_LD,
  canonicalMetadata,
  formatPublicPageDate,
} from "../site";
import { PRICING } from "@/lib/pricing/config";

describe("public site metadata", () => {
  it("builds self-referencing canonical paths against the site metadata base", () => {
    expect(SITE_URL).toBe("https://yourdomain.com");
    expect(canonicalMetadata("/product")).toEqual({
      alternates: { canonical: "/product" },
    });
    expect(formatPublicPageDate("2026-09-01")).toBe("September 1, 2026");
  });

  it.each([
    ["/", "https://yourdomain.com/?utm_source=chatgpt&utm_medium=referral"],
    ["/product", "https://yourdomain.com/product?ref=assistant"],
    ["/pricing", "https://yourdomain.com/pricing?trk=partner"],
    [
      "/download",
      "https://yourdomain.com/download?snoball_referral=campaign#desktop",
    ],
  ] as const)(
    "keeps the %s canonical clean for parameterized entry URLs",
    (path, entryUrl) => {
      const canonical = canonicalMetadata(path).alternates?.canonical;

      expect(canonical).toBe(path);
      expect(new URL(String(canonical), entryUrl).href).toBe(
        `${SITE_URL}${path}`,
      );
    },
  );

  it("publishes supported organization and software application entities", () => {
    expect(ORGANIZATION_JSON_LD).toMatchObject({
      "@context": "https://schema.org",
      "@type": "Organization",
      "@id": "https://yourdomain.com/#organization",
      name: "DARK AI",
      url: "https://yourdomain.com",
    });
    expect(WEBSITE_JSON_LD).toMatchObject({
      "@context": "https://schema.org",
      "@type": "WebSite",
      "@id": "https://yourdomain.com/#website",
      name: "DARK AI",
      url: "https://yourdomain.com",
      publisher: { "@id": "https://yourdomain.com/#organization" },
    });
    expect(SOFTWARE_APPLICATION_JSON_LD).toMatchObject({
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      "@id": "https://yourdomain.com/product#software-application",
      name: "DARK AI",
      url: "https://yourdomain.com/product",
      publisher: { "@id": "https://yourdomain.com/#organization" },
    });
    const expectedOffers = [
      ["DARK AI Free", "0"],
      ["DARK AI Pro", String(PRICING.pro.monthly)],
      ["DARK AI Pro+", String(PRICING["pro-plus"].monthly)],
      ["DARK AI Ultra", String(PRICING.ultra.monthly)],
      ["DARK AI Team (per seat)", String(PRICING.team.monthly)],
    ];

    for (const [name, price] of expectedOffers) {
      expect(SOFTWARE_APPLICATION_JSON_LD.offers).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            "@type": "Offer",
            name,
            price,
            priceCurrency: "USD",
          }),
        ]),
      );
    }
  });
});
