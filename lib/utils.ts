/**
 * Timezone used for date-keyed filenames AND date strings shown in the
 * rendered HTML. Defaults to the system local timezone — set REPORT_TZ
 * to override (any IANA name, e.g. "America/Los_Angeles", "Europe/Berlin",
 * "Asia/Shanghai", or "UTC").
 */
export const REPORT_TZ: string | undefined =
  process.env.REPORT_TZ?.trim() || undefined;

export function todayKey(d: Date = new Date()): string {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: REPORT_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(d);
}
