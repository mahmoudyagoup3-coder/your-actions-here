import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { generateQuizFn } from "@/lib/laila.functions";
import {
  AI_MAINTENANCE,
  DIFFICULTIES,
  QUESTION_TYPES,
  QUESTION_TYPE_LABELS,
  gradeQuestion,
  typeAccuracy,
  type DifficultyKey,
  type GradedQuestion,
  type QuestionType,
  type QuizQuestion,
} from "@/lib/laila-schema";
import {
  DAILY_QUIZ_LIMIT,
  MAX_QUESTIONS,
  quizzesRemainingToday,
  type AttemptLite,
} from "@/lib/laila-limits";
import {
  FillBlankView,
  MatchingView,
  McqView,
  QuestionCard,
  QuestionFeedback,
  ScoreCircle,
  TrueFalseView,
} from "./question-views";
import { cn } from "@/lib/utils";

const ERROR_MESSAGES: Record<string, string> = {
  limit: "وصلت إلى حد اختبارين يوميًا — عدّ غدًا 🌙",
  maintenance: AI_MAINTENANCE,
  ai: "تعذّر توليد الأسئلة الآن، حاول مرة أخرى.",
};

export interface QuizStudent {
  stage: string;
  level: string;
  subject: string;
  track?: string;
}

function buildRecommendations(
  acc: ReturnType<typeof typeAccuracy>,
  score: number,
): string[] {
  const recs: string[] = [];
  for (const a of acc) {
    if (a.percent < 60) {
      recs.push(
        `راجع أسلوب ${QUESTION_TYPE_LABELS[a.type]} في هذه المادة — دقتك فيه ${a.percent}% فقط.`,
      );
    }
  }
  if (score >= 90) recs.push("أداء ممتاز! جرّب مستوى صعبًا وعدد أسئلة أكبر في تحدٍّ قادم.");
  else if (score >= 75) recs.push("نتيجة جيدة جدًا — ثبّت ما تعلمته في اختبار آخر غدًا.");
  else if (score >= 60) recs.push("نتيجة جيدة — اقرأ الشرح أسفل كل سؤال ثم أعد المحاولة غدًا.");
  else
    recs.push("تحتاج مراجعة: افتح كتاب المادة أو مذكراتها من مكتبة اليعقوبي ثم أعد الاختبار غدًا.");
  recs.push("اسأل ليلا في غرفة الدردشة عن أي سؤال أخطأت فيه لتفهمه أكثر.");
  return recs;
}

