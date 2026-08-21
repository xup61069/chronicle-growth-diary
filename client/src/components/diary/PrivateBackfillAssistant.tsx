import React from "react";
import { CalendarClock, ImagePlus } from "lucide-react";
import type { BackfillAssistantSnapshot } from "@/lib/backfillAssistant";

export function PrivateBackfillAssistant({ snapshot, onChoosePhotos }: { snapshot: BackfillAssistantSnapshot; onChoosePhotos: () => void }) {
  const gapLabel = snapshot.daysSinceLatestEvent === null
    ? "還沒有私人事件"
    : snapshot.daysSinceLatestEvent === 0
      ? "今天已留下記錄"
      : `${snapshot.daysSinceLatestEvent} 天沒有留下事件`;
  const photoLabel = snapshot.pendingPhotoCount
    ? `目前這批有 ${snapshot.pendingPhotoCount} 張照片尚未整理`
    : "尚未選取待整理照片";

  return <section className="backfill-assistant import-studio" aria-labelledby="backfill-assistant-title">
    <header><div><p className="editor-kicker"><span /> BACKFILL ASSISTANT / PRIVATE</p><h2 id="backfill-assistant-title">補回最近的空白</h2><p>只用這本私人日記的事件日期與目前瀏覽器已選取、尚未確認匯入的照片數提示你；不讀取事件內容、不上傳照片、不建立通知或排程。</p></div><CalendarClock size={27} aria-hidden="true" /></header>
    <div className="backfill-assistant-grid" aria-live="polite"><article><b>{gapLabel}</b><small>{snapshot.daysSinceLatestEvent === null ? "先寫下一段，之後才會開始計算空窗。" : "以最新一段過去事件的日期計算，不包含未來事件。"}</small></article><article><b>{photoLabel}</b><small>照片只在選取 JPEG 後於這個瀏覽器暫時計數；取消或確認後不保留這個數字。</small></article></div>
    {snapshot.needsNudge ? <footer><span>可先補一段簡短事件，或先檢視照片日期。</span><button type="button" onClick={onChoosePhotos}><ImagePlus size={15} /> 選擇 JPEG 照片</button></footer> : null}
  </section>;
}
