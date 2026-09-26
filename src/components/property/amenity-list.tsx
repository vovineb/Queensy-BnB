"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AmenityIcon } from "./amenity-icon";

type Amenity = { id: string; name: string; icon: string | null; category: string };

export function AmenityList({ amenities }: { amenities: Amenity[] }) {
  const [open, setOpen] = useState(false);
  const visible = amenities.slice(0, 10);
  const grouped = Object.entries(
    amenities.reduce<Record<string, Amenity[]>>((acc, a) => {
      (acc[a.category] ??= []).push(a);
      return acc;
    }, {}),
  );
  return (
    <>
      <ul className="mt-4 grid gap-x-8 gap-y-4 sm:grid-cols-2">
        {visible.map((a) => (
          <li key={a.id} className="flex items-center gap-3 text-ink-800">
            <AmenityIcon name={a.icon} className="size-5 text-ink-700" />
            {a.name}
          </li>
        ))}
      </ul>
      {amenities.length > visible.length && (
        <Button variant="secondary" className="mt-6" onClick={() => setOpen(true)}>
          Show all {amenities.length} amenities
        </Button>
      )}
      <Modal open={open} onOpenChange={setOpen} title="What this place offers">
        <div className="space-y-6">
          {grouped.map(([category, items]) => (
            <div key={category}>
              <h3 className="font-sans text-sm font-semibold text-ink-900">{category}</h3>
              <ul className="mt-2 divide-y divide-ink-100">
                {items.map((a) => (
                  <li key={a.id} className="flex items-center gap-3 py-3">
                    <AmenityIcon name={a.icon} className="size-5 text-ink-700" /> {a.name}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Modal>
    </>
  );
}
