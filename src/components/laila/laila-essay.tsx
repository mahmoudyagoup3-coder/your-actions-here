import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Check, Clock, X } from "lucide-react";
import { toast } from "sonner";
import { createEssayTopicFn, gradeEssayFn } from "@/lib/laila.functions";
import {
  AI_MAINTENANCE,
  DIFFICULTIES,
  difficultyMinutes,
  type DifficultyKey,
  type EssayEvaluation,
  type EssayTopic,
} from "@/lib/laila-schema";
import { cn } from "@/lib/utils";
import { ScoreCircle } from "./question-views";
import type { QuizStudent } from "./laila-quiz";

const ERROR_MESSAGES: Record<string, string> = {
  essay_limit: "أكملت حد تحديات المقال اليوم — عدّ غدًا 🌙",
  maintenance: AI_MAINTENANCE,
  ai: "تعذّر الاتصال بليلا الآن، حاول مرة أخرى.",
};

function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function LailaEssay({
  student,
  onSaved,
  onOpenDashboard,
}: {
  student: QuizStudent;
  onSaved: () => void;
  onOpenDashboard?: () => void;
}) {
  const createTopic = useServerFn(createEssayTopicFn);
  const gradeEssay = useServerFn(gradeEssayFn);
  const [phase, setPhase] = useState<"config" | "writing" | "grading" | "result">("config");
  const [difficulty, setDifficulty] = useState<DifficultyKey>("medium");
  const [topic, setTopic] = useState<EssayTopic | null>(null);
  const [text, setText] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [evaluation, setEvaluation] = useState<EssayEvaluation | null>(null);
  const [savedNote, setSavedNote] = useState(false);
  const [busy, setBusy] = useState(false);

  // العدّاد التنازلي أثناء الكتابة
  useEffect(() => {
    if (phase !== "writing") return;
    const t = setInterval(() => setSecondsLeft((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [phase]);

  async function submit(auto = false) {
    if (!topic || busy) return;
    const value = text.trim();
    if (value.length < 50) {
      if (auto) {
        toast.error("انتهى الوقت قبل إكمال المقال — جرّب تحديًا جديدًا.");
        setPhase("config");
        setTopic(null);
        setText("");
      }
      return;
    }
    setBusy(true);
    if (!auto) setPhase("grading");
    const result = await gradeEssay({
      data: {
        ...student,
        difficulty,
        topic: topic.topic,
        prompt: topic.prompt,
        points: topic.points,
        text: value,
      },
    });
    setBusy(false);
    if ("error" in result && result.error) {
      toast.error(ERROR_MESSAGES[result.error] ?? "حدث خطأ غير متوقع.");
      if (auto) {
        setPhase("config");
        setTopic(null);
      } else {
        setPhase("writing");
      }
      return;
    }
    if ("evaluation" in result) {
      setEvaluation(result.evaluation);
      setSavedNote(Boolean(result.saved));
      onSaved();
      setPhase("result");
    }
  }

  // التسليم التلقائي عند نفاد الوقت
  useEffect(() => {
    if (phase === "writing" && secondsLeft === 0 && topic) {
      void submit(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft, phase]);

  async function generate() {
    setBusy(true);
    const result = await createTopic({ data: { ...student, difficulty } });
    setBusy(false);
    if ("error" in result && result.error) {
      toast.error(ERROR_MESSAGES[result.error] ?? "حدث خطأ غير متوقع.");
      return;
    }
    if (!("topic" in result)) {
      toast.error(ERROR_MESSAGES["ai"]);
      return;
    }
    setTopic(result.topic);
    setText("");
    setSecondsLeft(difficultyMinutes(difficulty) * 60);
    setPhase("writing");
  }

  if (phase === "grading" || (busy && phase === "writing")) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-3xl border border-laila-border bg-laila-card p-10 text-center">
        <span className="flex size-14 animate-pulse items-center justify-center rounded-2xl bg-laila-soft text-2xl">
          🌙
        </span>
        <p className="font-bold text-laila-deep">ليلا تصحّح مقالك الآن…</p>
        <p className="text-sm text-laila-muted">تُبرز النقاط المستوفاة وملاحظات التحسين بعد لحظات.</p>
      </div>
    );
  }

  if (phase === "result" && evaluation && topic) {
    return (
      <div className="flex flex-col gap-5">
        <div className="flex flex-col items-center gap-3 rounded-3xl border border-laila-border bg-laila-card p-6 text-center">
          <ScoreCircle score={evaluation.score} />
          <p className="text-lg font-extrabold text-laila-deep">{topic.topic}</p>
          <p className="text-sm leading-7 text-laila-muted">{evaluation.summary}</p>
          <span className="rounded-full bg-laila-soft px-3 py-1 text-xs font-semibold text-laila-strong">
            {savedNote ? "حُفظت النتيجة في لوحة طالبك" : "لم تُحفظ النتيجة (حدث خطأ في الحفظ)"}
          </span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-laila-border bg-laila-card p-4">
            <p className="mb-2 font-bold text-laila-ok">نقاط قوتك</p>
            <ul className="flex flex-col gap-1.5 text-sm text-laila-deep">
              {evaluation.strengths.length
                ? evaluation.strengths.map((s) => <li key={s}>• {s}</li>)
                : <li className="text-laila-muted">—</li>}
            </ul>
          </div>
          <div className="rounded-2xl border border-laila-border bg-laila-card p-4">
            <p className="mb-2 font-bold text-laila-deep">اقتراحات التحسين</p>
            <ul className="flex flex-col gap-1.5 text-sm text-laila-deep">
              {evaluation.improvements.length
                ? evaluation.improvements.map((s) => <li key={s}>• {s}</li>)
                : <li className="text-laila-muted">—</li>}
            </ul>
          </div>
        </div>

        <div className="rounded-2xl border border-laila-border bg-laila-card p-4">
          <p className="mb-2 font-bold text-laila-deep">النقاط المطلوبة</p>
          <ul className="flex flex-col gap-2 text-sm">
            {topic.points.map((p) => {
              const covered = evaluation.covered.includes(p);
              return (
                <li key={p} className="flex items-start gap-2 text-laila-deep">
                  {covered ? (
                    <Check className="mt-0.5 size-4 shrink-0 text-laila-ok" />
                  ) : (
                    <X className="mt-0.5 size-4 shrink-0 text-destructive" />
                  )}
                  <span className={cn(!covered && "text-laila-muted")}>{p}</span>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => {
              setTopic(null);
              setEvaluation(null);
              setText("");
              setPhase("config");
            }}
            className="rounded-xl bg-laila-accent px-6 py-3 font-bold text-white transition hover:bg-laila-accent/90 active:scale-95"
          >
            تحدي جديد
          </button>
          {onOpenDashboard ? (
            <button
              type="button"
              onClick={onOpenDashboard}
              className="rounded-xl border-2 border-laila-border px-6 py-3 font-bold text-laila-deep transition hover:bg-laila-soft"
            >
              عرض لوحتي
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  if (phase === "writing" && topic) {
    const urgent = secondsLeft <= 60;
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    return (
      <div className="flex flex-col gap-4">
        <div className="rounded-2xl border border-laila-border bg-laila-card p-5">
          <p className="text-xs font-bold text-laila-muted">موضوع ليلا</p>
          <p className="mt-1 text-lg font-extrabold text-laila-deep">{topic.topic}</p>
          <p className="mt-2 text-sm leading-7 text-laila-deep">{topic.prompt}</p>
        </div>

        <div className="flex items-center justify-between rounded-2xl border-2 border-laila-border bg-laila-card px-5 py-3">
          <span className="flex items-center gap-2 font-bold text-laila-deep">
            <Clock className={cn("size-5 text-laila-strong", urgent && "animate-pulse text-destructive")} />
            الوقت المتبقي
          </span>
          <span
            className={cn(
              "font-mono text-3xl font-extrabold tabular-nums",
              urgent ? "text-destructive" : "text-laila-accent",
            )}
            style={{ direction: "ltr" }}
          >
            {formatTime(secondsLeft)}
          </span>
        </div>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={10}
          placeholder="اكتب مقالك هنا قبل نفاد الوقت…"
          className="w-full rounded-2xl border-2 border-laila-border bg-white p-4 text-base leading-8 text-laila-deep outline-none transition focus:border-laila-accent"
        />
        <div className="flex items-center justify-between text-xs text-laila-muted">
          <span>{words} كلمة</span>
          <span>يُسلَّم المقال تلقائيًا عند نفاد الوقت</span>
        </div>

        <button
          type="button"
          onClick={() => void submit(false)}
          disabled={text.trim().length < 50 || busy}
          className="rounded-xl bg-laila-accent px-8 py-3 font-bold text-white transition hover:bg-laila-accent/90 active:scale-95 disabled:opacity-50"
        >
          تسليم المقال للتصحيح
        </button>
      </div>
    );
  }

  // phase === "config"
  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm leading-7 text-laila-deep">
        تولّد ليلا موضوع مقال أو سؤالًا استنتاجيًا من صلب مادتك، ويحدد وقتًا تنازليًا حسب مستوى
        الصعوبة. اكتب إجابتك قبل نفاد الوقت، وستصححها ليلا وتقيّمها فورًا.
      </p>
      <div>
        <p className="mb-2 font-bold text-laila-deep">مستوى الصعوبة ووقت الكتابة</p>
        <div className="flex flex-wrap gap-2">
          {DIFFICULTIES.map((d) => (
            <button
              key={d.key}
              type="button"
              onClick={() => setDifficulty(d.key)}
              className={cn(
                "rounded-full border-2 border-laila-border px-4 py-2 text-sm font-bold text-laila-deep transition",
                difficulty === d.key && "border-laila-accent bg-laila-soft text-laila-strong",
              )}
            >
              {d.name} — {d.minutes} دقيقة
            </button>
          ))}
        </div>
      </div>
      <button
        type="button"
        onClick={() => void generate()}
        disabled={busy}
        className="rounded-xl bg-laila-accent px-8 py-3.5 text-lg font-bold text-white transition hover:bg-laila-accent/90 active:scale-95 disabled:opacity-50"
      >
        {busy ? "ليلا تحضّر الموضوع…" : "توليد موضوع المقال"}
      </button>
      <p className="text-xs text-laila-muted">بحد أقصى 5 تحديات مقال يوميًا.</p>
    </div>
  );
}
