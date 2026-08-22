import { CopyCheck, Loader2, ShieldCheck } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { findPhotoImportDuplicateCandidates, readPhotoImportChecksums, readPhotoImportPerceptualHashes, type LocalPhotoCandidate } from "@/lib/photoImportDedupe";

type PrivatePhotoImportDedupeProps = {
  photos: LocalPhotoCandidate[];
  excludedPhotoIds: string[];
  disabled: boolean;
  onExclude: (photoIds: string[]) => void;
  onKeep: (photoIds: string[]) => void;
};

export function PrivatePhotoImportDedupe({ photos, excludedPhotoIds, disabled, onExclude, onKeep }: PrivatePhotoImportDedupeProps) {
  const [checksums, setChecksums] = useState<Array<{ photoId: string; checksum: string }> | null>(null);
  const [perceptualHashes, setPerceptualHashes] = useState<Array<{ photoId: string; hash: string }> | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isComparing, setIsComparing] = useState(false);
  const sourceKey = photos.map((photo) => `${photo.id}:${photo.file.name}:${photo.file.size}:${photo.file.lastModified}:${photo.file.type}`).join("|");
  useEffect(() => { setChecksums(null); setPerceptualHashes(null); }, [sourceKey]);
  const candidates = useMemo(() => findPhotoImportDuplicateCandidates(photos, checksums ?? [], perceptualHashes ?? []), [photos, checksums, perceptualHashes]);
  const namesFor = (photoIds: string[]) => photoIds.map((photoId) => photos.find((photo) => photo.id === photoId)?.file.name ?? "未命名照片");
  const checkChecksums = async () => {
    setIsChecking(true);
    try {
      setChecksums(await readPhotoImportChecksums(photos));
    } finally {
      setIsChecking(false);
    }
  };
  const checksumComplete = checksums !== null;
  const comparePerceptualHashes = async () => {
    setIsComparing(true);
    try {
      setPerceptualHashes(await readPhotoImportPerceptualHashes(photos));
    } finally {
      setIsComparing(false);
    }
  };
  const perceptualComplete = perceptualHashes !== null;

  return <section className="photo-import-dedupe" aria-labelledby="photo-import-dedupe-title">
    <p className="editor-kicker"><span /> LOCAL DUPLICATE REVIEW</p>
    <h3 id="photo-import-dedupe-title"><CopyCheck size={16} />檢查可能重複的照片</h3>
    <p>來源線索只比較目前選取檔案的名稱、大小、修改時間與類型。SHA-256 與 dHash 都必須由你明確按下，才會在此裝置讀取或解碼這批檔案；不會上傳、保存或與既有日記比較。</p>
    <div className="photo-import-dedupe-actions"><button type="button" onClick={checkChecksums} disabled={disabled || isChecking || checksumComplete}>{isChecking ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}{checksumComplete ? "SHA-256 檢查已完成" : "以本機 SHA-256 再確認"}</button><button type="button" onClick={comparePerceptualHashes} disabled={disabled || isComparing || perceptualComplete}>{isComparing ? <Loader2 size={14} className="animate-spin" /> : <CopyCheck size={14} />}{perceptualComplete ? "dHash 比較已完成" : "以本機 dHash 尋找近似圖片"}</button>{excludedPhotoIds.length ? <small>目前略過 {excludedPhotoIds.length} 張；取消或保留全部前都不會刪除檔案。</small> : null}</div>
    {candidates.length ? <div className="photo-import-dedupe-candidates" aria-live="polite">{candidates.map((candidate) => {
      const names = namesFor(candidate.photoIds);
      const excluded = candidate.photoIds.slice(1).filter((photoId) => excludedPhotoIds.includes(photoId));
      const isExact = candidate.reasons.includes("checksum");
      const isSimilar = candidate.reasons.includes("dhash");
      return <article key={candidate.id}><header><b>{isExact ? "完全相同檔案候選" : isSimilar ? "近似圖片候選" : "相同來源線索候選"}</b><small>{isExact ? "SHA-256 相同；仍由你決定" : isSimilar ? "本機 dHash 接近；仍由你決定" : "尚未確認檔案內容"}</small></header><p>{names.join("、")}</p><footer><small>{candidate.photoIds.length} 張目前選取照片</small><span><button type="button" onClick={() => onKeep(candidate.photoIds)} disabled={disabled || !excluded.length}>保留全部</button><button type="button" onClick={() => onExclude(candidate.photoIds.slice(1))} disabled={disabled || candidate.photoIds.length < 2}>略過後續 {candidate.photoIds.length - 1} 張</button></span></footer></article>;
    })}</div> : <p className="photo-import-dedupe-empty">這批目前沒有相同來源線索、本機 checksum 或 dHash 候選。</p>}
  </section>;
}
