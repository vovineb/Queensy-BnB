import {
  AirVent, Bath, BatteryCharging, Car, Check, CookingPot, Fan, Fence, Laptop, Plane, ShieldCheck, ShowerHead, Sparkles, Trees, Tv, Umbrella, WashingMachine, Waves, Wifi, type LucideIcon,
} from "lucide-react";

// Explicit map keeps the bundle small (no dynamic import of every icon).
const ICONS: Record<string, LucideIcon> = {
  AirVent, Bath, BatteryCharging, Car, CookingPot, Fan, Fence, Laptop, Plane, ShieldCheck, ShowerHead, Sparkles, Trees, Tv, Umbrella, WashingMachine, Waves, Wifi,
};

export const AMENITY_ICON_NAMES = Object.keys(ICONS);

export function AmenityIcon({ name, className }: { name?: string | null; className?: string }) {
  const Icon = (name && ICONS[name]) || Check;
  return <Icon className={className} aria-hidden />;
}
