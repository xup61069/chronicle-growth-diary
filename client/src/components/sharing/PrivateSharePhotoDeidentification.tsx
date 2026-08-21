import { blurPhotoMasks, createManualBlurMask, detectFacesLocally, getPhotoDimensions, padFaceRegions, type BlurMaskRegion, type DeidentifiedPhoto } from "@/lib/sharePhotoDeidentification";
import { trpc } from "@/lib/trpc";
import { Check, ImageDown, Loader2, LockKeyhole, Plus, RefreshCcw, ScanFace, SlidersHorizontal, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export type DeidentificationMedia = { id: number; url: string; fileName: string; mediaKind: "image" | "live_motion"; shareSafeEnabled: boolean; shareSafeUrl: string | null };
export type DeidentificationEvent = { id: number; title: string; shareScope: "private" | "public" | "link"; media: DeidentificationMedia[] };

type Preview = { mediaId: number; eventTitle: string; source: Blob; outputName: string; objectUrl: string; photo: DeidentifiedPhoto; width: number; height: number; masks: BlurMaskRegion[]; blurStrength: number; isDirty: boolean };

function toBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("無法讀取去識別化副本。"));
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.readAsDataURL(file);
  });
}

function maskInput(value: number) {
  return Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;
}

export function PrivateSharePhotoDeidentification({ events }: { events: DeidentificationEvent[] }) {
  const utils = trpc.useUtils();
  const uploadMutation = trpc.diary.uploadShareSafeImage.useMutation();
  const clearMutation = trpc.diary.clearShareSafeImage.useMutation();
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [preview, setPreview] = useState<Preview | null>(null);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview.objectUrl); }, [preview]);
  const images = events.flatMap((event) => event.media.filter((media) => media.mediaKind === "image").map((media) => ({ ...media, eventTitle: event.title, shareScope: event.shareScope })));

  const createPreview = async (media: typeof images[number]) => {
    setProcessingId(media.id);
    try {
      const response = await fetch(media.url);
      if (!response.ok) throw new Error("無法讀取這張私人圖片。請重新整理後再試。" );
      const source = await response.blob();
      const [{ width, height }, detected] = await Promise.all([getPhotoDimensions(source), detectFacesLocally(source)]);
      const masks = padFaceRegions(detected, width, height).map((region, index) => ({ ...region, id: `detected-${index + 1}`, source: "detected" as const }));
      const photo = await blurPhotoMasks(source, masks, media.fileName);
      if (preview) URL.revokeObjectURL(preview.objectUrl);
      setPreview({ mediaId: media.id, eventTitle: media.eventTitle, source, outputName: media.fileName, objectUrl: URL.createObjectURL(photo.file), photo, width, height, masks, blurStrength: 1, isDirty: false });
      if (!masks.length) toast.info("未自動偵測到臉部。你可以在下方新增手動遮罩，確認前不會上傳任何圖片。" );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "本機人臉模糊未完成；分享設定沒有改變。" );
    } finally {
      setProcessingId(null);
    }
  };

  const updatePreview = (updater: (current: Preview) => Preview) => setPreview((current) => current ? { ...updater(current), isDirty: true } : current);
  const updateMask = (id: string, field: "xMin" | "yMin" | "width" | "height", value: number) => updatePreview((current) => ({ ...current, masks: current.masks.map((mask) => mask.id === id ? { ...mask, [field]: maskInput(value) } : mask) }));

  const regenerate = async () => {
    if (!preview || !preview.masks.length) return toast.error("請至少保留一個遮罩區域，再重新產生預覽。" );
    setIsRegenerating(true);
    try {
      const photo = await blurPhotoMasks(preview.source, preview.masks, preview.outputName, preview.blurStrength);
      URL.revokeObjectURL(preview.objectUrl);
      setPreview((current) => current ? { ...current, photo, objectUrl: URL.createObjectURL(photo.file), isDirty: false } : current);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "無法重新產生本機模糊預覽。" );
    } finally {
      setIsRegenerating(false);
    }
  };

  const confirm = async () => {
    if (!preview) return;
    if (preview.isDirty) return toast.error("請先重新產生並檢查遮罩後的預覽，再確認使用副本。" );
    try {
      await uploadMutation.mutateAsync({ mediaId: preview.mediaId, fileName: preview.photo.file.name, mimeType: "image/jpeg", base64: await toBase64(preview.photo.file) });
      await utils.diary.get.invalidate();
      URL.revokeObjectURL(preview.objectUrl);
      setPreview(null);
      toast.success("已保存分享用模糊副本。公開或私密連結會使用副本，不會投影原圖。" );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "無法保存分享用副本。" );
    }
  };

  const clear = async (mediaId: number) => {
    try {
      await clearMutation.mutateAsync({ mediaId });
      await utils.diary.get.invalidate();
      toast.success("已移除分享用模糊副本，且公開／連結頁已隱藏這張照片；私人原圖沒有改動。" );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "無法移除分享用副本。" );
    }
  };

  return <section className="import-studio" aria-labelledby="share-deidentify-title">
    <div><p className="editor-kicker"><span /> SHARE PHOTO / LOCAL ONLY</p><h2 id="share-deidentify-title">建立分享用人臉模糊副本</h2><p>按下處理後，照片、臉部偵測、手動遮罩與 Canvas 模糊都在此瀏覽器內完成。原圖與遮罩座標不會送往辨識服務；只有你確認後的 JPEG 副本才會儲存並供分享頁使用。</p></div>
    <div className="import-warning"><LockKeyhole size={15} /> 偵測可能漏掉臉部。請以手動遮罩補正並重新檢查預覽；Live Photo MOV 不會出現在公開或私密連結分享頁。</div>
    {preview ? <article className="deidentify-preview"><img src={preview.objectUrl} alt={`${preview.eventTitle} 的本機人臉模糊預覽`} /><div><b>目前預覽有 {preview.photo.faceCount} 個模糊遮罩</b><small>這是尚未上傳的本機 JPEG 預覽。可調整座標、範圍與模糊效果；調整後必須重新產生預覽。</small><div className="deidentify-mask-editor"><header><span><SlidersHorizontal size={14} /> 手動遮罩補正</span><button type="button" onClick={() => updatePreview((current) => ({ ...current, masks: [...current.masks, createManualBlurMask(current.width, current.height)] }))} disabled={isRegenerating || uploadMutation.isPending}><Plus size={13} /> 新增遮罩</button></header>{preview.masks.length ? preview.masks.map((mask, index) => <fieldset key={mask.id}><legend>{mask.source === "detected" ? `偵測遮罩 ${index + 1}` : `手動遮罩 ${index + 1}`}</legend><label>X<input aria-label={`遮罩 ${index + 1} X 座標`} type="number" min="0" max={preview.width} value={mask.xMin} onChange={(event) => updateMask(mask.id, "xMin", Number(event.target.value))} disabled={isRegenerating || uploadMutation.isPending} /></label><label>Y<input aria-label={`遮罩 ${index + 1} Y 座標`} type="number" min="0" max={preview.height} value={mask.yMin} onChange={(event) => updateMask(mask.id, "yMin", Number(event.target.value))} disabled={isRegenerating || uploadMutation.isPending} /></label><label>寬<input aria-label={`遮罩 ${index + 1} 寬度`} type="number" min="1" max={preview.width} value={mask.width} onChange={(event) => updateMask(mask.id, "width", Number(event.target.value))} disabled={isRegenerating || uploadMutation.isPending} /></label><label>高<input aria-label={`遮罩 ${index + 1} 高度`} type="number" min="1" max={preview.height} value={mask.height} onChange={(event) => updateMask(mask.id, "height", Number(event.target.value))} disabled={isRegenerating || uploadMutation.isPending} /></label><button type="button" aria-label={`移除遮罩 ${index + 1}`} onClick={() => updatePreview((current) => ({ ...current, masks: current.masks.filter((item) => item.id !== mask.id) }))} disabled={isRegenerating || uploadMutation.isPending}><Trash2 size={13} /> 移除</button></fieldset>) : <p>尚未有遮罩。可新增手動遮罩後再產生預覽。</p>}<label className="deidentify-strength">模糊強度<input aria-label="人臉模糊強度" type="range" min="0.5" max="2" step="0.1" value={preview.blurStrength} onChange={(event) => updatePreview((current) => ({ ...current, blurStrength: Number(event.target.value) }))} disabled={isRegenerating || uploadMutation.isPending} /><output>{preview.blurStrength.toFixed(1)}×</output></label><button type="button" onClick={() => void regenerate()} disabled={isRegenerating || !preview.masks.length || uploadMutation.isPending}>{isRegenerating ? <Loader2 size={14} className="animate-spin" /> : <RefreshCcw size={14} />} 重新產生本機預覽</button></div><div className="import-actions"><button type="button" onClick={() => { URL.revokeObjectURL(preview.objectUrl); setPreview(null); }} disabled={uploadMutation.isPending || isRegenerating}>取消</button><button type="button" onClick={() => void confirm()} disabled={uploadMutation.isPending || isRegenerating || preview.isDirty}>{uploadMutation.isPending ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />} 確認使用這個副本</button></div></div></article> : null}
    <div className="import-preview-list">{images.length ? images.map((media) => <article key={media.id}><span>{media.shareScope === "private" ? "私人" : "可分享"}</span><div><b>{media.eventTitle}</b><small>{media.shareSafeEnabled && media.shareSafeUrl ? "已保存分享用模糊副本；原圖不會投影至分享頁。" : media.shareSafeEnabled ? "目前沒有分享副本；公開／連結頁已隱藏原圖。" : "尚未建立分享用副本。"}</small></div>{media.shareSafeEnabled && media.shareSafeUrl ? <button type="button" onClick={() => void clear(media.id)} disabled={clearMutation.isPending}><Trash2 size={14} /> 移除副本並隱藏原圖</button> : <button type="button" onClick={() => void createPreview(media)} disabled={processingId === media.id || Boolean(preview)}>{processingId === media.id ? <Loader2 size={14} className="animate-spin" /> : <ScanFace size={14} />} 在此瀏覽器模糊</button>}</article>) : <p>目前沒有可處理的事件圖片。先在私人事件加入 JPEG、PNG、WebP 或 HEIC 匯入後的圖片。</p>}</div>
    <p className="share-deidentify-note"><ImageDown size={14} /> 模糊副本只改變公開／連結投影；移除副本不會刪除私人原圖，但會讓分享頁隱藏該圖，直到你重新確認新的副本。</p>
  </section>;
}
