export function Prose({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-4 leading-relaxed text-ink-800 [&_h2]:mt-10 [&_h2]:font-display [&_h2]:text-h3 [&_h2]:font-semibold [&_li]:ml-5 [&_li]:list-disc [&_li]:pl-1 [&_ul]:space-y-2 [&_a]:font-medium [&_a]:text-lagoon-700 [&_a]:underline">
      {children}
    </div>
  );
}
