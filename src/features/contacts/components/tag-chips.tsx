import { cn } from "@/lib/utils";

/** Etiquetas como chips; con muchas, las primeras y "+N". */
export function TagChips({
  tags,
  max = 3,
  className,
}: {
  tags: string[];
  max?: number;
  className?: string;
}) {
  if (tags.length === 0) return null;
  const shown = tags.slice(0, max);
  const rest = tags.length - shown.length;
  return (
    <ul className={cn("flex flex-wrap gap-1", className)} aria-label="Etiquetas">
      {shown.map((tag) => (
        <li
          key={tag}
          className="max-w-[10rem] truncate rounded-full border border-border/60 bg-muted/40 px-2 py-0.5 text-[11px] leading-4 text-muted-foreground"
          title={tag}
        >
          {tag}
        </li>
      ))}
      {rest > 0 && (
        <li
          className="rounded-full px-1.5 py-0.5 text-[11px] leading-4 text-muted-foreground"
          title={tags.slice(max).join(", ")}
        >
          +{rest}
        </li>
      )}
    </ul>
  );
}
