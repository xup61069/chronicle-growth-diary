import { Compass, Loader2, MapPin, X } from "lucide-react";
import type { PhotoJourneyCandidate } from "@/lib/photoJourneyCandidates";

type JourneyMapPreview = { candidateId: string; dataUrl: string } | null;

type PrivatePhotoJourneyCandidatesProps = {
  candidates: PhotoJourneyCandidate[];
  selectedCandidateIds: string[];
  disabled: boolean;
  isMapLoading: boolean;
  loadingCandidateId: string | null;
  mapPreview: JourneyMapPreview;
  onAnalyze: () => void;
  onClear: () => void;
  onToggle: (candidateId: string, selected: boolean) => void;
  onTitleChange: (candidateId: string, title: string) => void;
  onShowMap: (candidate: PhotoJourneyCandidate) => void;
};

export function PrivatePhotoJourneyCandidates({ candidates, selectedCandidateIds, disabled, isMapLoading, loadingCandidateId, mapPreview, onAnalyze, onClear, onToggle, onTitleChange, onShowMap }: PrivatePhotoJourneyCandidatesProps) {
  const selected = new Set(selectedCandidateIds);
  return <section className="photo-journey-candidates" aria-labelledby="photo-journey-candidates-title">
    <header>
      <div>
        <p className="editor-kicker"><span /> JOURNEY CANDIDATES / LOCAL REVIEW</p>
        <h3 id="photo-journey-candidates-title">把連續移動，先整理成候選</h3>
        <p>分析只使用這一輪照片已在瀏覽器解析的拍攝時間與成對 GPS。它不讀取影像、不查地名、不建立事件，也不會在頁面載入時自行執行。</p>
      </div>
      <div className="photo-journey-actions">
        <button type="button" onClick={onAnalyze} disabled={disabled}><Compass size={14} /> 分析這批照片</button>
        {candidates.length ? <button type="button" onClick={onClear} disabled={disabled}><X size={14} /> 清除候選</button> : null}
      </div>
    </header>
    {candidates.length ? <div className="photo-journey-list">{candidates.map((candidate) => <article key={candidate.id} data-testid="photo-journey-candidate">
      <div className="photo-journey-candidate-head">
        <label><input type="checkbox" aria-label={`選取 ${candidate.title}`} checked={selected.has(candidate.id)} onChange={(event) => onToggle(candidate.id, event.target.checked)} disabled={disabled} /> 納入本次 private 匯入</label>
        <span>{candidate.photoIds.length} 張照片</span>
      </div>
      <label>候選標題<input aria-label={`${candidate.title} 的候選標題`} value={candidate.title} onChange={(event) => onTitleChange(candidate.id, event.target.value)} maxLength={180} disabled={disabled} /></label>
      <p>{new Date(candidate.startedAt).toLocaleString("zh-TW")} — {new Date(candidate.endedAt).toLocaleString("zh-TW")}</p>
      <small>{candidate.reason}</small>
      <div className="photo-journey-map-action"><button type="button" onClick={() => onShowMap(candidate)} disabled={disabled || isMapLoading}>{loadingCandidateId === candidate.id ? <Loader2 size={14} className="animate-spin" /> : <MapPin size={14} />} 顯示地圖</button><span>只有按下後才依候選中心座標取得預覽；地圖不會保存。</span></div>
      {mapPreview?.candidateId === candidate.id ? <figure className="photo-exif-map-preview"><img src={mapPreview.dataUrl} alt={`${candidate.title} 的旅程候選中心位置地圖預覽`} /><figcaption>這是候選中心位置的暫時預覽，不代表地址、目的地或完整移動路線。</figcaption></figure> : null}
    </article>)}</div> : <p className="photo-journey-empty">尚未分析。你可以先調整照片日期與座標，再選擇是否分析本輪照片的連續位置模式。</p>}
  </section>;
}
