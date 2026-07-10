import Link from "next/link";

import { cn } from "@/lib/utils";

export function Brand({
  compact = false,
  className,
}: {
  compact?: boolean;
  className?: string;
}) {
  return (
    <Link
      href="/"
      className={cn("inline-flex items-center gap-2.5 text-paper", className)}
      aria-label="Cortex home"
    >
      <span className="grid size-7 place-items-center rounded-lg bg-gradient-to-br from-violet to-mint text-sm font-black text-ink">
        C
      </span>
      {!compact && (
        <span className="text-[15px] font-semibold tracking-[-0.02em]">
          Cortex
        </span>
      )}
    </Link>
  );
}
