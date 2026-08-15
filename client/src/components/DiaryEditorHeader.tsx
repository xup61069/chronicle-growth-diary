type DiaryEditorHeaderProps = {
  title: string;
  eventCountLabel: string;
  mediaCount: number;
};

export function DiaryEditorHeader({ title, eventCountLabel, mediaCount }: DiaryEditorHeaderProps) {
  return (
    <header className="editor-header">
      <div>
        <p className="editor-kicker"><span /> PERSONAL ARCHIVE / 01</p>
        <h1>{title}</h1>
        <p>將童年、學習、轉折與每一個值得記住的成就，編輯成一條只屬於你的時間帶。</p>
      </div>
      <div className="editor-stats" aria-label="成長日記統計">
        <span><b>{eventCountLabel}</b><small>已整理的故事</small></span>
        <span><b>{mediaCount.toString().padStart(2, "0")} 張</b><small>珍藏的影像</small></span>
      </div>
    </header>
  );
}
