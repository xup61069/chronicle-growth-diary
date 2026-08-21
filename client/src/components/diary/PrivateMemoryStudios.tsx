import { formatCapsuleCountdown } from "@/lib/lifeProgress";
import type { FutureLetter } from "@/lib/futureLetters";
import { type MonthlyDigestMonth, type buildMonthlyDigest } from "@/lib/monthlyDigest";
import { BellRing, CalendarDays, ChevronRight, FileDown, History, Loader2, LockKeyhole, Mail, RefreshCw } from "lucide-react";
import React from "react";

type OnThisDayMemory = {
  id: number;
  yearsAgo: number;
  isLocked: boolean;
  daysRemaining: number;
  occurredAt: number;
  eventType: string | null;
  title: string | null;
};

export function OnThisDayStudio({ isLoading, memories, onOpen }: {
  isLoading: boolean;
  memories: OnThisDayMemory[];
  onOpen: (eventId: number) => void;
}) {
  return <section className="on-this-day-card" aria-labelledby="on-this-day-title">
    <header><div><p className="editor-kicker"><span /> ON THIS DAY / PRIVATE</p><h2 id="on-this-day-title">N 年前的今天</h2><p>只比對具完整日期的私人事件。這是站內閱讀入口，不會傳送通知、寄送 Email 或向外部服務提供日記內容。</p></div><History size={28} aria-hidden="true" /></header>
    {isLoading ? <div className="on-this-day-empty" role="status"><Loader2 size={20} className="animate-spin" /><p>正在整理同日回憶…</p></div> : memories.length ? <div className="on-this-day-list">{memories.map((memory) => <article key={memory.id} className={memory.isLocked ? "is-locked" : ""}>
      <div className="on-this-day-age"><b>{memory.yearsAgo}</b><span>年前</span></div>
      {memory.isLocked ? <div className="on-this-day-locked"><LockKeyhole size={16} /><div><b>時空膠囊尚未解鎖</b><p>{formatCapsuleCountdown(memory.daysRemaining)}；在解鎖前不顯示標題或內容。</p></div></div> : <div className="on-this-day-copy"><span>{new Date(memory.occurredAt).toLocaleDateString("zh-TW", { month: "long", day: "numeric" })} · {memory.eventType}</span><h3>{memory.title}</h3><button type="button" onClick={() => onOpen(memory.id)}>開啟這筆記錄 <ChevronRight size={14} /></button></div>}
    </article>)}</div> : <div className="on-this-day-empty"><History size={20} /><p>今天沒有同月同日的私人事件。日後寫下完整日期的記錄，回到工作台時會在這裡出現。</p></div>}
  </section>;
}

export function RecallCheckStudio({ enabled, isLoading, isUpdating, isRunning, lastCheckLabel, statusLabel, onSetEnabled, onRunNow }: {
  enabled: boolean;
  isLoading: boolean;
  isUpdating: boolean;
  isRunning: boolean;
  lastCheckLabel: string;
  statusLabel: string;
  onSetEnabled: (enabled: boolean) => void;
  onRunNow: () => void;
}) {
  return <section className="recall-check-studio" aria-labelledby="recall-check-title">
    <header><div><p className="editor-kicker"><span /> DAILY RECALL CHECK / OWNER ONLY</p><h2 id="recall-check-title">每日回憶檢查</h2><p>這是可選的私人背景檢查。它只統計今天是否有可查看的私人回憶或已到期信件；不寄送 Email、不推播、不保存日記內容、標題、照片或地點。</p></div><BellRing size={27} aria-hidden="true" /></header>
    <div className="recall-check-panel">
      <label className="recall-check-toggle"><input type="checkbox" checked={enabled} disabled={isLoading || isUpdating} onChange={(event) => onSetEnabled(event.target.checked)} /><span><b>每天自動檢查</b><small>預設關閉。第一次開啟必須先發布網站；未設定外部遞送服務時，結果只留在這個私人工具台。</small></span></label>
      <div className="recall-check-status" aria-live="polite"><span>最後檢查：{lastCheckLabel}</span><p>{statusLabel}</p></div>
      <button type="button" onClick={onRunNow} disabled={!enabled || isRunning}>{isRunning ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} 立即檢查</button>
    </div>
  </section>;
}

