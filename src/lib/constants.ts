export const VISITOR_COOKIE = "qb_vid";
export const SESSION_COOKIE_NAME = "qb_session";
export const SITE_NAME = "Queensy BnB";

export const PROPERTY_TYPE_LABELS: Record<string, string> = {
  APARTMENT: "Apartment",
  STUDIO: "Studio",
  PENTHOUSE: "Penthouse",
  VILLA: "Villa",
  HOUSE: "House",
  COTTAGE: "Cottage",
  SUITE: "Suite",
  ROOM: "Private room",
};

export const CANCELLATION_POLICY_COPY: Record<string, { label: string; summary: string }> = {
  FLEXIBLE: { label: "Flexible", summary: "Free cancellation up to 24 hours before check-in." },
  MODERATE: { label: "Moderate", summary: "Free cancellation up to 5 days before check-in. After that, the first night is non-refundable." },
  STRICT: { label: "Strict", summary: "50% refund up to 14 days before check-in. No refund after that." },
  NON_REFUNDABLE: { label: "Non-refundable", summary: "This booking can't be refunded once confirmed." },
};

export const PROPERTY_STATUS = {
  PUBLISHED: { label: "Published", tone: "success" as const },
  DRAFT: { label: "Draft", tone: "warning" as const },
  ARCHIVED: { label: "Archived", tone: "neutral" as const },
};
