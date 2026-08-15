/** Design reminder — a generous public reading surface that reveals only explicitly shared memories. */
import { trpc } from "@/lib/trpc";
import { Archive, CalendarDays, LockKeyhole, MapPin, Share2 } from "lucide-react";
import { useRoute } from "wouter";

function formatDate(timestamp: number, precision: "day" | "month" | "year") {
  const date = new Date(timestamp);
  if (precision === "year") return `${date.getFullYear()} 年`;
  if (precision === "month") return `${date.getFullYear()} 年 ${date.getMonth() + 1} 月`;
  return new Intl.DateTimeFormat("zh-TW", { year: "numeric", month: "long", day: "numeric" }).format(date);
}

export default function SharedStory() {
  const [, params] = useRoute("/story/:slug");
  const token = new URLSearchParams(window.location.search).get("token") ?? undefined;
  const slug = params?.slug ?? "";
  const { data, isLoading } = trpc.share.get.useQuery({ slug, token }, { enabled: Boolean(slug) });

  if (isLoading) return <main className="shared-loading"><Archive size={25} /> 正在開啟這段成長故事…</main>;

  if (!data) {
    return <main className="shared-lock"><LockKeyhole size={26} /><h1>這段故事目前無法閱覽</h1><p>它可能仍是私人檔案，或分享連結已經更新。</p></main>;
  }

  return (
    <main className="shared-story">
      <header className="shared-hero">
        <a className="shared-brand" href="/">CHRONICLE</a>
        <p><span /> 分享的成長故事</p>
        <h1>{data.diary.title}</h1>
        <div className="shared-hero-meta"><span><Share2 size={14} /> {data.events.length} 個公開事件</span><span>{data.diary.shareMode === "link" ? "私密連結閱覽" : "公開閱覽"}</span></div>
      </header>

      <section className="shared-phase-list" aria-label="人生階段">
        {data.lifePhases.map((phase) => <article key={phase.key}><span>{phase.yearRange ?? "時間待補"}</span><h2>{phase.label}</h2><p>{phase.note}</p><b>{phase.count.toString().padStart(2, "0")} 篇</b></article>)}
      </section>

      <section className="shared-events" aria-label="公開事件">
        {data.events.length === 0 ? <div className="shared-empty"><Archive size={22} /><p>這個故事尚未選擇任何公開事件。</p></div> : data.events.map((event) => (
          <article className="shared-event" key={event.id}>
            <div className="shared-event-date"><i style={{ backgroundColor: event.color }} /><span>{formatDate(event.occurredAt, event.datePrecision)}</span></div>
            <div className="shared-event-card">
              {event.media[0] ? <img src={event.media[0].url} alt={event.media[0].caption ?? event.title} /> : null}
              <p className="shared-event-type">{event.eventType} {event.ageLabel ? `/ ${event.ageLabel}` : ""}</p>
              <h2>{event.title}</h2>
              <p className="shared-event-body">{event.body}</p>
              {event.place ? <p className="shared-event-place"><MapPin size={13} /> {event.place}</p> : null}
              <div>{event.tags.map((tag) => <span key={tag.id}>{tag.name}</span>)}</div>
            </div>
          </article>
        ))}
      </section>
      <footer className="shared-footer"><CalendarDays size={15} /> 由 Chronicle 整理與分享</footer>
    </main>
  );
}
