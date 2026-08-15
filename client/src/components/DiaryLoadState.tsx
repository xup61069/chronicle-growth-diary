import { Archive, Loader2, RefreshCw } from "lucide-react";
import React from "react";

type DiaryLoadStateProps =
  | { status: "loading" }
  | { status: "error"; timedOut: boolean; onRetry: () => void };

export function DiaryLoadState(props: DiaryLoadStateProps) {
  if (props.status === "loading") {
    return <div className="editor-loading"><Loader2 size={24} className="animate-spin" /> 正在開啟你的成長檔案…</div>;
  }

  return (
    <div className="editor-error">
      <Archive size={24} />
      <p>{props.timedOut ? "讀取時間超過預期，可能是登入工作階段或網路連線已失效。" : "暫時無法讀取你的成長檔案。"}</p>
      <div>
        <button type="button" onClick={props.onRetry}><RefreshCw size={14} /> 重新嘗試</button>
        <button type="button" className="editor-error-reload" onClick={() => window.location.reload()}>重新載入頁面</button>
      </div>
    </div>
  );
}
