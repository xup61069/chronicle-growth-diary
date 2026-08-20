/** A private reading index for patterns in the owner's growth archive. */
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { describeCurrentStreak, formatDashboardDate, formatDashboardMonth } from "@/lib/growthDashboard";
import { trpc } from "@/lib/trpc";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowLeft, BarChart3, CalendarDays, Flame, Hash, RefreshCw, ScrollText } from "lucide-react";
import { Link } from "wouter";

function LoadingDashboard() {
  return (
    <div className="min-h-[70vh] bg-[#f7f4ec] p-5 md:p-8" aria-busy="true" aria-label="正在整理成長數據">
      <div className="mx-auto max-w-6xl space-y-5">
        <div className="h-7 w-44 animate-pulse bg-[#d7d0c2]" />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => <div key={index} className="h-32 animate-pulse border border-[#d7d0c2] bg-[#ece7dc]" />)}
        </div>
        <div className="h-72 animate-pulse border border-[#d7d0c2] bg-[#ece7dc]" />
      </div>
    </div>
  );
}

export default function GrowthDashboard() {
  const { data, isLoading, isError, refetch } = trpc.stats.growth.useQuery(undefined, { staleTime: 60_000 });

  if (isLoading) return <DashboardLayout><LoadingDashboard /></DashboardLayout>;

  if (isError || !data) {
    return (
      <DashboardLayout>
        <section className="min-h-[70vh] bg-[#f7f4ec] px-5 py-16 text-[#14263a] md:px-8" aria-labelledby="growth-dashboard-error-title">
          <div className="mx-auto max-w-xl border border-[#d7d0c2] bg-[#fcfaf4] p-7 shadow-[8px_8px_0_#e7dfd1]">
            <p className="font-mono text-[11px] tracking-[0.18em] text-[#a54934]">ARCHIVE / DATA INDEX</p>
            <h1 id="growth-dashboard-error-title" className="mt-4 font-serif text-3xl">暫時無法整理這份索引。</h1>
            <p className="mt-3 leading-7 text-[#4f5d67]">不會顯示任何原始日記內容。你可以重新嘗試，或回到成長史繼續編輯。</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button type="button" onClick={() => void refetch()} className="rounded-none bg-[#14263a] text-white hover:bg-[#243b54]"><RefreshCw className="mr-2 size-4" />重新整理</Button>
              <Link href="/editor" className="inline-flex items-center border border-[#14263a] px-4 py-2 text-sm font-medium transition-colors hover:bg-[#14263a] hover:text-white"><ArrowLeft className="mr-2 size-4" />回到成長史</Link>
            </div>
          </div>
        </section>
      </DashboardLayout>
    );
  }

  const { summary, monthlyDensity, phaseDensity, keywords } = data;
  const hasEntries = summary.privateEventCount > 0;
  const summaryCards = [
    { label: "私有事件", value: summary.privateEventCount, note: "僅計入 private 範圍", icon: ScrollText },
    { label: "寫作日", value: summary.writingDayCount, note: "不同日期去重後計算", icon: CalendarDays },
    { label: "最近連續", value: describeCurrentStreak(summary.recentStreak), note: `最長曾連續 ${summary.longestStreak} 天`, icon: Flame },
    { label: "最近一筆", value: formatDashboardDate(summary.lastRecordedAt), note: `開始於 ${formatDashboardDate(summary.firstRecordedAt)}`, icon: BarChart3 },
  ];

  return (
    <DashboardLayout>
      <div className="min-h-[calc(100vh-2rem)] bg-[#f7f4ec] text-[#14263a] md:min-h-[calc(100vh-4rem)]">
        <header className="border-b border-[#d7d0c2] px-5 py-8 md:px-8 md:py-10">
          <div className="mx-auto flex max-w-6xl flex-col justify-between gap-5 lg:flex-row lg:items-end">
            <div>
              <p className="font-mono text-[11px] tracking-[0.18em] text-[#a54934]">ARCHIVE / GROWTH INDEX</p>
              <h1 className="mt-3 font-serif text-4xl leading-none tracking-tight md:text-5xl">成長數據索引</h1>
              <p className="mt-4 max-w-2xl leading-7 text-[#4f5d67]">從你標為私有的事件中，整理時間密度、重複出現的主題與書寫節奏。這裡不顯示日記正文、照片或地點。</p>
            </div>
            <Link href="/editor" className="inline-flex w-fit items-center border-b border-[#14263a] pb-1 text-sm font-medium transition-colors hover:border-[#ee623b] hover:text-[#a54934]"><ArrowLeft className="mr-2 size-4" />回到成長史</Link>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-5 py-7 md:px-8 md:py-9">
          <section aria-label="成長摘要" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {summaryCards.map(({ label, value, note, icon: Icon }) => (
              <article key={label} className="min-h-36 border border-[#d7d0c2] bg-[#fcfaf4] p-5 shadow-[4px_4px_0_#e7dfd1]">
                <div className="flex items-start justify-between gap-3"><p className="font-mono text-[11px] tracking-[0.14em] text-[#64717c]">{label}</p><Icon className="size-4 text-[#a54934]" aria-hidden="true" /></div>
                <p className="mt-5 break-words font-serif text-3xl leading-tight">{value}</p>
                <p className="mt-2 text-xs leading-5 text-[#64717c]">{note}</p>
              </article>
            ))}
          </section>

          {!hasEntries ? (
            <section className="mt-7 border border-dashed border-[#bfb5a4] bg-[#fcfaf4] px-6 py-14 text-center" aria-labelledby="growth-dashboard-empty-title">
              <p className="font-mono text-[11px] tracking-[0.18em] text-[#a54934]">NO PRIVATE ENTRIES YET</p>
              <h2 id="growth-dashboard-empty-title" className="mt-4 font-serif text-3xl">先留下一段只給自己的紀錄。</h2>
              <p className="mx-auto mt-3 max-w-lg leading-7 text-[#4f5d67]">建立 private 事件後，這裡會從資料庫重新聚合你的時間密度、關鍵字與連續紀錄；公開或連結分享的事件不會納入。</p>
              <Link href="/editor" className="mt-7 inline-flex items-center bg-[#ee623b] px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-[#c84f30]">前往建立事件</Link>
            </section>
          ) : (
            <div className="mt-7 grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(18rem,0.8fr)]">
              <section className="border border-[#d7d0c2] bg-[#fcfaf4] p-5 md:p-6" aria-labelledby="monthly-density-title">
                <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
                  <div><p className="font-mono text-[11px] tracking-[0.14em] text-[#a54934]">MONTHLY DENSITY</p><h2 id="monthly-density-title" className="mt-2 font-serif text-2xl">每月留下幾個節點</h2></div>
                  <p className="text-xs text-[#64717c]">依事件日期分組</p>
                </div>
                <div className="mt-5 h-64" role="img" aria-label="私有事件的每月紀錄密度圖">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={monthlyDensity} margin={{ top: 12, right: 12, left: -22, bottom: 0 }}>
                      <defs><linearGradient id="densityFill" x1="0" x2="0" y1="0" y2="1"><stop offset="5%" stopColor="#ee623b" stopOpacity={0.36} /><stop offset="95%" stopColor="#ee623b" stopOpacity={0.03} /></linearGradient></defs>
                      <CartesianGrid vertical={false} stroke="#e3dccc" strokeDasharray="2 4" />
                      <XAxis dataKey="month" tickFormatter={formatDashboardMonth} tick={{ fill: "#64717c", fontSize: 11 }} tickLine={false} axisLine={false} minTickGap={38} />
                      <YAxis allowDecimals={false} tick={{ fill: "#64717c", fontSize: 11 }} tickLine={false} axisLine={false} />
                      <Tooltip labelFormatter={(label) => formatDashboardMonth(String(label))} formatter={(value) => [`${Number(value)} 個事件`, "紀錄"]} contentStyle={{ borderRadius: 0, border: "1px solid #d7d0c2", background: "#fcfaf4", color: "#14263a" }} />
                      <Area type="monotone" dataKey="count" stroke="#ee623b" strokeWidth={2} fill="url(#densityFill)" activeDot={{ r: 4, strokeWidth: 0, fill: "#14263a" }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </section>

              <section className="border border-[#d7d0c2] bg-[#fcfaf4] p-5 md:p-6" aria-labelledby="phase-density-title">
                <p className="font-mono text-[11px] tracking-[0.14em] text-[#a54934]">LIFE PHASES</p>
                <h2 id="phase-density-title" className="mt-2 font-serif text-2xl">事件落在哪一章</h2>
                <ol className="mt-6 space-y-5">
                  {phaseDensity.map((phase) => {
                    const width = `${Math.max(8, Math.round((phase.count / summary.privateEventCount) * 100))}%`;
                    return <li key={phase.key}>
                      <div className="flex items-end justify-between gap-3"><div><p className="font-medium">{phase.label}</p><p className="mt-0.5 font-mono text-[10px] tracking-[0.1em] text-[#64717c]">{phase.yearRange ?? "年份待補"}</p></div><span className="font-serif text-2xl">{phase.count}</span></div>
                      <div className="mt-2 h-1.5 overflow-hidden bg-[#e7dfd1]"><div className="h-full bg-[#14263a]" style={{ width }} /></div>
                    </li>;
                  })}
                </ol>
              </section>

              <section className="border border-[#d7d0c2] bg-[#fcfaf4] p-5 md:p-6 xl:col-span-2" aria-labelledby="keyword-index-title">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><p className="font-mono text-[11px] tracking-[0.14em] text-[#a54934]">KEYWORD INDEX</p><h2 id="keyword-index-title" className="mt-2 font-serif text-2xl">反覆出現的關鍵字</h2></div><p className="max-w-md text-xs leading-5 text-[#64717c]">來自每筆私有事件的「階段關鍵字」欄位；這不是對日記正文的語意分析。</p></div>
                {keywords.length ? <ol className="mt-6 flex flex-wrap gap-2" aria-label="階段關鍵字頻率">{keywords.map((keyword) => <li key={keyword.label} className="border border-[#c8bdab] bg-[#f7f4ec] px-3 py-2"><span className="inline-flex items-center text-sm"><Hash className="mr-1 size-3 text-[#a54934]" aria-hidden="true" />{keyword.label}</span><span className="ml-2 font-mono text-xs text-[#64717c]">{keyword.count}</span></li>)}</ol> : <p className="mt-6 border-l-2 border-[#ee623b] pl-4 leading-7 text-[#4f5d67]">目前還沒有填寫階段關鍵字。你可在編輯事件時，用幾個短詞記下當時最重要的主題。</p>}
              </section>
            </div>
          )}
        </main>
      </div>
    </DashboardLayout>
  );
}
