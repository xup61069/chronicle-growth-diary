import { formatQuickNoteForClipboard, parseQuickNoteDraft, QUICK_NOTE_STORAGE_KEY } from "@/lib/quickNote";
import { connectionStatusLabel, getConnectionStatus } from "@/lib/connectionStatus";
import { Check, ClipboardCopy, CloudOff, Eraser, FilePenLine, Wifi, WifiOff } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function readDraft() {
  if (typeof window === "undefined") return { body: "", updatedAt: Date.now() };
  return parseQuickNoteDraft(window.localStorage.getItem(QUICK_NOTE_STORAGE_KEY)) ?? { body: "", updatedAt: Date.now() };
}

export default function QuickNote() {
  const [draft, setDraft] = useState(readDraft);
  const [online, setOnline] = useState(() => typeof navigator === "undefined" || navigator.onLine);
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [lastSaved, setLastSaved] = useState(() => readDraft().updatedAt);

  useEffect(() => {
    const setConnected = () => setOnline(true);
    const setOffline = () => setOnline(false);
    const captureInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    window.addEventListener("online", setConnected);
    window.addEventListener("offline", setOffline);
    window.addEventListener("beforeinstallprompt", captureInstallPrompt);
    return () => {
      window.removeEventListener("online", setConnected);
      window.removeEventListener("offline", setOffline);
      window.removeEventListener("beforeinstallprompt", captureInstallPrompt);
    };
  }, []);

  useEffect(() => {
    const saved = { body: draft.body, updatedAt: Date.now() };
    window.localStorage.setItem(QUICK_NOTE_STORAGE_KEY, JSON.stringify(saved));
    setLastSaved(saved.updatedAt);
  }, [draft.body]);

  const copyDraft = async () => {
    if (!draft.body.trim()) return toast.info("先寫下一段文字，才有內容可以複製。");
    try {
      await navigator.clipboard.writeText(formatQuickNoteForClipboard({ ...draft, updatedAt: lastSaved }));
      toast.success("已複製。登入後可在完整編輯器貼上並整理成事件。");
    } catch {
      toast.error("目前瀏覽器無法自動複製，請直接選取文字後複製。");
    }
  };

  const clearDraft = () => {
    if (!draft.body || window.confirm("確定要清除這則只存於本機的草稿嗎？")) {
      setDraft({ body: "", updatedAt: Date.now() });
      toast.success("本機草稿已清除。");
    }
  };

  const installApp = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const result = await installPrompt.userChoice;
    setInstallPrompt(null);
    if (result.outcome === "accepted") toast.success("Chronicle 已加入此裝置的應用程式清單。");
  };

  return (
    <main className="min-h-screen bg-[#f6f1e8] text-[#14263a] px-5 py-6 sm:px-10 lg:px-16">
      <div className="mx-auto max-w-3xl">
        <header className="flex items-center justify-between border-b border-[#14263a]/20 pb-5">
          <Link href="/" className="font-mono text-xs tracking-[0.22em] text-[#14263a]">CHRONICLE</Link>
          <div className="flex items-center gap-3 text-xs font-medium">
            <span className={`inline-flex items-center gap-1.5 ${online ? "text-[#587a8b]" : "text-[#bd4d34]"}`}>{online ? <Wifi size={14} /> : <WifiOff size={14} />}{connectionStatusLabel(getConnectionStatus(online))}</span>
            {installPrompt ? <button type="button" onClick={installApp} className="border border-[#14263a] px-3 py-1.5 transition-colors hover:bg-[#14263a] hover:text-[#f6f1e8]">安裝 App</button> : null}
          </div>
        </header>

        <section className="py-14 sm:py-20">
          <p className="mb-4 font-mono text-[11px] tracking-[0.2em] text-[#bd4d34]">QUICK NOTE / LOCAL FIRST</p>
          <h1 className="max-w-2xl font-serif text-5xl leading-[1.05] sm:text-7xl">先記下來，<br /><em className="text-[#ee623b]">再整理成故事。</em></h1>
          <p className="mt-6 max-w-xl leading-7 text-[#405365]">這則草稿只會保存在目前裝置的瀏覽器中。即使離線也可以使用；重新連線後，複製內容並登入完整編輯器，即可整理成正式事件。</p>
        </section>

        <section className="border border-[#14263a] bg-[#fffdf8] shadow-[8px_8px_0_#ee623b]">
          <div className="flex items-center justify-between border-b border-[#14263a]/20 px-5 py-3 font-mono text-[11px] tracking-[0.12em]">
            <span className="inline-flex items-center gap-2"><FilePenLine size={14} /> LOCAL DRAFT</span>
            <span className="text-[#587a8b]">{lastSaved ? `已自動儲存 ${new Date(lastSaved).toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit" })}` : "尚未儲存"}</span>
          </div>
          <textarea
            aria-label="快速記事草稿"
            className="min-h-80 w-full resize-y bg-transparent px-5 py-5 text-lg leading-8 outline-none placeholder:text-[#6f7c83]"
            value={draft.body}
            onChange={(event) => setDraft((current) => ({ ...current, body: event.target.value }))}
            placeholder="剛剛發生了什麼？先用自己的話記下來。日期、情緒、地點或一句值得保留的話，都可以。"
            maxLength={8000}
          />
          <div className="flex flex-col gap-3 border-t border-[#14263a]/20 p-4 sm:flex-row sm:items-center sm:justify-between">
            <span className="font-mono text-[11px] text-[#6f7c83]">{draft.body.length.toLocaleString()} / 8,000</span>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={clearDraft} className="inline-flex items-center gap-2 border border-[#14263a]/30 px-3 py-2 text-sm hover:border-[#bd4d34] hover:text-[#bd4d34]"><Eraser size={15} /> 清除</button>
              <button type="button" onClick={copyDraft} className="inline-flex items-center gap-2 bg-[#14263a] px-3 py-2 text-sm text-[#f6f1e8] hover:bg-[#ee623b]"><ClipboardCopy size={15} /> 複製到剪貼簿</button>
            </div>
          </div>
        </section>

        <section className="mt-14 grid gap-4 border-t border-[#14263a]/20 pt-7 sm:grid-cols-2">
          <div className="flex gap-3 text-sm leading-6"><CloudOff className="mt-1 shrink-0 text-[#ee623b]" size={18} /><p><b>不會自動上傳。</b><br />本機草稿不會送到 Chronicle 伺服器，也不會出現在分享頁。</p></div>
          <div className="flex gap-3 text-sm leading-6"><Check className="mt-1 shrink-0 text-[#587a8b]" size={18} /><p><b>準備好再整理。</b><br />複製後前往完整編輯器，貼上並補上日期、標籤與圖片。</p></div>
        </section>

        <div className="mt-10 border-t border-[#14263a]/20 pt-6"><Link href="/editor" className="inline-flex items-center gap-2 border-b border-[#14263a] pb-1 text-sm font-semibold hover:text-[#ee623b]">前往完整成長日記編輯器 <span aria-hidden>↗</span></Link></div>
      </div>
    </main>
  );
}
