export type LocalTextImportCandidate = {
  id: string;
  title: string;
  occurredAt: number;
};

export type TextImportDuplicateCandidate = {
  id: string;
  itemIds: string[];
  normalizedTitle: string;
  utcDate: string;
};

export function normalizeImportShortTitle(title: string) {
  return title.normalize("NFKC").trim().toLocaleLowerCase().slice(0, 80).replace(/[\s!"#$%&'()*+,\-./:;<=>?@[\]^_`{|}~，。！？、；：（）【】「」『』《》〈〉]+/g, "");
}

export function utcDateKey(occurredAt: number) {
  return Number.isFinite(occurredAt) ? new Date(occurredAt).toISOString().slice(0, 10) : "";
}

export function findTextImportDuplicateCandidates(items: LocalTextImportCandidate[]): TextImportDuplicateCandidate[] {
  const groups = new Map<string, LocalTextImportCandidate[]>();
  for (const item of items) {
    const normalizedTitle = normalizeImportShortTitle(item.title);
    const utcDate = utcDateKey(item.occurredAt);
    if (!normalizedTitle || !utcDate) continue;
    const key = `${normalizedTitle}|${utcDate}`;
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  return Array.from(groups.values())
    .filter((group) => group.length > 1)
    .map((group) => ({
      id: group.map((item) => item.id).sort().join("|"),
      itemIds: group.map((item) => item.id).sort(),
      normalizedTitle: normalizeImportShortTitle(group[0]?.title ?? ""),
      utcDate: utcDateKey(group[0]?.occurredAt ?? Number.NaN),
    }))
    .sort((left, right) => left.id.localeCompare(right.id));
}
