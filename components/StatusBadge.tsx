import { statusInfo } from "@/lib/format";
import type { PlayerStatus } from "@/lib/types";

export function StatusBadge({ status }: { status: PlayerStatus | null }) {
  const s = statusInfo(status);
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${s.color}`}>
      <span className={`h-2 w-2 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}
