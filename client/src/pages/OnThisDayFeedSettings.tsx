import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { CalendarHeart, Copy, RefreshCw, ShieldOff } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

export default function OnThisDayFeedSettings() {
  const utils = trpc.useUtils();
  const [feedUrl, setFeedUrl] = useState<string | null>(null);
  const [expiryPolicy, setExpiryPolicy] = useState<"30" | "90" | "365" | "none">("90");
  const status = trpc.diary.getOnThisDayFeedStatus.useQuery();
  const rotate = trpc.diary.rotateOnThisDayFeed.useMutation({
    onSuccess: async ({ token }) => {
      setFeedUrl(
        `${window.location.origin}/api/feeds/on-this-day/${token}.ics`
      );
      await utils.diary.getOnThisDayFeedStatus.invalidate();
      toast.success("已產生新訂閱 URL；舊 URL 已立即失效。");
    },
    onError: error => toast.error(error.message),
  });
  const revoke = trpc.diary.revokeOnThisDayFeed.useMutation({
    onSuccess: async () => {
      setFeedUrl(null);
      await utils.diary.getOnThisDayFeedStatus.invalidate();
      toast.success("訂閱 URL 已撤銷。");
    },
    onError: error => toast.error(error.message),
  });
  const createdAt = useMemo(
    () =>
      status.data?.createdAt
        ? new Date(status.data.createdAt).toLocaleString("zh-TW")
        : null,
    [status.data?.createdAt]
  );
  const expiresAt = useMemo(
    () =>
      status.data?.expiresAt
        ? new Date(status.data.expiresAt).toLocaleString("zh-TW")
        : null,
    [status.data?.expiresAt]
  );
  const rotateWithExpiry = () => {
    const days = expiryPolicy === "none" ? null : Number(expiryPolicy);
    rotate.mutate({
      expiresAt: days ? Date.now() + days * 24 * 60 * 60 * 1000 : null,
    });
  };

  return (
    <DashboardLayout>
      <section
        className="mx-auto max-w-3xl space-y-6 py-3"
        aria-labelledby="on-this-day-feed-heading"
      >
        <header className="space-y-2 border-b border-border pb-5">
          <p className="font-mono text-xs tracking-[0.14em] text-muted-foreground">
            OWNER SETTINGS / PRIVATE FEED
          </p>
          <h1
            id="on-this-day-feed-heading"
            className="text-3xl font-semibold tracking-tight"
          >
            訂閱那年今日
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            建立一個可加入家庭行事曆的 ICS URL。它只輸出
            private、日精度、已解鎖事件的標題與日期，每年重複；不含正文、媒體、GPS、成員或分享資料。
          </p>
        </header>

        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          {status.isLoading ? (
            <p className="text-sm text-muted-foreground">正在確認訂閱狀態…</p>
          ) : null}
          {status.isError ? (
            <p role="alert" className="text-sm text-destructive">
              無法確認訂閱狀態：{status.error.message}
            </p>
          ) : null}
          {status.data ? (
            <div className="space-y-4">
              <p className="text-sm">
                狀態：
                <strong>{status.data.enabled ? "已啟用" : "未啟用"}</strong>
                {createdAt ? ` · 最近建立於 ${createdAt}` : ""}
                {expiresAt ? ` · 到期於 ${expiresAt}` : status.data.enabled ? " · 不會自動到期" : ""}
              </p>
              <label className="grid max-w-sm gap-1 text-sm text-muted-foreground">
                URL 到期時間
                <select
                  className="rounded-md border border-input bg-background px-3 py-2 text-foreground"
                  value={expiryPolicy}
                  onChange={event =>
                    setExpiryPolicy(
                      event.target.value as "30" | "90" | "365" | "none"
                    )
                  }
                >
                  <option value="30">30 天</option>
                  <option value="90">90 天（預設）</option>
                  <option value="365">1 年</option>
                  <option value="none">不自動到期</option>
                </select>
                <span className="text-xs">輪替會立即撤銷目前 URL；選擇不自動到期仍可隨時手動撤銷。</span>
              </label>
              <div className="flex flex-wrap gap-3">
                <Button
                  type="button"
                  onClick={rotateWithExpiry}
                  disabled={rotate.isPending}
                >
                  <RefreshCw className="mr-2 size-4" />
                  {status.data.enabled ? "輪替訂閱 URL" : "建立訂閱 URL"}
                </Button>
                {status.data.enabled ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => revoke.mutate()}
                    disabled={revoke.isPending}
                  >
                    <ShieldOff className="mr-2 size-4" />
                    立即撤銷
                  </Button>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>

        {feedUrl ? (
          <div className="space-y-3 rounded-xl border border-primary/40 bg-primary/5 p-5">
            <p className="text-sm font-medium">只在這次輪替後顯示的訂閱 URL</p>
            <code className="block break-all rounded-md bg-background p-3 text-xs text-foreground">
              {feedUrl}
            </code>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() =>
                void navigator.clipboard.writeText(feedUrl).then(
                  () => toast.success("訂閱 URL 已複製。"),
                  () => toast.error("無法存取剪貼簿，請手動複製。")
                )
              }
            >
              <Copy className="mr-2 size-3.5" />
              複製 URL
            </Button>
          </div>
        ) : null}

        <aside className="rounded-xl border border-dashed border-border p-4 text-sm leading-6 text-muted-foreground">
          <CalendarHeart className="mb-2 size-5 text-primary" />
          這不是公開分享連結。URL
          視同密碼；若誤傳、換裝置或不再使用，請立即輪替或撤銷。撤銷後舊 URL
          回傳未授權，內容不會保留在伺服器或頁面中。
        </aside>
      </section>
    </DashboardLayout>
  );
}
