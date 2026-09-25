"use client";

import { useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { toast } from "sonner";
import { uploadMarketingImageAction } from "@/server/actions/admin/marketing";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/field";

/** Image picker that uploads (optimised) and stores the resulting URL in a hidden field. */
export function ImageField({ name, label, defaultValue, hint }: { name: string; label: string; defaultValue?: string | null; hint?: string }) {
  const [url, setUrl] = useState(defaultValue ?? "");
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const upload = async (file: File) => {
    setBusy(true);
    const fd = new FormData();
    fd.append("file", file);
    const r = await uploadMarketingImageAction(fd);
    setBusy(false);
    if (r.ok && r.data) setUrl(r.data.url);
    else if (!r.ok) toast.error(r.error);
  };
  return (
    <div>
      <Label>{label} <span className="font-normal text-ink-500">(optional)</span></Label>
      <input type="hidden" name={name} value={url} />
      <div className="flex items-center gap-4">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="" className="h-20 w-32 rounded-md object-cover ring-1 ring-ink-200" />
        ) : (
          <div className="grid h-20 w-32 place-items-center rounded-md bg-ink-100 text-ink-400"><ImagePlus className="size-6" /></div>
        )}
        <div className="flex flex-wrap gap-2">
          <input ref={input} type="file" accept="image/*" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f); e.target.value = ""; }} aria-label={`Upload ${label}`} />
          <Button variant="secondary" size="sm" loading={busy} onClick={() => input.current?.click()}>{url ? "Replace" : "Upload image"}</Button>
          {url && <Button variant="ghost" size="sm" icon={<X className="size-4" />} onClick={() => setUrl("")}>Remove</Button>}
        </div>
      </div>
      {hint && <p className="mt-1.5 text-sm text-ink-500">{hint}</p>}
    </div>
  );
}
