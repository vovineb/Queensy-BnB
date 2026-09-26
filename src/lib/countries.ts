import { getCountries, getCountryCallingCode, AsYouType } from "libphonenumber-js/min";

export type CountryOption = { code: string; name: string; dialCode: string; flag: string };

function flagEmoji(code: string) {
  return String.fromCodePoint(...[...code.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

let cache: CountryOption[] | null = null;

/** All countries with dialing codes; Kenya and East Africa first, then alphabetical. */
export function countryOptions(): CountryOption[] {
  if (cache) return cache;
  const names = new Intl.DisplayNames(["en"], { type: "region" });
  const pinned = ["KE", "UG", "TZ", "RW"];
  const all: CountryOption[] = getCountries().map((code) => ({
    code,
    name: names.of(code) ?? code,
    dialCode: `+${getCountryCallingCode(code)}`,
    flag: flagEmoji(code),
  }));
  const top = pinned.map((c) => all.find((o) => o.code === c)).filter((o): o is CountryOption => Boolean(o));
  const rest = all.filter((o) => !pinned.includes(o.code)).sort((a, b) => a.name.localeCompare(b.name));
  cache = [...top, ...rest];
  return cache;
}

export function formatAsYouType(value: string) {
  return new AsYouType().input(value);
}
