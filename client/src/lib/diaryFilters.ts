export type DiarySortOrder = "custom" | "newest" | "oldest";
export type DiaryListFilters = {
  type: string;
  tag: string;
  search: string;
  dateFrom: string;
  dateTo: string;
  sortOrder: DiarySortOrder;
};

type FilterableDiaryEvent = {
  occurredAt: number;
  eventType: string;
  title: string;
  body: string;
  place?: string | null;
  tags: Array<{ name: string }>;
};

export function filterDiaryEvents<T extends FilterableDiaryEvent>(events: T[], filters: DiaryListFilters) {
  const needle = filters.search.trim().toLocaleLowerCase();
  const from = filters.dateFrom ? new Date(`${filters.dateFrom}T00:00:00`).getTime() : null;
  const to = filters.dateTo ? new Date(`${filters.dateTo}T23:59:59.999`).getTime() : null;
  const filtered = events
    .filter((event) => filters.type === "all" || event.eventType === filters.type)
    .filter((event) => filters.tag === "all" || event.tags.some((tag) => tag.name === filters.tag))
    .filter((event) => !needle || [event.title, event.body, event.place ?? "", ...event.tags.map((tag) => tag.name)].join(" ").toLocaleLowerCase().includes(needle))
    .filter((event) => from === null || event.occurredAt >= from)
    .filter((event) => to === null || event.occurredAt <= to);

  if (filters.sortOrder === "custom") return filtered;
  return [...filtered].sort((left, right) => filters.sortOrder === "oldest" ? left.occurredAt - right.occurredAt : right.occurredAt - left.occurredAt);
}
