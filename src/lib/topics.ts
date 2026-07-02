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
  { slug: "mixed", label: "Mixed" },
  { slug: "final-exam-practice", label: "Final Exam Practice" },
];

export const LIFE_HEALTH_TOPICS: Topic[] = [
  { slug: "types-of-life-insurance", label: "Types of Life Insurance" },
  { slug: "policy-provisions", label: "Policy Provisions" },
  { slug: "life-insurance-concepts", label: "Life Insurance Concepts" },
  { slug: "annuities", label: "Annuities" },
  { slug: "life-insurance-riders", label: "Life Insurance Riders" },
  { slug: "disability-income-insurance", label: "Disability Income Insurance" },
  { slug: "health-insurance-basics", label: "Health Insurance Basics" },
  { slug: "medicare-medicaid", label: "Medicare and Medicaid" },
  { slug: "group-health-insurance", label: "Group Health Insurance" },
  { slug: "federal-tax-considerations", label: "Federal Tax Considerations" },
  { slug: "long-term-care-insurance", label: "Long-Term Care Insurance" },
  { slug: "business-life-insurance", label: "Business Life Insurance" },
  { slug: "social-security-estate-planning", label: "Social Security and Estate Planning Basics" },
  { slug: "variable-products-securities-law", label: "Variable Products and Securities Law" },
  { slug: "ethics-state-regulations-licensing", label: "Ethics, State Regulations, and Licensing Rules" },
  { slug: "underwriting-concepts", label: "Underwriting Concepts" },
  { slug: "aca-affordable-care-act", label: "ACA and Affordable Care Act" },
  { slug: "mixed", label: "Mixed" },
  { slug: "final-exam-practice", label: "Final Exam Practice" },
];

export function getTopicsForCategory(category: string): Topic[] {
  if (category === "real_estate") return REAL_ESTATE_TOPICS;
  if (category === "life_health_insurance") return LIFE_HEALTH_TOPICS;
  return [];
}

export function getTopicLabel(category: string, slug: string): string | undefined {
  return getTopicsForCategory(category).find((t) => t.slug === slug)?.label;
}
