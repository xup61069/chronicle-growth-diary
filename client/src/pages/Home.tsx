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
    title: "收集最早的線索",
    copy: "把文件、訪談與記憶先放到同一條可閱讀的線上。",
    number: "01",
  },
  {
    date: "18",
    month: "APR",
    year: "2024",
    category: "策展",
    title: "定義故事的節奏",
    copy: "用標籤與顏色區分脈絡，在重要轉折留下編輯記號。",
    number: "02",
  },
  {
    date: "02",
    month: "MAY",
    year: "2024",
    category: "專案",
    title: "讓團隊同步看見",
    copy: "從全貌切入，再向一個精準事件聚焦，討論不再失焦。",
    number: "03",
  },
  {
    date: "17",
    month: "MAY",
    year: "2024",
    category: "研究",
    title: "串起散落的證據",
    copy: "透過富媒體、連結與註解，把資料轉換成能被理解的序列。",
    number: "04",
  },
  {
    date: "31",
    month: "MAY",
    year: "2024",
    category: "策展",
    title: "發佈一條清晰的路徑",
    copy: "分享一個可探索的時間敘事，讓每位讀者自己找到關鍵。",
    number: "05",
  },
];

const examples = [
  {
    number: "01",
    type: "文化策展",
    title: "一座城市的聲音檔案",
    image: "/manus-storage/chronicle-example-museum_4849906d.jpg",
  },
  {
    number: "02",
    type: "專案紀錄",
    title: "從草圖到開幕的 180 天",
    image: "/manus-storage/chronicle-example-project_9ea5698d.jpg",
  },
  {
    number: "03",
    type: "研究敘事",
    title: "一種材料，三十年的變化",
    image: "/manus-storage/chronicle-example-orbit_ff92b973.jpg",
  },
];

const featureNotes = [
  ["A", "分層梳理", "把微小事件放入長期脈絡，並保留回到全景的路徑。"],
  ["B", "多種閱讀尺度", "以年、月、日自由切換；觀眾能由宏觀走向每一個細節。"],
  ["C", "分享你的脈絡", "用一個連結呈現完整歷程，讓資料不再只是靜態清單。"],
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

  return (
    <div className="chronicle-site">
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

      <main id="top">
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-index" aria-hidden="true">
            <span>CH</span>
            <span>01—24</span>
          </div>

          <div className="hero-copy">
            <p className="eyebrow"><span /> 時間敘事工作台</p>
            <h1 id="hero-title">把每一個轉折，<br /><em>留在正確的位置。</em></h1>
            <p className="hero-lede">
              Chronicle 將散落的事件、素材與決策編排成可探索的時間帶，
              讓脈絡不再埋沒於訊息與試算表。
            </p>
            <div className="hero-actions">
              <a className="solid-button" href="/editor">開始書寫成長故事 <ArrowUpRight size={17} /></a>
              <a className="text-button" href="#stories">觀看範例 <ChevronRight size={17} /></a>
            </div>
          </div>

          <button className="hero-workbench" onClick={scrollToTimeline} aria-label="前往完整互動時間工作台">
            <span className="workbench-top"><b>TIMEBOARD / LIVE</b><i>2024</i></span>
            <span className="workbench-months"><i>APR</i><i>MAY</i><i>JUN</i></span>
            <span className="workbench-axis"><i /><i /><i /><i /></span>
            <span className="workbench-events">
              <i><b>06</b><small>收集線索</small></i>
              <i className="focus"><b>02</b><small>定義節奏</small></i>
              <i><b>17</b><small>連結證據</small></i>
            </span>
            <span className="workbench-bottom"><GripHorizontal size={15} /> 拖曳探索完整路徑 <ArrowRight size={14} /></span>
          </button>

          <aside className="hero-side-note">
            <span>ARCHIVE NOTE / 001</span>
            <p>從第一份筆記到公開發表，時間本身就是最好的目錄。</p>
          </aside>
        </section>

        <section id="timeboard" className="timeboard" aria-labelledby="timeboard-title">
          <div className="timeboard-topline">
            <div>
              <p className="eyebrow inverted"><span /> 即時預覽</p>
              <h2 id="timeboard-title">拖曳時間帶，<br />從脈絡開始閱讀。</h2>
            </div>
            <div className="timeboard-instruction">
              <GripHorizontal size={18} />
              <span>可拖曳或使用<br />鍵盤左右鍵探索</span>
            </div>
          </div>

          <div className="timeline-controls">
            <div className="filter-set" aria-label="時間軸分類篩選">
              {filters.map((filter) => (
                <button
                  key={filter}
                  onClick={() => chooseFilter(filter)}
                  className={activeFilter === filter ? "active" : ""}
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
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerEnd}
            onPointerCancel={onPointerEnd}
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
            <p className="eyebrow"><span /> 不只是一份日期表</p>
            <h2 id="method-title">讓複雜進程，<br />有一個能被看懂的節奏。</h2>
            <p className="method-archive-note"><b>INDEX 02.1</b> 由年份、事件、人物與素材組成可追溯的閱讀軌跡。</p>
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
              <h2 id="stories-title">每一條時間帶，<br />都是一種新的閱讀方式。</h2>
            </div>
            <p>用於人物、組織、研究、展覽與專案。Chronicle 將資料變成一條能被分享、被討論、也被記住的路徑。</p>
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
            <p className="eyebrow"><span /> 從第一條開始</p>
            <h2 id="plans-title">把你的故事，<br /><em>編輯成一條路徑。</em></h2>
            <p>先從免費工作台開始；當你的敘事成長，再選擇需要的分享與協作尺度。</p>
            <div className="plan-ruler" aria-hidden="true"><span>YOUR ARCHIVE</span><i /><b>01</b><i /><b>02</b><i /><b>03</b><i /></div>
            <div className="plan-columns">
              <div className="plan-card plan-free">
                <span>INDIVIDUAL</span>
                <h3>自由編輯</h3>
                <p>適合個人研究與第一個公開故事。</p>
                <ul><li><Check size={15} /> 1 條時間帶</li><li><Check size={15} /> 50 個事件</li><li><Check size={15} /> 公開分享連結</li></ul>
                <a href="/editor">免費開始 <ArrowUpRight size={16} /></a>
              </div>
              <div className="plan-card plan-team">
                <span>STUDIO</span>
                <h3>共同編輯</h3>
                <p>適合團隊、專案與需要嵌入網站的敘事。</p>
                <ul><li><Check size={15} /> 多條時間帶</li><li><Check size={15} /> 成員協作與標註</li><li><Check size={15} /> 嵌入與品牌設定</li></ul>
                <a href="/editor">開啟我的檔案 <ArrowUpRight size={16} /></a>
              </div>
            </div>
          </div>
        </section>

        <section className="closing-note">
          <span className="closing-index">END NOTE / 2026</span>
          <div className="closing-symbol"><Sparkles size={20} /></div>
          <p>讓重要的事情，不再只停留在發生過。</p>
          <button onClick={scrollToTimeline}>回到時間帶 <ArrowUpRight size={17} /></button>
        </section>
      </main>

      <footer className="site-footer">
        <a className="brand" href="#top"><img src="/manus-storage/chronicle-mark_5e825172.png" alt="" /><span>CHRONICLE</span></a>
        <p>© 2026 Chronicle Studio. 為敘事而製。</p>
        <div><a href="#how-it-works">指南</a><a href="#stories">案例</a><a href="#plans">聯絡</a></div>
      </footer>
    </div>
  );
}
