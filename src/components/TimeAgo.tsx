import { timeAgo } from "@/lib/format";

/**
 * Relative timestamps are computed from the current clock, so the server render
 * and the client hydration can disagree by a few seconds. Suppressing the
 * hydration warning keeps the console clean without changing the rendered text.
 */
export function TimeAgo({ iso, prefix }: { iso: string; prefix?: string }) {
  return (
    <span suppressHydrationWarning>
      {prefix ? `${prefix} ` : ""}
      {timeAgo(iso)}
    </span>
  );
}