export function LailaQuiz({
  student,
  attempts,
  userId,
  onSaved,
}: {
  student: QuizStudent;
  attempts: AttemptLite[];
  userId: string;
  onSaved: () => void;
}) {
  const generateQuiz = useServerFn(generateQuizFn);
  const [phase, setPhase] = useState<"config" | "generating" | "running" | "results">("config");
  const [difficulty, setDifficulty] = useState<DifficultyKey>("easy");
  const [count, setCount] = useState(10);
  const [types, setTypes] = useState<QuestionType[]>([...QUESTION_TYPES]);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [responses, setResponses] = useState<unknown[]>([]);
  const [results, setResults] = useState<GradedQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [feedback, setFeedback] = useState<GradedQuestion | null>(null);

  const remaining = quizzesRemainingToday(attempts);

  async function start() {
    setPhase("generating");
    const result = await generateQuiz({ data: { ...student, difficulty, count, types } });
    if ("error" in result && result.error) {
      setPhase("config");
      toast.error(ERROR_MESSAGES[result.error] ?? "حدث خطأ غير متوقع.");
      return;
    }
    const generated = "questions" in result ? result.questions : [];
    if (generated.length === 0) {
      setPhase("config");
      toast.error(ERROR_MESSAGES.ai);
      return;
    }
    setQuestions(generated);
    setResponses([]);
    setResults([]);
    setIndex(0);
    setFeedback(null);
    setPhase("running");
  }

  function respond(value: unknown) {
    const question = questions[index];
    if (!question || responses[index] != null) return;
    const graded = gradeQuestion(question, value);
    setResponses((prev) => {
      const copy = [...prev];
      copy[index] = value;
      return copy;
    });
    setResults((prev) => [...prev, graded]);
    setFeedback(graded);
  }

  async function finish() {
    const total = Math.max(1, results.length);
    const score = Math.round((results.reduce((s, r) => s + r.partial, 0) / total) * 100);
    const correctCount = results.filter((r) => r.correct).length;
    const { error } = await supabase.from("laila_attempts").insert({
      user_id: userId,
      kind: "quiz",
      stage: student.stage,
      level: student.level,
      subject: student.subject,
      difficulty,
      question_count: results.length,
      correct_count: correctCount,
      total_count: results.length,
      score,
      details: { perType: typeAccuracy(results) },
    });
    if (error) toast.error("تعذّر حفظ النتيجة في لوحتك.");
    onSaved();
    setPhase("results");
  }

  function next() {
    if (index + 1 >= questions.length) {
      void finish();
      return;
    }
    setIndex(index + 1);
    setFeedback(null);
  }

  if (phase === "generating") {
    return (
      <div className="flex flex-col items-center gap-4 rounded-3xl border border-laila-border bg-laila-card p-10 text-center">
        <span className="flex size-14 animate-pulse items-center justify-center rounded-2xl bg-laila-soft text-2xl">
          🌙
        </span>
        <p className="font-bold text-laila-deep">ليلا تحضّر أسئلتك الآن…</p>
        <p className="text-sm text-laila-muted">
          قد يستغرق التوليد لحظات حسب عدد الأسئلة المطلوبة (حتى {MAX_QUESTIONS} سؤالًا).
        </p>
      </div>
    );
  }

  if (phase === "running" && questions[index]) {
    const question = questions[index];
    const progress = Math.round((index / questions.length) * 100);
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-laila-soft">
            <div
              className="h-full rounded-full bg-laila-accent transition-all"
              style={{ width: `${Math.max(progress, 4)}%` }}
            />
          </div>
          <span className="text-xs font-bold text-laila-strong">{progress}%</span>
        </div>

        <QuestionCard question={question} index={index} total={questions.length}>
          {question.type === "true_false" ? (
            <TrueFalseView question={question} onRespond={respond} response={responses[index]} />
          ) : question.type === "mcq" ? (
            <McqView question={question} onRespond={respond} response={responses[index]} />
          ) : question.type === "fill_blank" ? (
            <FillBlankView question={question} onRespond={respond} response={responses[index]} />
          ) : (
            <MatchingView question={question} onRespond={respond} response={responses[index]} />
          )}
        </QuestionCard>

        {feedback ? (
          <>
            <QuestionFeedback graded={feedback} />
            <button
              type="button"
              onClick={next}
              className="rounded-xl bg-laila-accent px-8 py-3 font-bold text-white transition hover:bg-laila-accent/90 active:scale-95"
            >
              {index + 1 >= questions.length ? "تسليم النتيجة وعرض التقرير" : "السؤال التالي ←"}
            </button>
          </>
        ) : null}
      </div>
    );
  }

  if (phase === "results") {
    const total = Math.max(1, results.length);
    const score = Math.round((results.reduce((s, r) => s + r.partial, 0) / total) * 100);
    const acc = typeAccuracy(results);
    const chartData = acc.map((a) => ({ name: QUESTION_TYPE_LABELS[a.type], percent: a.percent }));
    const strengths = acc.filter((a) => a.percent >= 75);
    const weaknesses = acc.filter((a) => a.percent < 60);
    const message =
      score >= 90
        ? "ممتاز! أداء رائع 🌟"
        : score >= 75
          ? "جيد جدًا! واصل التقدم"
          : score >= 60
            ? "جيد — راجع قليلًا وستتحسن"
            : "تحتاج مراجعة — لا تستسلم";
    return (
      <div className="flex flex-col gap-5">
        <div className="flex flex-col items-center gap-3 rounded-3xl border border-laila-border bg-laila-card p-6 text-center">
          <ScoreCircle score={score} />
          <p className="text-lg font-extrabold text-laila-deep">{message}</p>
          <p className="text-sm text-laila-muted">
            أجبت صحيحًا عن {results.filter((r) => r.correct).length} من {results.length} سؤالًا.
          </p>
        </div>

        <div className="rounded-3xl border border-laila-border bg-laila-card p-5">
          <p className="mb-3 font-bold text-laila-deep">دقتك حسب نوع السؤال</p>
          <div style={{ direction: "ltr" }}>
            <ResponsiveContainer width="100%" height={210}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--laila-border)" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: "var(--laila-muted)" }}
                  interval={0}
                />
                <YAxis
                  domain={[0, 100]}
                  width={32}
                  tick={{ fontSize: 11, fill: "var(--laila-muted)" }}
                />
                <Tooltip formatter={(v) => [`${v}%`, "الدقة"]} />
                <Bar dataKey="percent" fill="var(--laila-accent)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-laila-border bg-laila-card p-4">
            <p className="mb-2 font-bold text-laila-ok">نقاط قوتك</p>
            {strengths.length ? (
              <ul className="flex flex-col gap-1.5 text-sm text-laila-deep">
                {strengths.map((s) => (
                  <li key={s.type}>• {QUESTION_TYPE_LABELS[s.type]} — {s.percent}%</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-laila-muted">ستظهر هنا بعد اختبارات أكثر.</p>
            )}
          </div>
          <div className="rounded-2xl border border-laila-border bg-laila-card p-4">
            <p className="mb-2 font-bold text-destructive">نقاط تحتاج تحسينًا</p>
            {weaknesses.length ? (
              <ul className="flex flex-col gap-1.5 text-sm text-laila-deep">
                {weaknesses.map((w) => (
                  <li key={w.type}>• {QUESTION_TYPE_LABELS[w.type]} — {w.percent}%</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-laila-muted">لا توجد نقاط ضعف واضحة في هذا الاختبار.</p>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-laila-border bg-laila-card p-4">
          <p className="mb-2 font-bold text-laila-deep">توصيات ليلا للمراجعة</p>
          <ul className="flex flex-col gap-2 text-sm leading-7 text-laila-deep">
            {buildRecommendations(acc, score).map((r) => (
              <li key={r}>🌙 {r}</li>
            ))}
          </ul>
        </div>

        <button
          type="button"
          onClick={() => setPhase("config")}
          className="rounded-xl bg-laila-accent px-8 py-3 font-bold text-white transition hover:bg-laila-accent/90 active:scale-95"
        >
          اختبار جديد
        </button>
      </div>
    );
  }

  // phase === "config"
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-laila-border bg-laila-card p-4">
        <div>
          <p className="font-bold text-laila-deep">حصتك اليوم</p>
          <p className="text-sm text-laila-muted">
            {remaining > 0
              ? `متبقٍ لك ${remaining} من ${DAILY_QUIZ_LIMIT} اختبارات اليوم.`
              : "أنهيت اختبارات اليوم — عدّ غدًا 🌙"}
          </p>
        </div>
        <span className="text-2xl font-extrabold text-laila-accent">
          {remaining}/{DAILY_QUIZ_LIMIT}
        </span>
      </div>

      <div>
        <p className="mb-2 font-bold text-laila-deep">مستوى الصعوبة</p>
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
              {d.name}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 font-bold text-laila-deep">
          عدد الأسئلة: <span className="text-laila-accent">{count}</span>
          <span className="text-xs font-normal text-laila-muted"> (الحد الأقصى {MAX_QUESTIONS})</span>
        </p>
        <input
          type="range"
          min={5}
          max={MAX_QUESTIONS}
          step={5}
          value={count}
          onChange={(e) => setCount(Number(e.target.value))}
          className="w-full accent-[var(--laila-accent)]"
        />
      </div>

      <div>
        <p className="mb-2 font-bold text-laila-deep">أنماط الأسئلة</p>
        <div className="flex flex-wrap gap-2">
          {QUESTION_TYPES.map((t) => {
            const active = types.includes(t);
            return (
              <button
                key={t}
                type="button"
                onClick={() =>
                  setTypes((prev) =>
                    prev.includes(t)
                      ? prev.length > 1
                        ? prev.filter((x) => x !== t)
                        : prev
                      : [...prev, t],
                  )
                }
                className={cn(
                  "rounded-full border-2 border-laila-border px-4 py-2 text-sm font-bold text-laila-deep transition",
                  active && "border-laila-accent bg-laila-soft text-laila-strong",
                )}
              >
                {QUESTION_TYPE_LABELS[t]}
              </button>
            );
          })}
        </div>
      </div>

      <button
        type="button"
        onClick={() => void start()}
        disabled={remaining === 0}
        className="rounded-xl bg-laila-accent px-8 py-3.5 text-lg font-bold text-white transition hover:bg-laila-accent/90 active:scale-95 disabled:opacity-50"
      >
        ابدأ الاختبار مع ليلا
      </button>
    </div>
  );
}
