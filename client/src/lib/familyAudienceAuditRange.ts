export type FamilyAudienceAuditDateRange = { fromDate: string; toDate: string };
export type FamilyAudienceAuditQueryRange = { from?: number; to?: number };

const MIN_TIMESTAMP = -2_208_988_800_000;
const MAX_TIMESTAMP = 4_102_444_800_000;
const MAX_RANGE_MS = 366 * 24 * 60 * 60 * 1000;
const DATE_INPUT_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function timestampForDate(value: string, endOfDay: boolean) {
  if (!DATE_INPUT_PATTERN.test(value)) return null;
  const timestamp = new Date(`${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}`).getTime();
  return Number.isSafeInteger(timestamp) && timestamp >= MIN_TIMESTAMP && timestamp <= MAX_TIMESTAMP ? timestamp : null;
}

export function getFamilyAudienceAuditQueryRange(range: FamilyAudienceAuditDateRange): { input: FamilyAudienceAuditQueryRange | undefined; error: string | null } {
  const from = range.fromDate ? timestampForDate(range.fromDate, false) : undefined;
  const to = range.toDate ? timestampForDate(range.toDate, true) : undefined;
  if (from === null || to === null) return { input: undefined, error: "請輸入有效的稽核日期。" };
  if (from !== undefined && to !== undefined && from > to) return { input: undefined, error: "開始日期不能晚於結束日期。" };
  if (from !== undefined && to !== undefined && to - from > MAX_RANGE_MS) return { input: undefined, error: "日期區間最多可查詢 366 天。" };
  return { input: from === undefined && to === undefined ? undefined : { ...(from !== undefined ? { from } : {}), ...(to !== undefined ? { to } : {}) }, error: null };
}
