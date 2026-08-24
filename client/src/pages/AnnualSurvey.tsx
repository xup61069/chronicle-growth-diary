import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { CalendarDays, Plus, Save } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

type SurveyAnswer = {
  questionId: number;
  authorUserId: number;
  authorName: string | null;
  responseSlot: number;
  year: number;
  body: string;
};

export default function AnnualSurvey() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const [location] = useLocation();
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const requestedDiaryId = useMemo(() => {
    const search = typeof window === "undefined" ? "" : window.location.search;
    const value = new URLSearchParams(search).get("diary");
    const parsed = value ? Number(value) : undefined;
    return parsed && Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
  }, [location]);
  const diaryQueryInput = useMemo(
    () => (requestedDiaryId ? { diaryId: requestedDiaryId } : undefined),
    [requestedDiaryId]
  );
  const diary = trpc.diary.get.useQuery(diaryQueryInput, {
    retry: 1,
    staleTime: 0,
  });
  const isOwner = (diary.data?.accessRole ?? "owner") === "owner";
  const surveys = trpc.diary.getAnnualSurveys.useQuery(diaryQueryInput, {
    staleTime: 0,
  });
  const createSurvey = trpc.diary.createAnnualSurvey.useMutation({
    onSuccess: async () => {
      await utils.diary.getAnnualSurveys.invalidate();
      toast.success("已建立 private 年度題組；提醒維持關閉。");
    },
    onError: error => toast.error(error.message),
  });
  const saveAnswer = trpc.diary.saveAnnualSurveyAnswer.useMutation({
    onSuccess: async () => {
      await utils.diary.getAnnualSurveys.invalidate();
      toast.success("年度回答已儲存。");
    },
    onError: error => toast.error(error.message),
  });

  const years = useMemo(() => {
    const answerYears =
      surveys.data?.flatMap(survey =>
        survey.answers.map(answer => answer.year)
      ) ?? [];
    const historicalYears = Array.from(
      { length: currentYear - 1900 + 1 },
      (_, index) => currentYear - index
    );
    return Array.from(new Set([...historicalYears, ...answerYears])).sort(
      (a, b) => b - a
    );
  }, [currentYear, surveys.data]);

  return (
    <DashboardLayout>
      <section
        className="mx-auto max-w-6xl space-y-6 pb-10"
        aria-labelledby="annual-survey-heading"
      >
        <header className="flex flex-col justify-between gap-4 border-b border-border pb-5 sm:flex-row sm:items-end">
          <div className="space-y-2">
            <p className="font-mono text-xs tracking-[0.14em] text-muted-foreground">
              FAMILY / PRIVATE ONLY
            </p>
            <h1
              id="annual-survey-heading"
              className="text-3xl font-semibold tracking-tight"
            >
              家庭年度問卷
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
              同一組問題，以年份與家庭成員並列閱讀。內容只對擁有者與有效家庭成員可見，不會出現在公開故事、分享連結或
              AI 輸入中。
            </p>
          </div>
          {isOwner ? (
            <Button
              type="button"
              onClick={() => createSurvey.mutate({})}
              disabled={createSurvey.isPending}
            >
              <Plus className="mr-2 size-4" />
              建立預設十題
            </Button>
          ) : null}
        </header>

        {!diary.isLoading && !isOwner ? (
          <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
            你正在為家人的成長史作答。只有擁有者能建立或調整題組；你的回答只會留在這本 private 家庭日記中。
          </div>
        ) : null}

        <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">提醒：</span>
          題組預設關閉，且目前不會建立背景工作或自動通知。你可先在這裡留下每一年的回答。
        </div>

        {surveys.isLoading ? (
          <p className="text-sm text-muted-foreground">
            正在整理 private 問卷…
          </p>
        ) : null}
        {surveys.isError ? (
          <p role="alert" className="text-sm text-destructive">
            無法讀取年度問卷：{surveys.error.message}
          </p>
        ) : null}
        {!surveys.isLoading && !surveys.data?.length ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center">
            <CalendarDays className="mx-auto mb-3 size-7 text-muted-foreground" />
            <h2 className="font-medium">還沒有年度題組</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              由日記擁有者建立後，家庭成員可各自留下同一年、同一題的回答。
            </p>
          </div>
        ) : null}

        {surveys.data?.map(survey => (
          <article
            key={survey.id}
            className="space-y-5 rounded-xl border border-border bg-card p-5 shadow-sm"
          >
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <h2 className="text-xl font-semibold">{survey.title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  每年 {survey.targetMonth} 月 {survey.targetDay} 日 ·{" "}
                  {survey.questions.length} 題 · 提醒關閉
                </p>
              </div>
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                查看年度
                <select
                  className="rounded-md border border-input bg-background px-2 py-1 text-foreground"
                  value={selectedYear}
                  onChange={event =>
                    setSelectedYear(Number(event.target.value))
                  }
                >
                  {years.map(year => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="space-y-5">
              {survey.questions.map((question, index) => {
                const ownAnswer = survey.answers.find(
                  (answer: SurveyAnswer) =>
                    answer.questionId === question.id &&
                    answer.authorUserId === user?.id &&
                    answer.responseSlot === 0 &&
                    answer.year === selectedYear
                );
                const draft = drafts[question.id] ?? ownAnswer?.body ?? "";
                const comparison = survey.answers.filter(
                  (answer: SurveyAnswer) => answer.questionId === question.id
                );
                return (
                  <section
                    key={question.id}
                    className="rounded-lg border border-border p-4"
                    aria-labelledby={`annual-question-${question.id}`}
                  >
                    <h3
                      id={`annual-question-${question.id}`}
                      className="font-medium"
                    >
                      <span className="mr-2 font-mono text-xs text-muted-foreground">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      {question.prompt}
                    </h3>
                    <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                      <div className="space-y-2">
                        <label className="text-xs font-medium tracking-wide text-muted-foreground">
                          我的 {selectedYear} 回答
                        </label>
                        <Textarea
                          value={draft}
                          onChange={event =>
                            setDrafts(current => ({
                              ...current,
                              [question.id]: event.target.value,
                            }))
                          }
                          maxLength={4000}
                          placeholder="寫下你想留給這一年的文字…"
                          className="min-h-28 resize-y"
                        />
                        <Button
                          type="button"
                          size="sm"
                          onClick={() =>
                            saveAnswer.mutate({
                              surveyId: survey.id,
                              questionId: question.id,
                              year: selectedYear,
                              body: draft,
                              ...(requestedDiaryId
                                ? { diaryId: requestedDiaryId }
                                : {}),
                            })
                          }
                          disabled={!draft.trim() || saveAnswer.isPending}
                        >
                          <Save className="mr-2 size-3.5" />
                          儲存回答
                        </Button>
                      </div>
                      <div className="space-y-2">
                        <p className="text-xs font-medium tracking-wide text-muted-foreground">
                          歷年並列
                        </p>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {comparison.length ? (
                            comparison.map((answer: SurveyAnswer) => (
                                  <blockquote
                                key={`${answer.year}-${answer.authorUserId}-${answer.responseSlot}`}
                                className="rounded-md bg-muted/50 p-3 text-sm"
                              >
                                <p className="mb-1 font-mono text-xs text-muted-foreground">
                                  {answer.year} ·{" "}
                                  {answer.responseSlot > 0
                                    ? `封存匿名回答 ${answer.responseSlot}`
                                    : answer.authorName || "家庭成員"}
                                </p>
                                <p className="whitespace-pre-wrap leading-6">
                                  {answer.body}
                                </p>
                              </blockquote>
                            ))
                          ) : (
                            <p className="rounded-md bg-muted/50 p-3 text-sm text-muted-foreground">
                              尚無可對照的回答。
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </section>
                );
              })}
            </div>
          </article>
        ))}
      </section>
    </DashboardLayout>
  );
}
