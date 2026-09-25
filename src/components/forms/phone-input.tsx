"use client";

import { useMemo, useState } from "react";
import { countryOptions } from "@/lib/countries";
import { cn } from "@/lib/cn";
import { inputClasses } from "@/components/ui/field";

/**
 * International phone input: country dialing code + national number.
 * Submits a single E.164-style value in `name` (validated server-side).
 */
export function PhoneInput({ name, defaultValue, id, defaultCountry = "KE", ...aria }: { name: string; defaultValue?: string | null; id?: string; defaultCountry?: string; "aria-describedby"?: string; "aria-invalid"?: boolean }) {
  const options = useMemo(() => countryOptions(), []);
  const initial = useMemo(() => {
    if (defaultValue?.startsWith("+")) {
      const match = [...options].sort((a, b) => b.dialCode.length - a.dialCode.length).find((o) => defaultValue.startsWith(o.dialCode));
      if (match) return { country: match.code, national: defaultValue.slice(match.dialCode.length) };
    }
    return { country: defaultCountry, national: defaultValue ?? "" };
  }, [defaultValue, defaultCountry, options]);
  const [country, setCountry] = useState(initial.country);
  const [national, setNational] = useState(initial.national);
  const dial = options.find((o) => o.code === country)?.dialCode ?? "";
  const digits = national.replace(/[^\d]/g, "").replace(/^0+/, "");
  const value = national.trim().startsWith("+") ? national.replace(/[^\d+]/g, "") : digits ? `${dial}${digits}` : "";

  return (
    <div className="flex gap-2">
      <select
        aria-label="Country code"
        value={country}
        onChange={(e) => setCountry(e.target.value)}
        className={cn(inputClasses, "w-[7.5rem] shrink-0 pr-2")}
      >
        {options.map((o) => (
          <option key={o.code} value={o.code}>
            {o.flag} {o.dialCode} {o.name}
          </option>
        ))}
      </select>
      <input
        id={id}
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        placeholder={country === "KE" ? "712 345 678" : "Phone number"}
        value={national}
        onChange={(e) => setNational(e.target.value)}
        className={cn(inputClasses, "min-w-0 flex-1")}
        {...aria}
      />
      <input type="hidden" name={name} value={value} />
    </div>
  );
}
