import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { BookOpenText, ClipboardList, GraduationCap, Moon } from "lucide-react";
import {
  DAILY_QUIZ_LIMIT,
  quizzesRemainingToday,
  quizzesTakenToday,
  type AttemptLite,
} from "@/lib/laila-limits";
import { difficultyName } from "@/lib/laila-schema";

export interface LailaAttemptRow {
  id: string;
  kind: string;
  stage: string | null;
  level: string | null;
  subject: string | null;
  difficulty: string | null;
  score: number;
  created_at: string;
}

function avg(scores: number[]): number {
  if (scores.length === 0) return 0;
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}

export function LailaDashboard({
  attempts,
  loading,
}: {
  attempts: LailaAttemptRow[];
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-2xl bg-laila-soft" />
        ))}
      </div>
    );
  }

  const quizzes = attempts.filter((a) => a.kind === "quiz");
  const essays = attempts.filter((a) => a.kind === "essay");
  const takenToday = quizzesTakenToday(attempts);
  const remaining = quizzesRemainingToday(attempts);

  const chartData = [...attempts]
    .slice(0, 10)
    .reverse()
    .map((a, i) => ({
      name: a.subject ? a.subject.slice(0, 8) : `#${i + 1}`,
      score: a.score,
    }));

  const cards = [
    { icon: ClipboardList, label: "اختبارات مكتملة", value: quizzes.length },
    { icon: BookOpenText, label: "متوسط درجات الاختبارات", value: avg(quizzes.map((q) => q.score)) },
    { icon: GraduationCap, label: "تحديات المقال", value: essays.length },
    { icon: Moon, label: "متوسط درجات المقال", value: avg(essays.map((e) => e.score)) },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-laila-border bg-laila-card p-4">
        <div>
          <p className="font-bold text-laila-deep">إحصائياتك اليومية</p>
          <p className="text-sm text-laila-muted">
            {takenToday > 0
              ? `أنجزت ${takenToday} ${takenToday === 1 ? "اختبارًا" : "اختبارات"} اليوم — متبقٍ لك ${remaining} من ${DAILY_QUIZ_LIMIT}.`
              : `لم تخض اختبارًا اليوم بعد — متبقٍ لك ${DAILY_QUIZ_LIMIT} اختبارات.`}
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {cards.map((c) => (
          <div
            key={c.label}
            className="flex items-center gap-3 rounded-2xl border border-laila-border bg-laila-card p-4"
          >
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-laila-soft text-laila-strong">
              <c.icon className="size-5" />
            </span>
            <div>
              <div className="text-2xl font-extrabold text-laila-deep">{c.value}</div>
              <div className="text-xs text-laila-muted">{c.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-laila-border bg-laila-card p-5">
        <p className="mb-3 font-bold text-laila-deep">نتائجك الأخيرة</p>
        {chartData.length ? (
          <div style={{ direction: "ltr" }}>
            <ResponsiveContainer width="100%" height={210}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--laila-border)" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "var(--laila-muted)" }} />
                <YAxis domain={[0, 100]} width={32} tick={{ fontSize: 11, fill: "var(--laila-muted)" }} />
                <Tooltip formatter={(v) => [`${v}`, "الدرجة"]} />
                <Bar dataKey="score" fill="var(--laila-accent)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="py-6 text-center text-sm text-laila-muted">
            لا نتائج بعد — ابدأ أول اختبار من قسم الاختبارات.
          </p>
        )}
      </div>

      <div className="rounded-2xl border border-laila-border bg-laila-card p-5">
        <p className="mb-3 font-bold text-laila-deep">سجل المحاولات</p>
        {attempts.length ? (
          <ul className="flex flex-col divide-y divide-laila-border">
            {attempts.slice(0, 12).map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-2 py-2.5 text-sm">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-laila-soft px-2.5 py-0.5 text-[11px] font-bold text-laila-strong">
                    {a.kind === "essay" ? "مقال" : "اختبار"}
                  </span>
                  <span className="font-semibold text-laila-deep">{a.subject ?? "—"}</span>
                  {a.difficulty ? (
                    <span className="text-xs text-laila-muted">{difficultyName(a.difficulty)}</span>
                  ) : null}
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-extrabold text-laila-accent">{a.score}</span>
                  <span className="text-xs text-laila-muted">
                    {new Date(a.created_at).toLocaleDateString("ar", {
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="py-4 text-center text-sm text-laila-muted">لا محاولات مسجلة بعد.</p>
        )}
      </div>
    </div>
  );
}
