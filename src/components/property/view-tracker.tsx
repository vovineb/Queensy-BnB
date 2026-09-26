"use client";

import { useEffect } from "react";
import { trackEvent } from "@/lib/analytics-client";

export function PropertyViewTracker({ propertyId }: { propertyId: string }) {
  useEffect(() => {
    trackEvent("property_view", { propertyId });
  }, [propertyId]);
  return null;
}
