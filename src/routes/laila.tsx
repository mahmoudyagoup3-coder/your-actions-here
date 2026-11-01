import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpenText, LogIn, MessagesSquare, Moon, NotebookPen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  STAGES,
  getStage,
  hasTracks,
  levelName,
  levelSubjects,
  levelTracks,
  stageName,
  trackName,
  trackSubjects,
} from "@/lib/curriculum";
import { LailaChat } from "@/components/laila/laila-chat";
import { LailaQuiz, type QuizStudent } from "@/components/laila/laila-quiz";
import { LailaEssay } from "@/components/laila/laila-essay";
import { LailaDashboard, type LailaAttemptRow } from "@/components/laila/laila-dashboard";
import { quizzesTakenToday } from "@/lib/laila-limits";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/laila")({
  head: () => ({
    meta: [
      { title: "غرفة ليلا الذكية | مكتبة اليعقوبي" },
      {
        name: "description",
        content:
          "تدردش مع ليلا، خُض اختبارات وتحديات مقالات مدعومة بالذكاء الاصطناعي، وتابع إحصائياتك اليومية.",
      },
      { property: "og:title", content: "غرفة ليلا الذكية | مكتبة اليعقوبي" },
      {
        property: "og:description",
        content: "مساعدتك الدراسية الذكية: دردشة واختبارات وتحديات مقالات للمنهج السوداني.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LailaPage,
});

type TabKey = "chat" | "tests" | "stats";

const TABS: { key: TabKey; name: string; icon: typeof Moon }[] = [
  { key: "chat", name: "الدردشة", icon: MessagesSquare },
  { key: "tests", name: "الاختبارات والتحديات", icon: NotebookPen },
  { key: "stats", name: "لوحة الطالب", icon: BookOpenText },
];

function LailaPage() {
  const { session, user, loading } = useAuth();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<TabKey>("chat");
  const [testMode, setTestMode] = useState<"quiz" | "essay">("quiz");
  const [stageKey, setStageKey] = useState(STAGES[0]?.key ?? "middle");
  const stage = getStage(stageKey) ?? STAGES[0];
  const [levelKey, setLevelKey] = useState(stage?.levels[0]?.key ?? "");
  const level = stage?.levels.find((l) => l.key === levelKey) ?? stage?.levels[0];
  const tracks = level && stage ? levelTracks(stage.key, level.key) : [];
  const [trackKey, setTrackKey] = useState<string | undefined>(undefined);
  const activeTrack = tracks.some((t) => t.key === trackKey) ? trackKey : tracks[0]?.key;
  const subjects =
    stage && level
      ? activeTrack
        ? trackSubjects(stage.key, level.key, activeTrack)
        : levelSubjects(stage.key, level.key)
      : [];
  const [subject, setSubject] = useState("");
  const activeSubject = subjects.includes(subject) ? subject : (subjects[0] ?? "");

  const attemptsQuery = useQuery({
    queryKey: ["laila-attempts"],
    queryFn: async (): Promise<LailaAttemptRow[]> => {
      const { data, error } = await supabase
        .from("laila_attempts")
        .select("id, kind, stage, level, subject, difficulty, score, created_at")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as LailaAttemptRow[];
    },
    enabled: Boolean(user),
  });

  function pickStage(key: string) {
    const next = getStage(key) ?? STAGES[0];
    if (!next) return;
    setStageKey(next.key);
    setLevelKey(next.levels[0]?.key ?? "");
    setTrackKey(undefined);
    setSubject("");
  }

  const refetchAttempts = () => {
    void attemptsQuery.refetch();
  };

  function pickLevel(key: string) {
    setLevelKey(key);
    setTrackKey(undefined);
    setSubject("");
  }

  if (loading) {
    return (
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-10">
        <div className="h-40 animate-pulse rounded-3xl bg-laila-soft" />
        <div className="h-24 animate-pulse rounded-3xl bg-laila-soft" />
        <div className="h-64 animate-pulse rounded-3xl bg-laila-soft" />
      </div>
    );
  }

  if (!session || !user) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-14">
        <div className="flex flex-col items-center gap-5 rounded-3xl border border-laila-border bg-laila-card p-10 text-center shadow-sm">
          <span className="flex size-16 items-center justify-center rounded-3xl bg-laila-accent text-white">
            <Moon className="size-8" />
          </span>
          <h1 className="text-2xl font-extrabold text-laila-deep">غرفة ليلا الذكية</h1>
          <p className="max-w-md text-sm leading-8 text-laila-muted">
            سجّل الدخول لتدردش مع ليلا، وتخوض الاختبارات وتحديات المقالات، وتتابع إحصائياتك
            اليومية — كل ذلك مدعوم بالذكاء الاصطناعي.
          </p>
          <Button asChild size="lg" className="rounded-full bg-laila-accent px-8 font-bold text-white hover:bg-laila-accent/90">
            <Link to="/auth">
              <LogIn className="size-4" />
              تسجيل الدخول
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const student: QuizStudent = {
    stage: stageName(stageKey),
    level: levelName(stageKey, levelKey),
    subject: activeSubject,
    ...(activeTrack ? { track: trackName(stageKey, levelKey, activeTrack) } : {}),
  };
  const takenToday = quizzesTakenToday(attemptsQuery.data ?? []);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6">
      <section className="laila-hero flex flex-col items-center gap-3 rounded-3xl p-8 text-center text-white">
        <span className="flex size-14 items-center justify-center rounded-3xl bg-white/15">
          <Moon className="size-7" />
        </span>
        <h1 className="text-3xl font-extrabold">غرفة ليلا الذكية</h1>
        <p className="max-w-xl text-sm leading-7 text-white/85 sm:text-base">
          مساعدتك الدراسية بالذكاء الاصطناعي: دردشة، اختبارات فورية، تحديات مقالات، وإحصائيات
          يومية للمنهج السوداني.
        </p>
      </section>

      <section className="rounded-3xl border border-laila-border bg-laila-card p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="font-extrabold text-laila-deep">بطاقة المساعدة الذكية</h2>
          <span className="rounded-full bg-laila-soft px-3 py-1 text-xs font-bold text-laila-strong">
            اختبارات اليوم: {takenToday}/2
          </span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="flex flex-col gap-1.5 text-xs font-bold text-laila-muted">
            المرحلة
            <select
              value={stageKey}
              onChange={(e) => pickStage(e.target.value)}
              className="h-11 rounded-xl border-2 border-laila-border bg-white px-3 text-sm font-semibold text-laila-deep outline-none focus:border-laila-accent"
            >
              {STAGES.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-xs font-bold text-laila-muted">
            {stage?.levelLabel ?? "الصف"}
            <select
              value={levelKey}
              onChange={(e) => pickLevel(e.target.value)}
              className="h-11 rounded-xl border-2 border-laila-border bg-white px-3 text-sm font-semibold text-laila-deep outline-none focus:border-laila-accent"
            >
              {(stage?.levels ?? []).map((l) => (
                <option key={l.key} value={l.key}>
                  {l.name}
                </option>
              ))}
            </select>
          </label>
          {hasTracks(stageKey, levelKey) && tracks.length ? (
            <label className="flex flex-col gap-1.5 text-xs font-bold text-laila-muted">
              المنهج
              <select
                value={activeTrack}
                onChange={(e) => setTrackKey(e.target.value)}
                className="h-11 rounded-xl border-2 border-laila-border bg-white px-3 text-sm font-semibold text-laila-deep outline-none focus:border-laila-accent"
              >
                {tracks.map((t) => (
                  <option key={t.key} value={t.key}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <label className="flex flex-col gap-1.5 text-xs font-bold text-laila-muted">
            المادة
            <select
              value={activeSubject}
              onChange={(e) => setSubject(e.target.value)}
              className="h-11 rounded-xl border-2 border-laila-border bg-white px-3 text-sm font-semibold text-laila-deep outline-none focus:border-laila-accent"
            >
              {subjects.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <nav className="grid grid-cols-3 gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={cn(
              "flex items-center justify-center gap-2 rounded-2xl border-2 border-laila-border bg-laila-card px-3 py-3 text-xs font-bold text-laila-deep transition sm:text-sm",
              tab === t.key && "border-laila-accent bg-laila-soft text-laila-strong",
            )}
          >
            <t.icon className="size-4" />
            {t.name}
          </button>
        ))}
      </nav>

      <section>
        {tab === "chat" ? (
          <LailaChat student={{ stage: student.stage, level: student.level, subject: student.subject }} />
        ) : tab === "tests" ? (
          <div className="flex flex-col gap-4">
            <div className="flex gap-2">
              {[
                { key: "quiz" as const, name: "اختبار سريع" },
                { key: "essay" as const, name: "تحدي المقال" },
              ].map((m) => (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => setTestMode(m.key)}
                  className={cn(
                    "rounded-full border-2 border-laila-border bg-laila-card px-5 py-2 text-sm font-bold text-laila-deep transition",
                    testMode === m.key && "border-laila-accent bg-laila-soft text-laila-strong",
                  )}
                >
                  {m.name}
                </button>
              ))}
            </div>
            {testMode === "quiz" ? (
              <LailaQuiz
                student={student}
                attempts={attemptsQuery.data ?? []}
                userId={user.id}
                onSaved={refetchAttempts}
              />
            ) : (
              <LailaEssay student={student} onSaved={refetchAttempts} onOpenDashboard={() => setTab("stats")} />
            )}
          </div>
        ) : (
          <LailaDashboard attempts={attemptsQuery.data ?? []} loading={attemptsQuery.isLoading} />
        )}
      </section>
    </div>
  );
}
