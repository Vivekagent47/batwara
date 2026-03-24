import { createAbsoluteUrl, siteConfig } from "@/lib/site-config"

export type FaqItem = {
  question: string
  answer: string
}

export function createOrganizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: siteConfig.name,
    url: createAbsoluteUrl("/"),
    logo: createAbsoluteUrl("/favicon.ico"),
    description: siteConfig.description,
  }
}

export function createSoftwareApplicationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: siteConfig.name,
    applicationCategory: "FinanceApplication",
    operatingSystem: "Web",
    url: createAbsoluteUrl("/"),
    image: createAbsoluteUrl(siteConfig.socialImagePath),
    description: siteConfig.description,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    featureList: [
      "Split bills across groups, trips, roommates, and couples",
      "Handle equal, exact, percentage, and share-based splits",
      "Track balances and suggested settlements",
      "Use an open-source, transparent product architecture",
    ],
  }
}

export function createFaqSchema(faqs: Array<FaqItem>) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  }
}
