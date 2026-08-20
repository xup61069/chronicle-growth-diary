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
  CalendarDays,
  Check,
  ChevronRight,
  Eye,
  FilePenLine,
  GripHorizontal,
  Layers3,
  Menu,
  MousePointer2,
  Plus,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import { startLogin } from "@/const";
import { isMobileMenuDismissKey, shouldHandleTimelineArrowKey } from "@/lib/homeNavigation";

type TimelineEvent = {
  date: string;
  month: string;
  year: string;
  isoDate: string;
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
    isoDate: "2024-04-06",
    category: "研究",
    title: "記下第一次自己回家的路",
    copy: "一張課表、一段錄音和那天的照片，先放在同一個日期。",
    number: "01",
  },
  {
    date: "18",
    month: "APR",
    year: "2024",
    isoDate: "2024-04-18",
    category: "策展",
    title: "把高中三年的練習排在一起",
    copy: "標記比賽、老師的批註和換樂器的那一週，回頭才看得見變化。",
    number: "02",
  },
  {
    date: "02",
    month: "MAY",
    year: "2024",
    isoDate: "2024-05-02",
    category: "專案",
    title: "第一份作品上線的下午",
    copy: "把草圖、版本紀錄與發表連結放在同一段時間裡。",
    number: "03",
  },
  {
    date: "17",
    month: "MAY",
    year: "2024",
    isoDate: "2024-05-17",
    category: "研究",
    title: "搬家後重新整理工作桌",
    copy: "桌面照片、設備清單和當時的工作習慣，留給未來比較。",
    number: "04",
  },
  {
    date: "31",
    month: "MAY",
    year: "2024",
    isoDate: "2024-05-31",
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
const sortOrders = ["oldest", "newest"] as const;
type TimelineSortOrder = (typeof sortOrders)[number];

const recentTimelineSuggestions = [...events]
  .sort((left, right) => right.isoDate.localeCompare(left.isoDate))
  .slice(0, 3);

export default function Home() {
  const [activeIndex, setActiveIndex] = useState(2);
  const [activeFilter, setActiveFilter] = useState<(typeof filters)[number]>("全部");
  const [selectedDate, setSelectedDate] = useState("");
  const [keywordQuery, setKeywordQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<TimelineSortOrder>("oldest");
  const [menuOpen, setMenuOpen] = useState(false);
  const dragStart = useRef<{ x: number; index: number } | null>(null);

  const visibleEvents = useMemo(() => {
    const normalizedKeyword = keywordQuery.trim().toLocaleLowerCase("zh-TW");
    const filteredEvents = events.filter((event) => {
      const searchableContent = `${event.title} ${event.copy} ${event.category} ${event.isoDate}`.toLocaleLowerCase("zh-TW");
      return (activeFilter === "全部" || event.category === activeFilter)
        && (!selectedDate || event.isoDate === selectedDate)
        && (!normalizedKeyword || searchableContent.includes(normalizedKeyword));
    });
    return [...filteredEvents].sort((left, right) => sortOrder === "newest"
      ? right.isoDate.localeCompare(left.isoDate)
      : left.isoDate.localeCompare(right.isoDate));
  }, [activeFilter, keywordQuery, selectedDate, sortOrder]);

  const selectedEvent = visibleEvents[activeIndex];

  useEffect(() => {
    setActiveIndex((current) => visibleEvents.length ? Math.min(current, visibleEvents.length - 1) : 0);
  }, [visibleEvents.length]);

  useEffect(() => {
    setActiveIndex(0);
  }, [activeFilter, keywordQuery, selectedDate, sortOrder]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (menuOpen) {
        if (isMobileMenuDismissKey(event.key)) setMenuOpen(false);
        return;
      }
      const target = event.target as HTMLElement | null;
      if (!shouldHandleTimelineArrowKey(event.key, target?.tagName, target?.isContentEditable)) return;
      if (!visibleEvents.length) return;
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

  const chooseDate = (date: string) => {
    setSelectedDate(date);
    setActiveIndex(0);
  };

  const clearTimelineFilters = () => {
    setActiveFilter("全部");
    setSelectedDate("");
    setKeywordQuery("");
    setSortOrder("oldest");
    setActiveIndex(0);
  };

  const showSuggestedEvent = (event: TimelineEvent) => {
    setActiveFilter("全部");
    setKeywordQuery("");
    setSortOrder("oldest");
    setSelectedDate(event.isoDate);
    setActiveIndex(0);
  };

  const stepTimeline = (direction: 1 | -1) => {
    if (!visibleEvents.length) return;
    setActiveIndex((current) =>
      Math.max(0, Math.min(visibleEvents.length - 1, current + direction)),
    );
  };

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!visibleEvents.length) return;
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
    if (!visibleEvents.length) return;

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
          <a href="#how-it-works" onClick={() => setMenuOpen(false)}>操作方式</a>
          <a href="#stories" onClick={() => setMenuOpen(false)}>範例</a>
          <a href="#plans" onClick={() => setMenuOpen(false)}>功能</a>
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
            開啟工作台 <ArrowUpRight size={15} />
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
            <p className="eyebrow"><span /> 個人事件時間帶</p>
            <h1 id="hero-title">用時間軸整理<br /><em>你的事件紀錄。</em></h1>
            <p className="hero-lede">
              集中管理日期、文字、圖片和標籤。內容預設只供本人檢視；
              需要時，再為個別事件設定分享範圍。
            </p>
            <div className="hero-actions">
              <a className="solid-button" href="/editor">建立事件 <ArrowUpRight size={17} /></a>
              <a className="text-button offline-note-link" href="/quick-note" aria-describedby="offline-note-guidance">離線紀錄 <FilePenLine size={16} /></a>
              <a className="text-button" href="#stories">查看範例 <ChevronRight size={17} /></a>
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
            <span className="workbench-bottom"><GripHorizontal size={15} /> 拖曳查看不同日期的事件 <ArrowRight size={14} /></span>
          </button>

          <aside className="hero-side-note">
            <span>ARCHIVE NOTE / 001</span>
            <p>可先建立一筆事件，再逐步補上日期、附件、標籤與說明。</p>
          </aside>
        </section>

        <section id="timeboard" className="timeboard" aria-labelledby="timeboard-title">
          <div className="timeboard-topline">
            <div>
              <p className="eyebrow inverted"><span /> 示範資料</p>
              <h2 id="timeboard-title">依日期排序事件，<br />查看相關內容。</h2>
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
            <div className="timeline-search-filter">
              <label htmlFor="timeline-keyword-query"><Search size={14} /> 搜尋</label>
              <input
                id="timeline-keyword-query"
                type="search"
                value={keywordQuery}
                onChange={(event) => setKeywordQuery(event.target.value)}
                placeholder="事件標題或內容"
                aria-label="搜尋示範事件內容"
              />
            </div>
            <div className="timeline-date-filter">
              <label htmlFor="timeline-date-query"><CalendarDays size={14} /> 日期</label>
              <input
                id="timeline-date-query"
                type="date"
                value={selectedDate}
                onChange={(event) => chooseDate(event.target.value)}
                aria-label="依日期篩選示範事件"
              />
            </div>
            <div className="timeline-sort-filter">
              <label htmlFor="timeline-date-sort">排序</label>
              <select id="timeline-date-sort" value={sortOrder} onChange={(event) => setSortOrder(event.target.value as TimelineSortOrder)} aria-label="事件日期排序">
                <option value="oldest">由舊到新</option>
                <option value="newest">由新到舊</option>
              </select>
            </div>
            {(selectedDate || activeFilter !== "全部" || keywordQuery || sortOrder !== "oldest") ? <button type="button" className="timeline-filter-clear" onClick={clearTimelineFilters}>清除</button> : null}
            <div className="arrow-set">
              <button aria-label="前一個事件" onClick={() => stepTimeline(-1)} disabled={!visibleEvents.length || activeIndex === 0}><ArrowLeft size={18} /></button>
              <button aria-label="下一個事件" onClick={() => stepTimeline(1)} disabled={!visibleEvents.length || activeIndex === visibleEvents.length - 1}><ArrowRight size={18} /></button>
            </div>
          </div>
          <p className="timeline-result-summary" role="status" aria-live="polite">顯示 {visibleEvents.length} 筆示範事件{keywordQuery.trim() ? `／關鍵字「${keywordQuery.trim()}」` : ""}{selectedDate ? `／${selectedDate}` : ""}{activeFilter !== "全部" ? `／${activeFilter}` : ""}{sortOrder === "newest" ? "／由新到舊" : "／由舊到新"}</p>

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
            {visibleEvents.length ? <div
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
            </div> : <div className="timeline-empty" role="status">
              <div className="timeline-empty-illustration" aria-hidden="true"><Search size={26} /><i /><i /></div>
              <p><strong>沒有符合的示範事件。</strong> 請調整關鍵字、日期或事件類型。</p>
              <button type="button" onClick={clearTimelineFilters}>清除篩選</button>
              <div className="timeline-suggestions" aria-label="近期示範事件建議">
                <span>近期事件</span>
                <div>{recentTimelineSuggestions.map((event) => <button type="button" key={event.number} onClick={() => showSuggestedEvent(event)}><small>{event.isoDate}</small>{event.title}</button>)}</div>
              </div>
            </div>}
          </div>

          {selectedEvent ? <div className="timeline-detail" aria-live="polite">
            <div className="detail-number">{selectedEvent.number}</div>
            <div className="detail-copy">
              <span>{selectedEvent.date} {selectedEvent.month} / {selectedEvent.year}</span>
              <h3>{selectedEvent.title}</h3>
              <p>{selectedEvent.copy}</p>
            </div>
            <a href="/editor">開啟工作台 <ArrowUpRight size={17} /></a>
          </div> : null}

          <div className="timeboard-scale" aria-hidden="true">
            <span>APR 2024</span><div /><span>MAY 2024</span><div /><span>JUN 2024</span>
          </div>
        </section>

        <section id="how-it-works" className="method-section" aria-labelledby="method-title">
          <div className="section-marker"><span>02</span><i /></div>
          <div className="method-intro">
            <p className="eyebrow"><span /> 操作流程</p>
            <h2 id="method-title">建立事件，補充資料，<br />再設定分享範圍。</h2>
            <p className="method-archive-note"><b>INDEX 02.1</b> 可從文字、圖片、日期或既有筆記開始；缺少的資訊可以之後再補。</p>
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
              <p className="eyebrow"><span /> 使用範例</p>
              <h2 id="stories-title">整理不同類型的事件紀錄。</h2>
            </div>
            <p>可用於成長日記、創作紀錄、學習過程或搬遷整理。公開內容與私人事件分開設定。</p>
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
            <p className="eyebrow"><span /> 功能範圍</p>
            <h2 id="plans-title">從建立事件開始。</h2>
            <p>建立事件、加入日期與標籤、設定可見範圍，並依需要輸出或分享。</p>
            <div className="plan-ruler" aria-hidden="true"><span>YOUR ARCHIVE</span><i /><b>01</b><i /><b>02</b><i /><b>03</b><i /></div>
            <div className="plan-columns">
              <div className="plan-card plan-free">
                <span>PERSONAL</span>
                <h3>個人紀錄</h3>
                <p>用於保存私人事件與補充資料。</p>
                <ul><li><Check size={15} /> 日期、圖片、標籤與技能</li><li><Check size={15} /> 人生階段與多軌分類</li><li><Check size={15} /> PDF、長圖片與 Markdown 匯出</li></ul>
                <a href="/editor">前往工作台 <ArrowUpRight size={16} /></a>
              </div>
              <div className="plan-card plan-team">
                <span>SHARING</span>
                <h3>分享設定</h3>
                <p>用於整理可公開或指定對象閱讀的內容。</p>
                <ul><li><Check size={15} /> 公開與私密連結</li><li><Check size={15} /> 封面與閱讀版型</li><li><Check size={15} /> 家庭事件反應</li></ul>
                <a href="/editor">管理分享設定 <ArrowUpRight size={16} /></a>
              </div>
            </div>
          </div>
        </section>

        <section className="closing-note">
          <span className="closing-index">END NOTE / 2026</span>
          <div className="closing-symbol"><Sparkles size={20} /></div>
          <p>事件會依日期保留在你的時間帶中。</p>
          <button onClick={scrollToTimeline}>查看時間帶 <ArrowUpRight size={17} /></button>
        </section>
      </main>

      <footer className="site-footer">
        <a className="brand" href="#top"><img src="/manus-storage/chronicle-mark_5e825172.png" alt="" /><span>CHRONICLE</span></a>
        <p>© 2026 Chronicle Studio. 個人事件時間帶工具。</p>
        <div><a href="#how-it-works">操作</a><a href="#stories">範例</a><a href="#plans">功能</a></div>
      </footer>
    </div>
  );
}
