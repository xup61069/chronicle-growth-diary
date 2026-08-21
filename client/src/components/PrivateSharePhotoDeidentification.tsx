import { createDeidentifiedPhoto, type DeidentifiedPhoto } from "@/lib/sharePhotoDeidentification";
import { trpc } from "@/lib/trpc";
import { Check, ImageDown, Loader2, LockKeyhole, ScanFace, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export type DeidentificationMedia = { id: number; url: string; fileName: string; mediaKind: "image" | "live_motion"; shareSafeEnabled: boolean; shareSafeUrl: string | null };
export type DeidentificationEvent = { id: number; title: string; shareScope: "private" | "public" | "link"; media: DeidentificationMedia[] };

type Preview = { mediaId: number; eventTitle: string; objectUrl: string; photo: DeidentifiedPhoto };

function toBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("無法讀取去識別化副本。"));
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.readAsDataURL(file);
  });
}

export function PrivateSharePhotoDeidentification({ events }: { events: DeidentificationEvent[] }) {
  const utils = trpc.useUtils();
  const uploadMutation = trpc.diary.uploadShareSafeImage.useMutation();
  const clearMutation = trpc.diary.clearShareSafeImage.useMutation();
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview.objectUrl); }, [preview]);
  const images = events.flatMap((event) => event.media.filter((media) => media.mediaKind === "image").map((media) => ({ ...media, eventTitle: event.title, shareScope: event.shareScope })));

  const createPreview = async (media: typeof images[number]) => {
    setProcessingId(media.id);
    try {
      const response = await fetch(media.url);
      if (!response.ok) throw new Error("無法讀取這張私人圖片。請重新整理後再試。" );
      const result = await createDeidentifiedPhoto(await response.blob(), media.fileName);
      if (result.status === "no_faces") return toast.error("此圖片沒有偵測到臉部，未建立可分享副本。請改用其他照片或保持私人。" );
      if (preview) URL.revokeObjectURL(preview.objectUrl);
      const photo = { file: result.file, faceCount: result.faceCount };
      setPreview({ mediaId: media.id, eventTitle: media.eventTitle, objectUrl: URL.createObjectURL(photo.file), photo });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "本機人臉模糊未完成；分享設定沒有改變。" );
    } finally {
      setProcessingId(null);
    }
  };

  const confirm = async () => {
    if (!preview) return;
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
    <div><p className="editor-kicker"><span /> SHARE PHOTO / LOCAL ONLY</p><h2 id="share-deidentify-title">建立分享用人臉模糊副本</h2><p>按下處理後，照片、臉部偵測與 Canvas 模糊都在此瀏覽器內完成。原圖與臉部座標不會送往辨識服務；只有你確認後的 JPEG 副本才會儲存並供分享頁使用。</p></div>
    <div className="import-warning"><LockKeyhole size={15} /> 偵測可能漏掉臉部，請先審核模糊預覽。Live Photo MOV 不會出現在公開或私密連結分享頁。</div>
    {preview ? <article className="deidentify-preview"><img src={preview.objectUrl} alt={`${preview.eventTitle} 的本機人臉模糊預覽`} /><div><b>已模糊 {preview.photo.faceCount} 個臉部區域</b><small>這是尚未上傳的本機 JPEG 預覽。確認後才會建立分享用副本。</small><div className="import-actions"><button type="button" onClick={() => { URL.revokeObjectURL(preview.objectUrl); setPreview(null); }} disabled={uploadMutation.isPending}>取消</button><button type="button" onClick={() => void confirm()} disabled={uploadMutation.isPending}>{uploadMutation.isPending ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />} 確認使用這個副本</button></div></div></article> : null}
    <div className="import-preview-list">{images.length ? images.map((media) => <article key={media.id}><span>{media.shareScope === "private" ? "私人" : "可分享"}</span><div><b>{media.eventTitle}</b><small>{media.shareSafeEnabled && media.shareSafeUrl ? "已保存分享用模糊副本；原圖不會投影至分享頁。" : media.shareSafeEnabled ? "目前沒有分享副本；公開／連結頁已隱藏原圖。" : "尚未建立分享用副本。"}</small></div>{media.shareSafeEnabled && media.shareSafeUrl ? <button type="button" onClick={() => void clear(media.id)} disabled={clearMutation.isPending}><Trash2 size={14} /> 移除副本並隱藏原圖</button> : <button type="button" onClick={() => void createPreview(media)} disabled={processingId === media.id || Boolean(preview)}>{processingId === media.id ? <Loader2 size={14} className="animate-spin" /> : <ScanFace size={14} />} 在此瀏覽器模糊</button>}</article>) : <p>目前沒有可處理的事件圖片。先在私人事件加入 JPEG、PNG、WebP 或 HEIC 匯入後的圖片。</p>}</div>
    <p className="share-deidentify-note"><ImageDown size={14} /> 模糊副本只改變公開／連結投影；移除副本不會刪除私人原圖，但會讓分享頁隱藏該圖，直到你重新確認新的副本。</p>
  </section>;
}
