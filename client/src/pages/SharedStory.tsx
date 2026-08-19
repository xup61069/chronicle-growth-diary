/** Design reminder — a generous public reading surface that reveals only explicitly shared memories. */
import { trpc } from "@/lib/trpc";
import { formatCapsuleCountdown, getTimeCapsuleStatus } from "@/lib/lifeProgress";
import { Archive, CalendarDays, LockKeyhole, MapPin, Share2 } from "lucide-react";
import React, { FormEvent, useState } from "react";
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
  const [password, setPassword] = useState("");
  const [submittedPassword, setSubmittedPassword] = useState<string | undefined>();
  const { data, isLoading } = trpc.share.get.useQuery({ slug, token, password: submittedPassword }, { enabled: Boolean(slug) });

  const submitPassword = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmittedPassword(password);
  };

  if (isLoading) return <main className="shared-loading"><Archive size={25} /> 正在開啟這段成長故事…</main>;

  if (!data || data.status === "not_found" || data.status === "locked") {
    return <main className="shared-lock"><LockKeyhole size={26} /><h1>這段故事目前無法閱覽</h1><p>它可能仍是私人檔案，或分享連結已經更新。</p></main>;
  }

  if (data.status === "expired") {
    return <main className="shared-lock"><CalendarDays size={26} /><h1>這條分享連結已到期</h1><p>請向故事擁有者索取新的分享連結。</p></main>;
  }

  if (data.status === "password_required" || data.status === "password_invalid") {
    return <main className="shared-lock shared-password"><LockKeyhole size={26} /><h1>這段故事需要密碼</h1><p>{data.status === "password_invalid" ? "密碼不正確，請再試一次。" : "請輸入故事擁有者提供的密碼後繼續閱讀。"}</p><form onSubmit={submitPassword}><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="輸入分享密碼" autoFocus /><button type="submit">開啟故事</button></form></main>;
  }

  return (
    <main className={`shared-story shared-layout-${data.diary.publicStoryLayout}`}>
      <header className="shared-hero">
        {data.diary.publicCoverUrl ? <img className="shared-hero-cover" src={data.diary.publicCoverUrl} alt={`${data.diary.publicCoverTitle ?? data.diary.title} 的故事封面`} /> : null}
        <div className="shared-hero-copy">
          <a className="shared-brand" href="/">CHRONICLE</a>
          <p><span /> 分享的成長故事</p>
          <h1>{data.diary.publicCoverTitle || data.diary.title}</h1>
          {data.diary.subtitle ? <p className="shared-subtitle">{data.diary.subtitle}</p> : null}
          <div className="shared-hero-meta"><span><Share2 size={14} /> {data.events.length} 個公開事件</span><span>{data.diary.shareMode === "link" ? "私密連結閱覽" : "公開閱覽"}</span></div>
        </div>
      </header>

      <section className="shared-phase-list" aria-label="人生階段">
        {data.lifePhases.map((phase) => <article key={phase.key}><span>{phase.yearRange ?? "時間待補"}</span><h2>{phase.label}</h2><p>{phase.note}</p><b>{phase.count.toString().padStart(2, "0")} 篇</b></article>)}
      </section>

      <section className="shared-events" aria-label="公開事件">
        {data.events.length === 0 ? <div className="shared-empty"><Archive size={22} /><p>這個故事尚未選擇任何公開事件。</p></div> : data.events.map((event) => (
          <article className="shared-event" key={event.id}>
            <div className="shared-event-date"><i style={{ backgroundColor: event.color }} /><span>{formatDate(event.occurredAt, event.datePrecision)}</span></div>
            <div className={`shared-event-card ${event.isTimeCapsuleLocked ? "shared-capsule-locked" : ""}`}>
              {event.isTimeCapsuleLocked ? <section className="shared-capsule-notice"><LockKeyhole size={21} /><p>TIME CAPSULE / SEALED</p><h2>這段記憶仍在等待解鎖。</h2><strong>{formatCapsuleCountdown(getTimeCapsuleStatus(event.unlocksAt).daysRemaining)}</strong><span>預計於 {new Date(event.unlocksAt!).toLocaleDateString("zh-TW", { year: "numeric", month: "long", day: "numeric" })} 開啟</span></section> : null}
              {event.media.length ? <div className={`shared-event-media media-count-${Math.min(event.media.length, 4)}`}>{event.media.map((media) => <figure key={media.id}><img src={media.url} alt={media.caption ?? event.title} />{media.caption ? <figcaption>{media.caption}</figcaption> : null}</figure>)}</div> : null}
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
