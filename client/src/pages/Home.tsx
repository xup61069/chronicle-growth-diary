/**
 * Design reminder — 編集室時間帶：Swiss editorial composition, archival paper tactility,
 * deep ink + cinnabar accents, and time as the primary navigational structure.
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronRight,
  Eye,
  FilePenLine,
  GripHorizontal,
  Layers3,
  Menu,
  MousePointer2,
  Plus,
  Sparkles,
  X,
} from "lucide-react";
import { startLogin } from "@/const";
import { isMobileMenuDismissKey, shouldHandleTimelineArrowKey } from "@/lib/homeNavigation";

type TimelineEvent = {
  date: string;
  month: string;
  year: string;
  category: "策展" | "研究" | "專案";
  title: string;
  copy: string;
  number: string;
};

const events: TimelineEvent[] = [
  {
    date: "06",
    month: "APR",
    year: "2024",
    category: "研究",
    title: "記下第一次自己回家的路",
    copy: "一張課表、一段錄音和那天的照片，先放在同一個日期。",
    number: "01",
  },
  {
    date: "18",
    month: "APR",
    year: "2024",
    category: "策展",
    title: "把高中三年的練習排在一起",
    copy: "標記比賽、老師的批註和換樂器的那一週，回頭才看得見變化。",
    number: "02",
  },
  {
    date: "02",
    month: "MAY",
    year: "2024",
    category: "專案",
    title: "第一份作品上線的下午",
    copy: "把草圖、版本紀錄與發表連結放在同一段時間裡。",
    number: "03",
  },
  {
    date: "17",
    month: "MAY",
    year: "2024",
    category: "研究",
    title: "搬家後重新整理工作桌",
    copy: "桌面照片、設備清單和當時的工作習慣，留給未來比較。",
    number: "04",
  },
  {
    date: "31",
    month: "MAY",
    year: "2024",
    category: "策展",
    title: "寄出第一封作品集",
    copy: "只分享想公開的頁面，其餘事件留在私人時間帶。",
    number: "05",
  },
];

const examples = [
  {
    number: "01",
    type: "成長日記",
    title: "從第一張課表到畢業照",
    image: "/manus-storage/chronicle-example-museum_4849906d.jpg",
  },
  {
    number: "02",
    type: "作品紀錄",
    title: "一份作品從草圖到發表",
    image: "/manus-storage/chronicle-example-project_9ea5698d.jpg",
  },
  {
    number: "03",
    type: "練習筆記",
    title: "三十次練習留下的改變",
    image: "/manus-storage/chronicle-example-orbit_ff92b973.jpg",
  },
];

const featureNotes = [
  ["A", "先寫下當天發生的事", "加上日期、幾句話和一張照片；不用先替它下結論。"],
  ["B", "把同一段日子放在一起", "用標籤、技能和章節把分散的事件排回時間帶。"],
  ["C", "決定要給誰看", "每一則事件可留在私有日記，也可在整理後再用連結分享。"],
];

const filters = ["全部", "研究", "策展", "專案"] as const;

export default function Home() {
  const [activeIndex, setActiveIndex] = useState(2);
  const [activeFilter, setActiveFilter] = useState<(typeof filters)[number]>("全部");
  const [menuOpen, setMenuOpen] = useState(false);
  const dragStart = useRef<{ x: number; index: number } | null>(null);

  const visibleEvents = useMemo(
    () =>
      activeFilter === "全部"
        ? events
        : events.filter((event) => event.category === activeFilter),
    [activeFilter],
  );

  const selectedEvent = visibleEvents[Math.min(activeIndex, visibleEvents.length - 1)] ?? events[0];

  useEffect(() => {
    setActiveIndex((current) => Math.min(current, visibleEvents.length - 1));
  }, [visibleEvents.length]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (menuOpen) {
        if (isMobileMenuDismissKey(event.key)) setMenuOpen(false);
        return;
      }
      const target = event.target as HTMLElement | null;
      if (!shouldHandleTimelineArrowKey(event.key, target?.tagName, target?.isContentEditable)) return;
      if (event.key === "ArrowLeft") {
        setActiveIndex((current) => Math.max(0, current - 1));
      }
      if (event.key === "ArrowRight") {
        setActiveIndex((current) => Math.min(visibleEvents.length - 1, current + 1));
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [menuOpen, visibleEvents.length]);

  const scrollToTimeline = () => {
    document.querySelector("#timeboard")?.scrollIntoView({ behavior: "smooth" });
  };

  const chooseFilter = (filter: (typeof filters)[number]) => {
    setActiveFilter(filter);
    setActiveIndex(0);
  };

  const stepTimeline = (direction: 1 | -1) => {
    setActiveIndex((current) =>
      Math.max(0, Math.min(visibleEvents.length - 1, current + direction)),
    );
  };

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    dragStart.current = { x: event.clientX, index: activeIndex };
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStart.current) return;
    const steps = Math.round((dragStart.current.x - event.clientX) / 130);
    if (steps !== 0) {
      setActiveIndex(
        Math.max(0, Math.min(visibleEvents.length - 1, dragStart.current.index + steps)),
      );
    }
  };

  const onPointerEnd = () => {
    dragStart.current = null;
  };

  const onTimelineViewportKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement | null;
    if (!shouldHandleTimelineArrowKey(event.key, target?.tagName, target?.isContentEditable)) return;

    event.preventDefault();
    event.stopPropagation();
    stepTimeline(event.key === "ArrowLeft" ? -1 : 1);
  };

  const focusMainContent = () => {
    window.requestAnimationFrame(() => document.getElementById("main-content")?.focus());
  };

  return (
    <div id="top" className="chronicle-site">
      <a className="skip-link" href="#main-content" onClick={focusMainContent}>跳至主要內容</a>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="Chronicle 首頁">
          <img src="/manus-storage/chronicle-mark_5e825172.png" alt="" />
          <span>CHRONICLE</span>
        </a>

        <nav id="primary-navigation" className={`desktop-nav ${menuOpen ? "is-open" : ""}`} aria-label="主要導覽">
          <a href="#how-it-works" onClick={() => setMenuOpen(false)}>如何運作</a>
          <a href="#stories" onClick={() => setMenuOpen(false)}>故事案例</a>
          <a href="#plans" onClick={() => setMenuOpen(false)}>方案</a>
          <button
            type="button"
            className="nav-login"
            onClick={() => {
              setMenuOpen(false);
              startLogin();
            }}
          >
            登入
          </button>
          <a className="nav-cta" href="/editor" onClick={() => setMenuOpen(false)}>
            開始建立 <ArrowUpRight size={15} />
          </a>
        </nav>

        <button
          type="button"
          className="mobile-menu"
          aria-label={menuOpen ? "關閉選單" : "開啟選單"}
          aria-controls="primary-navigation"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? <X size={21} /> : <Menu size={21} />}
        </button>
      </header>

      <main id="main-content" tabIndex={-1}>
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-index" aria-hidden="true">
            <span>CH</span>
            <span>01—24</span>
          </div>

          <div className="hero-copy">
            <p className="eyebrow"><span /> 個人成長日記</p>
            <h1 id="hero-title">把今天發生的事，<br /><em>留給以後的你。</em></h1>
            <p className="hero-lede">
              例如第一份作品、換工作的那個月，或一張陪你長大的書桌。
              Chronicle 把日期、文字、圖片和標籤放在同一條私人時間帶。
            </p>
            <div className="hero-actions">
              <a className="solid-button" href="/editor">寫下第一件事 <ArrowUpRight size={17} /></a>
              <a className="text-button offline-note-link" href="/quick-note" aria-describedby="offline-note-guidance">先用離線快速記事 <FilePenLine size={16} /></a>
              <a className="text-button" href="#stories">觀看範例 <ChevronRight size={17} /></a>
            </div>
            <p id="offline-note-guidance" className="hero-offline-note">離線草稿只保存在目前裝置；準備好後可複製並整理成正式事件。</p>
          </div>

          <button className="hero-workbench" onClick={scrollToTimeline} aria-label="前往完整互動時間工作台">
            <span className="workbench-top"><b>TIMEBOARD / LIVE</b><i>2024</i></span>
            <span className="workbench-months"><i>APR</i><i>MAY</i><i>JUN</i></span>
            <span className="workbench-axis"><i /><i /><i /><i /></span>
            <span className="workbench-events">
              <i><b>06</b><small>第一張課表</small></i>
              <i className="focus"><b>02</b><small>第一份作品</small></i>
              <i><b>17</b><small>搬進新家</small></i>
            </span>
            <span className="workbench-bottom"><GripHorizontal size={15} /> 拖曳查看同一段日子的變化 <ArrowRight size={14} /></span>
          </button>

          <aside className="hero-side-note">
            <span>ARCHIVE NOTE / 001</span>
            <p>第一張課表、第一份作品、第一次搬家；不用一次寫完，只要先記下一天。</p>
          </aside>
        </section>

        <section id="timeboard" className="timeboard" aria-labelledby="timeboard-title">
          <div className="timeboard-topline">
            <div>
              <p className="eyebrow inverted"><span /> 即時預覽</p>
              <h2 id="timeboard-title">拖曳時間帶，<br />查看同一段日子的變化。</h2>
            </div>
            <div id="timeboard-instruction" className="timeboard-instruction">
              <GripHorizontal size={18} />
              <span>可拖曳；聚焦時間帶後<br />可用鍵盤左右鍵探索</span>
            </div>
          </div>

          <div className="timeline-controls">
            <div className="filter-set" aria-label="時間軸分類篩選">
              {filters.map((filter) => (
                <button
                  key={filter}
                  onClick={() => chooseFilter(filter)}
                  className={activeFilter === filter ? "active" : ""}
                  aria-pressed={activeFilter === filter}
                >
                  {filter}
                </button>
              ))}
            </div>
            <div className="arrow-set">
              <button aria-label="前一個事件" onClick={() => stepTimeline(-1)} disabled={activeIndex === 0}><ArrowLeft size={18} /></button>
              <button aria-label="下一個事件" onClick={() => stepTimeline(1)} disabled={activeIndex === visibleEvents.length - 1}><ArrowRight size={18} /></button>
            </div>
          </div>

          <div
            className="timeline-viewport"
            role="region"
            aria-label="互動時間帶"
            aria-describedby="timeboard-instruction"
            tabIndex={0}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerEnd}
            onPointerCancel={onPointerEnd}
            onKeyDown={onTimelineViewportKeyDown}
          >
            <div
              className="timeline-track"
              style={{ transform: `translateX(${-Math.max(0, activeIndex - 1) * 202}px)` }}
            >
              {visibleEvents.map((event, index) => (
                <button
                  className={`timeline-event ${index === activeIndex ? "is-active" : ""}`}
                  key={`${event.number}-${event.title}`}
                  onClick={() => setActiveIndex(index)}
                  aria-label={`選擇${event.date} ${event.month}的事件：${event.title}`}
                >
                  <span className="event-date">{event.date}<small>{event.month}</small></span>
                  <span className="event-wire"><i /></span>
                  <span className="event-preview"><b>{event.category}</b>{event.title}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="timeline-detail" aria-live="polite">
            <div className="detail-number">{selectedEvent.number}</div>
            <div className="detail-copy">
              <span>{selectedEvent.date} {selectedEvent.month} / {selectedEvent.year}</span>
              <h3>{selectedEvent.title}</h3>
              <p>{selectedEvent.copy}</p>
            </div>
            <a href="/editor">開啟工作台 <ArrowUpRight size={17} /></a>
          </div>

          <div className="timeboard-scale" aria-hidden="true">
            <span>APR 2024</span><div /><span>MAY 2024</span><div /><span>JUN 2024</span>
          </div>
        </section>

        <section id="how-it-works" className="method-section" aria-labelledby="method-title">
          <div className="section-marker"><span>02</span><i /></div>
          <div className="method-intro">
            <p className="eyebrow"><span /> 從一則小事開始</p>
            <h2 id="method-title">不是替人生下結論，<br />只是把日期放回事情旁邊。</h2>
            <p className="method-archive-note"><b>INDEX 02.1</b> 從一張照片、一段心情或一個完成的作品開始，再慢慢補上前後的日子。</p>
          </div>
          <div className="method-list">
            {featureNotes.map(([letter, title, copy]) => (
              <article className="method-item" key={letter}>
                <span>{letter}</span>
                <div><h3>{title}</h3><p>{copy}</p></div>
                <ArrowUpRight size={19} />
              </article>
            ))}
          </div>
        </section>

        <section id="stories" className="stories-section" aria-labelledby="stories-title">
          <div className="stories-heading">
            <div>
              <p className="eyebrow"><span /> 使用情境</p>
              <h2 id="stories-title">可以從一個人開始寫。</h2>
            </div>
            <p>把自己的成長日記、創作過程或一次長途搬遷整理成時間帶。等你想分享時，再決定哪些事件要讓別人看見。</p>
          </div>

          <div className="story-ruler" aria-hidden="true"><span>STORY INDEX</span><i /><b>01</b><i /><b>02</b><i /><b>03</b></div>

          <div className="story-grid">
            {examples.map((example, index) => (
              <article className={`story-card story-${index + 1}`} key={example.number}>
                <div className="story-image-wrap"><img src={example.image} alt="" loading="lazy" decoding="async" /></div>
                <div className="story-meta"><span>{example.number} / {example.type}</span><ArrowUpRight size={18} /></div>
                <h3>{example.title}</h3>
                <a className="story-link" href="/editor">查看時間帶 <ChevronRight size={16} /></a>
              </article>
            ))}
          </div>
        </section>

        <section id="plans" className="plan-section" aria-labelledby="plans-title">
          <div className="plan-art" aria-hidden="true"><img src="/manus-storage/chronicle-hero-archive_9be1bd7c.jpg" alt="" /></div>
          <div className="plan-content">
            <p className="eyebrow"><span /> 從一則紀錄開始</p>
            <h2 id="plans-title">先寫下今天，<br /><em>再慢慢看見時間。</em></h2>
            <p>建立事件、加上日期和標籤。要不要分享、何時整理成一條故事，都由你決定。</p>
            <div className="plan-ruler" aria-hidden="true"><span>YOUR ARCHIVE</span><i /><b>01</b><i /><b>02</b><i /><b>03</b><i /></div>
            <div className="plan-columns">
              <div className="plan-card plan-free">
                <span>INDIVIDUAL</span>
                <h3>個人整理</h3>
                <p>適合私人日記與正在累積的成長事件。</p>
                <ul><li><Check size={15} /> 1 條時間帶</li><li><Check size={15} /> 50 個事件</li><li><Check size={15} /> 公開分享連結</li></ul>
                <a href="/editor">免費開始 <ArrowUpRight size={16} /></a>
              </div>
              <div className="plan-card plan-team">
                <span>STUDIO</span>
                <h3>分享與協作</h3>
                <p>適合整理後想分享給家人或夥伴的故事。</p>
                <ul><li><Check size={15} /> 多條時間帶</li><li><Check size={15} /> 成員協作與標註</li><li><Check size={15} /> 嵌入與品牌設定</li></ul>
                <a href="/editor">開啟我的檔案 <ArrowUpRight size={16} /></a>
              </div>
            </div>
          </div>
        </section>

        <section className="closing-note">
          <span className="closing-index">END NOTE / 2026</span>
          <div className="closing-symbol"><Sparkles size={20} /></div>
          <p>留下一個日期，讓以後的你知道它曾經發生。</p>
          <button onClick={scrollToTimeline}>回到時間帶 <ArrowUpRight size={17} /></button>
        </section>
      </main>

      <footer className="site-footer">
        <a className="brand" href="#top"><img src="/manus-storage/chronicle-mark_5e825172.png" alt="" /><span>CHRONICLE</span></a>
        <p>© 2026 Chronicle Studio. 為個人成長日記而製。</p>
        <div><a href="#how-it-works">指南</a><a href="#stories">案例</a><a href="#plans">聯絡</a></div>
      </footer>
    </div>
  );
}
