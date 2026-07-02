export type Topic = { slug: string; label: string };

export const REAL_ESTATE_TOPICS: Topic[] = [
  { slug: "principles-basic-concepts", label: "Real Estate Principles and Basic Concepts" },
  { slug: "property-ownership-types", label: "Property Ownership and Types of Property" },
  { slug: "legal-descriptions", label: "Legal Descriptions" },
  { slug: "rights-in-real-property", label: "Rights in Real Property" },
  { slug: "estates-and-interests", label: "Estates and Interests in Land" },
  { slug: "leasehold-estates", label: "Leasehold Estates" },
  { slug: "easements-restrictive-covenants", label: "Easements and Restrictive Covenants" },
  { slug: "liens-encumbrances", label: "Liens and Encumbrances" },
  { slug: "forms-of-ownership", label: "Forms of Ownership" },
  { slug: "zoning-land-use", label: "Zoning, Property Rights, and Land Use Controls" },
  { slug: "agency-relationships", label: "Agency Relationships and Duties" },
  { slug: "fair-housing", label: "Fair Housing Laws" },
  { slug: "ethics-professional-conduct", label: "Ethics and Professional Conduct" },
  { slug: "listing-agreements", label: "Listing Agreements" },
  { slug: "buyer-representation", label: "Buyer Representation Agreements" },
  { slug: "disclosure-obligations", label: "Disclosure Obligations" },
  { slug: "escrow-transaction-management", label: "Escrow and Transaction Management" },
  { slug: "antitrust", label: "Antitrust Laws" },
  { slug: "real-estate-contracts", label: "Real Estate Contracts" },
  { slug: "real-estate-finance", label: "Real Estate Finance" },
  { slug: "taxation-assessment", label: "Taxation and Assessment" },
  { slug: "valuation-appraisal", label: "Property Valuation and Appraisal" },
  { slug: "environmental-laws", label: "Environmental Laws and Regulations" },
  { slug: "settlement-escrow-procedures", label: "Settlement and Escrow Procedures" },
  { slug: "deeds-title-transfer", label: "Deeds and Title Transfer" },
];

export const LIFE_HEALTH_TOPICS: Topic[] = [];

export function getTopicsForCategory(category: string): Topic[] {
  if (category === "real_estate") return REAL_ESTATE_TOPICS;
  if (category === "life_health_insurance") return LIFE_HEALTH_TOPICS;
  return [];
}

export function getTopicLabel(category: string, slug: string): string | undefined {
  return getTopicsForCategory(category).find((t) => t.slug === slug)?.label;
}
