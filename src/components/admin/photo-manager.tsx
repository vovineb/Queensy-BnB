"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { ArrowDown, ArrowUp, GripVertical, ImagePlus, Loader2, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/cn";
import { deleteImageAction, reorderImagesAction, setCoverImageAction, updateImageTextAction, uploadImagesAction } from "@/server/actions/admin/properties";
import { ResponsiveImage } from "@/components/ui/image";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";

type Img = { id: string; url: string; storageKey: string | null; alt: string; caption: string | null; isCover: boolean };

export function PhotoManager({ propertyId, images }: { propertyId: string; images: Img[] }) {
  const router = useRouter();
  const [items, setItems] = useState(images);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<Img | null>(null);
  const [pending, start] = useTransition();
  const input = useRef<HTMLInputElement>(null);

  // Reset local ordering when the server sends a new list (after refresh).
  const [source, setSource] = useState(images);
  if (source !== images) {
    setSource(images);
    setItems(images);
  }

  const upload = async (files: FileList | File[]) => {
    const list = Array.from(files).filter((f) => f.type.startsWith("image/") || /\.(heic|heif|avif)$/i.test(f.name));
    if (!list.length) return;
    setUploading(true);
    const fd = new FormData();
    list.forEach((f) => fd.append("files", f));
    const r = await uploadImagesAction(propertyId, fd);
    setUploading(false);
    if (!r.ok) toast.error(r.error);
    else {
      if (r.data?.uploaded) toast.success(r.message ?? "Uploaded");
      r.data?.failed.forEach((f) => toast.error(f));
    }
    router.refresh();
  };

  const persistOrder = (next: Img[]) => {
    setItems(next);
    start(async () => {
      const r = await reorderImagesAction(propertyId, next.map((i) => i.id));
      if (!r.ok) toast.error(r.error);
    });
  };

  const move = (index: number, dir: -1 | 1) => {
    const next = [...items];
    const [it] = next.splice(index, 1);
    next.splice(index + dir, 0, it);
    persistOrder(next);
  };

  return (
    <div className="space-y-6">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files.length) void upload(e.dataTransfer.files); }}
        className={cn("flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed bg-surface px-6 py-10 text-center transition", dragOver ? "border-lagoon-500 bg-lagoon-50" : "border-ink-200")}
      >
        {uploading ? <Loader2 className="size-8 animate-spin text-lagoon-700" /> : <ImagePlus className="size-8 text-ink-400" />}
        <div>
          <p className="font-medium">{uploading ? "Uploading and optimising…" : "Drag photos here, or choose files"}</p>
          <p className="text-sm text-ink-500">JPG, PNG, WebP or AVIF, up to 15 MB each (20 at a time). We resize and optimise them automatically and remove location data.</p>
        </div>
        <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/avif,image/heic" multiple className="sr-only" onChange={(e) => { if (e.target.files) void upload(e.target.files); e.target.value = ""; }} aria-label="Choose photos to upload" />
        <Button variant="secondary" disabled={uploading} onClick={() => input.current?.click()}>Choose photos</Button>
      </div>

      {items.length > 0 && (
        <>
          <p className="text-sm text-ink-600">Drag to reorder (or use the arrows). The <strong>cover</strong> photo appears first in search results. Add a short description of each photo for accessibility and SEO.</p>
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-busy={pending}>
            {items.map((img, i) => (
              <li
                key={img.id}
                draggable
                onDragStart={() => setDragId(img.id)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (!dragId || dragId === img.id) return;
                  const next = items.filter((x) => x.id !== dragId);
                  next.splice(i, 0, items.find((x) => x.id === dragId)!);
                  setDragId(null);
                  persistOrder(next);
                }}
                className={cn("overflow-hidden rounded-xl bg-surface ring-1 ring-ink-200", dragId === img.id && "opacity-50")}
              >
                <div className="relative">
                  <ResponsiveImage image={img} alt={img.alt} sizes="400px" className="aspect-[4/3] w-full" />
                  <span className="absolute left-2 top-2 flex items-center gap-1 rounded-md bg-white/90 px-2 py-1 text-xs font-semibold shadow-sm">
                    <GripVertical className="size-3.5 text-ink-400" /> {i + 1}
                  </span>
                  {img.isCover && <span className="absolute right-2 top-2 rounded-md bg-ink-900 px-2 py-1 text-xs font-semibold text-white">Cover</span>}
                </div>
                <ImageText image={img} />
                <div className="flex items-center gap-1 border-t border-ink-100 p-2">
                  <Button variant="ghost" size="icon" aria-label="Move earlier" disabled={i === 0} onClick={() => move(i, -1)}><ArrowUp className="size-4" /></Button>
                  <Button variant="ghost" size="icon" aria-label="Move later" disabled={i === items.length - 1} onClick={() => move(i, 1)}><ArrowDown className="size-4" /></Button>
                  {!img.isCover && (
                    <Button variant="ghost" size="sm" icon={<Star className="size-4" />} onClick={() => start(async () => { const r = await setCoverImageAction(propertyId, img.id); if (r.ok) toast.success(r.message ?? "Updated"); else toast.error(r.error); router.refresh(); })}>
                      Make cover
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" className="ml-auto text-danger-700" aria-label="Delete photo" onClick={() => setToDelete(img)}><Trash2 className="size-4" /></Button>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Delete this photo?"
        description="It will be removed from the listing and storage. This can't be undone."
        confirmLabel="Delete photo"
        pending={pending}
        onConfirm={() => toDelete && start(async () => { const r = await deleteImageAction(toDelete.id); if (r.ok) toast.success(r.message ?? "Deleted"); else toast.error(r.error); setToDelete(null); router.refresh(); })}
      />
    </div>
  );
}

function ImageText({ image }: { image: Img }) {
  const [alt, setAlt] = useState(image.alt);
  const [caption, setCaption] = useState(image.caption ?? "");
  const [saving, setSaving] = useState(false);
  const dirty = alt !== image.alt || caption !== (image.caption ?? "");
  return (
    <div className="space-y-2 p-3">
      <label className="block text-xs font-medium text-ink-600">
        Description (alt text)
        <input value={alt} onChange={(e) => setAlt(e.target.value)} maxLength={200} className="mt-1 h-9 w-full rounded-md px-2.5 text-sm ring-1 ring-inset ring-ink-200 focus:outline-none focus:ring-2 focus:ring-lagoon-500" />
      </label>
      <label className="block text-xs font-medium text-ink-600">
        Caption <span className="font-normal text-ink-400">(optional, shown in gallery)</span>
        <input value={caption} onChange={(e) => setCaption(e.target.value)} maxLength={300} className="mt-1 h-9 w-full rounded-md px-2.5 text-sm ring-1 ring-inset ring-ink-200 focus:outline-none focus:ring-2 focus:ring-lagoon-500" />
      </label>
      {dirty && (
        <Button size="sm" variant="dark" loading={saving} onClick={async () => { setSaving(true); const r = await updateImageTextAction(image.id, alt, caption); setSaving(false); if (r.ok) toast.success("Saved"); else toast.error(r.error); }}>
          Save text
        </Button>
      )}
    </div>
  );
}