export function FutureLettersStudio({ letters, onOpen }: { letters: FutureLetter[]; onOpen: (eventId: number) => void }) {
  return <section className="future-letters-studio" aria-labelledby="future-letters-title">
    <header><div><p className="editor-kicker"><span /> FUTURE LETTERS / PRIVATE</p><h2 id="future-letters-title">寫給以後的自己</h2><p>將有解鎖日期的私人事件整理為信件索引。尚未到期時不顯示標題；這是站內入口，不會寄送 Email 或背景通知。</p></div><Mail size={27} aria-hidden="true" /></header>
    {letters.length ? <div className="future-letters-list">{letters.slice(0, 5).map((letter) => <article key={letter.id} className={letter.isLocked ? "is-locked" : "is-ready"}>
      <div className="future-letter-date"><span>{letter.isLocked ? "解鎖日" : "已解鎖"}</span><b>{new Intl.DateTimeFormat("zh-TW", { year: "numeric", month: "short", day: "numeric" }).format(new Date(letter.unlocksAt))}</b></div>
      {letter.isLocked ? <div className="future-letter-locked"><LockKeyhole size={16} /><div><b>{letter.isSoon ? "即將開啟的時空膠囊" : "時空膠囊尚未解鎖"}</b><p>{formatCapsuleCountdown(letter.daysRemaining)}；解鎖前不顯示信件標題或內容。</p></div></div> : <div className="future-letter-ready"><span>可以重新閱讀</span><h3>{letter.title}</h3><button type="button" onClick={() => onOpen(letter.id)}>開啟這封信 <ChevronRight size={14} /></button></div>}
    </article>)}</div> : <div className="future-letters-empty"><Mail size={20} /><p>還沒有設定解鎖日期的私人事件。撰寫事件時加入時空膠囊日期，之後會在這裡依解鎖時間整理。</p></div>}
  </section>;
}

type MonthlyDigest = ReturnType<typeof buildMonthlyDigest>;

export function MonthlyDigestStudio({ digest, months, activeMonthKey, onMonthChange, onPrint }: {
  digest: MonthlyDigest | null;
  months: MonthlyDigestMonth[];
  activeMonthKey: string;
  onMonthChange: (key: string) => void;
  onPrint: () => void;
}) {
  return <section className="monthly-digest-studio" aria-labelledby="monthly-digest-title">
    <header><div><p className="editor-kicker"><span /> MONTHLY PRIVATE EDITION</p><h2 id="monthly-digest-title">這個月留下了什麼</h2><p>手動整理指定月份的私人事件，適合在家庭聚會前列印或另存。摘要不會自動寄送，也不會把內容放進公開分享。</p></div><CalendarDays size={27} aria-hidden="true" /></header>
    {digest ? <><div className="monthly-digest-controls"><label>整理月份<select aria-label="月度摘要月份" value={activeMonthKey} onChange={(event) => onMonthChange(event.target.value)}>{months.map((month) => { const key = `${month.year}-${String(month.month).padStart(2, "0")}`; return <option value={key} key={key}>{month.year} 年 {month.month} 月</option>; })}</select></label><button type="button" onClick={onPrint}><FileDown size={15} /> 列印／另存摘要</button></div><article className="monthly-digest-card"><div className="monthly-digest-count"><b>{digest.count.toString().padStart(2, "0")}</b><span>段私人事件</span></div><div><p>{digest.lead}</p><div className="monthly-digest-stats"><span>回憶 {digest.typeCounts.memory}</span><span>學習 {digest.typeCounts.learning}</span><span>成就 {digest.typeCounts.achievement}</span><span>章節 {digest.typeCounts.chapter}</span>{digest.lockedCount ? <span>未解鎖 {digest.lockedCount}</span> : null}</div>{digest.tags.length ? <div className="monthly-digest-tags">{digest.tags.map((tag) => <span key={tag}>#{tag}</span>)}</div> : null}</div></article></> : <div className="monthly-digest-empty"><CalendarDays size={20} /><p>還沒有可整理的私人月份。先寫下一筆具日期的事件，之後可在這裡建立摘要。</p></div>}
  </section>;
}
