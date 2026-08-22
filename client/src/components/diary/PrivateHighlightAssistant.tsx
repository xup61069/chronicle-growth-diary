import { BrainCircuit, Check, Loader2, Sparkles } from "lucide-react";

export type HighlightSuggestion = {
  eventId: number;
  title: string;
  reason: string;
  confidence: "high" | "medium";
  model: string;
};

type Props = {
  aiEnabled: boolean;
  consent: boolean;
  isGenerating: boolean;
  candidates: HighlightSuggestion[];
  adoptingEventId: number | null;
  onConsentChange: (value: boolean) => void;
  onGenerate: () => void;
  onAdopt: (eventId: number) => void;
};

export function PrivateHighlightAssistant({ aiEnabled, consent, isGenerating, candidates, adoptingEventId, onConsentChange, onGenerate, onAdopt }: Props) {
  return <section className="private-highlight-assistant annual-ai-reflection" aria-labelledby="private-highlight-title">
    <p id="private-highlight-title"><Sparkles size={14} /> AI 精選建議 / PRIVATE REVIEW</p>
    <span>這不是自動標記。每次執行只會把最多 80 段尚未精選的 private 事件片段送往 AI；不送媒體、語音、GPS、分享設定或帳號資料。候選只留在目前工作階段，必須由你逐項採用。</span>
    <label className="annual-ai-consent"><input type="checkbox" checked={consent} onChange={(event) => onConsentChange(event.target.checked)} disabled={!aiEnabled || isGenerating} />我確認本次只會將 private 事件的標題、短文片段、標籤、類型與軌道送往 AI 產生精選候選；完成後需再次確認。</label>
    <div><button type="button" onClick={onGenerate} disabled={!aiEnabled || !consent || isGenerating}>{isGenerating ? <Loader2 size={14} className="animate-spin" /> : <BrainCircuit size={14} />}{candidates.length ? "重新產生候選" : "產生精選候選"}</button>{!aiEnabled ? <small className="ai-disabled-note">AI 已關閉，請先在資料控制區啟用。</small> : null}</div>
    {candidates.length ? <div className="private-highlight-candidates" aria-live="polite">{candidates.map((candidate) => <article key={candidate.eventId}><span>{candidate.confidence === "high" ? "較高依據" : "可供參考"}</span><h3>{candidate.title}</h3><p>{candidate.reason}</p><small>本次候選由 {candidate.model} 生成；採用後才會將事件標記為精選。</small><button type="button" onClick={() => onAdopt(candidate.eventId)} disabled={adoptingEventId === candidate.eventId}>{adoptingEventId === candidate.eventId ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}採用為精選</button></article>)}</div> : null}
  </section>;
}
