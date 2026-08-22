import React, { useEffect, useMemo, useState } from "react";
import { CopyCheck } from "lucide-react";
import { findTextImportDuplicateCandidates, type LocalTextImportCandidate } from "@/lib/importTextDedupe";

type PrivateTextImportDedupeProps = {
  items: LocalTextImportCandidate[];
  selectedIds: string[];
  disabled: boolean;
  onExclude: (itemIds: string[]) => void;
  onKeep: (itemIds: string[]) => void;
};

export function PrivateTextImportDedupe({ items, selectedIds, disabled, onExclude, onKeep }: PrivateTextImportDedupeProps) {
  const [isChecked, setIsChecked] = useState(false);
  const sourceKey = items.map((item) => `${item.id}:${item.title}:${item.occurredAt}`).join("|");
  useEffect(() => setIsChecked(false), [sourceKey]);
  const candidates = useMemo(() => isChecked ? findTextImportDuplicateCandidates(items) : [], [isChecked, items]);
  const namesFor = (itemIds: string[]) => itemIds.map((itemId) => items.find((item) => item.id === itemId)?.title || "未命名草稿");
  return <section className="text-import-dedupe" aria-labelledby="text-import-dedupe-title">
    <p className="editor-kicker"><span /> LOCAL TEXT REVIEW</p>
    <h3 id="text-import-dedupe-title"><CopyCheck size={15} />檢查可能重複的文字草稿</h3>
    <p>只比較目前預覽中最多 80 字的標題正規化結果與 UTC 日期。按下檢查前不會比較；不會讀正文、上傳、保存或查看既有日記。</p>
    <div className="text-import-dedupe-actions"><button type="button" onClick={() => setIsChecked(true)} disabled={disabled || isChecked}>{isChecked ? "短標題／UTC 日期檢查已完成" : "以本機短標題／UTC 日期檢查"}</button></div>
    {isChecked && (candidates.length ? <div className="text-import-dedupe-candidates" aria-live="polite">{candidates.map((candidate) => {
      const excluded = candidate.itemIds.slice(1).filter((itemId) => !selectedIds.includes(itemId));
      return <article key={candidate.id}><header><b>相同短標題與 UTC 日期候選</b><small>{candidate.utcDate} · 仍由你決定</small></header><p>{namesFor(candidate.itemIds).join("、")}</p><footer><small>{candidate.itemIds.length} 筆目前預覽草稿</small><span><button type="button" onClick={() => onKeep(candidate.itemIds)} disabled={disabled || !excluded.length}>保留全部</button><button type="button" onClick={() => onExclude(candidate.itemIds.slice(1))} disabled={disabled || candidate.itemIds.length < 2}>略過後續 {candidate.itemIds.length - 1} 筆</button></span></footer></article>;
    })}</div> : <p className="text-import-dedupe-empty">這批目前沒有相同短標題與 UTC 日期候選。</p>)}
  </section>;
}
