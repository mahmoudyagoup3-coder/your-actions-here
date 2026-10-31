import { useEffect, useMemo, useState } from "react";
import { Check, RotateCcw, X } from "lucide-react";
import type {
  FillQuestion,
  GradedQuestion,
  MatchQuestion,
  MatchingResponse,
  McqQuestion,
  QuizQuestion,
  TfQuestion,
} from "@/lib/laila-schema";
import { QUESTION_TYPE_LABELS } from "@/lib/laila-schema";
import { cn } from "@/lib/utils";

const LETTERS = ["أ", "ب", "ج", "د", "هـ", "و"];

export function TrueFalseView({
  question,
  onRespond,
  response,
}: {
  question: TfQuestion;
  onRespond: (value: boolean) => void;
  response: unknown;
}) {
  const answered = typeof response === "boolean";
  return (
    <div className="grid grid-cols-2 gap-3">
      {[
        { value: true, label: "صح", icon: Check },
        { value: false, label: "خطأ", icon: X },
      ].map((opt) => (
        <button
          key={opt.label}
          type="button"
          disabled={answered}
          onClick={() => onRespond(opt.value)}
          className={cn(
            "flex h-28 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-laila-border bg-laila-card text-xl font-bold text-laila-deep transition active:scale-95 disabled:opacity-60",
            response === opt.value && "border-laila-accent bg-laila-soft ring-2 ring-laila-accent",
          )}
        >
          <opt.icon className="size-8" />
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export function McqView({
  question,
  onRespond,
  response,
}: {
  question: McqQuestion;
  onRespond: (value: number) => void;
  response: unknown;
}) {
  const answered = typeof response === "number";
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {question.options.map((opt, i) => {
        const selected = response === i;
        return (
          <button
            key={i}
            type="button"
            disabled={answered}
            onClick={() => onRespond(i)}
            className={cn(
              "flex items-center gap-3 rounded-2xl border-2 border-laila-border bg-laila-card p-4 text-start font-semibold text-laila-deep transition active:scale-[0.98] disabled:opacity-60",
              selected && "border-laila-accent ring-2 ring-laila-accent",
            )}
          >
            <span
              className={cn(
                "relative flex size-6 shrink-0 items-center justify-center rounded-full border-2 border-laila-accent",
                selected && "laila-pulse",
              )}
            >
              {selected ? <span className="size-2.5 rounded-full bg-laila-accent" /> : null}
            </span>
            <span>{opt}</span>
          </button>
        );
      })}
    </div>
  );
}

export function FillBlankView({
  question: _question,
  onRespond,
  response,
}: {
  question: FillQuestion;
  onRespond: (value: string) => void;
  response: unknown;
}) {
  const [value, setValue] = useState("");
  const answered = typeof response === "string";
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (value.trim()) onRespond(value);
      }}
      className="flex flex-col gap-3"
    >
      <input
        value={answered ? (response as string) : value}
        onChange={(e) => setValue(e.target.value)}
        disabled={answered}
        placeholder="اكتب الإجابة هنا…"
        enterKeyHint="done"
        className="h-13 rounded-xl border-2 border-laila-border bg-white px-4 py-3 text-lg text-laila-deep outline-none transition focus:border-laila-accent disabled:opacity-70"
      />
      {!answered ? (
        <button
          type="submit"
          disabled={!value.trim()}
          className="self-start rounded-xl bg-laila-accent px-6 py-2.5 font-bold text-white transition hover:bg-laila-accent/90 active:scale-95 disabled:opacity-50"
        >
          تحقق
        </button>
      ) : null}
    </form>
  );
}

export function MatchingView({
  question,
  onRespond,
  response,
}: {
  question: MatchQuestion;
  onRespond: (value: MatchingResponse) => void;
  response: unknown;
}) {
  const answered = response != null;
  const pairs = question.pairs;
  const n = pairs.length;
  // ترتيب ثابت للأعمدة اليمنى يختلف عن الأعمدة اليسرى.
  const rightOrder = useMemo(() => {
    const idx = Array.from({ length: n }, (_, i) => i);
    const shift = (question.question.length % n) || 1;
    return idx.map((_, i) => idx[(i + shift) % n]);
  }, [n, question.question]);

  const [links, setLinks] = useState<Record<number, number>>({});
  const [selectedLeft, setSelectedLeft] = useState<number | null>(null);

  useEffect(() => {
    if (!answered && Object.keys(links).length === n) onRespond({ ...links });
  }, [links, answered, n, onRespond]);

  function tapLeft(i: number) {
    if (answered) return;
    if (links[i] != null) {
      const copy = { ...links };
      delete copy[i];
      setLinks(copy);
      setSelectedLeft(null);
      return;
    }
    setSelectedLeft(selectedLeft === i ? null : i);
  }

  function tapRight(j: number) {
    if (answered || selectedLeft == null || Object.values(links).includes(j)) return;
    setLinks({ ...links, [selectedLeft]: j });
    setSelectedLeft(null);
  }

  const usedRights = new Set(Object.values(links));

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-2">
          <span className="text-xs font-bold text-laila-muted">القائمة (أ)</span>
          {pairs.map((pair, i) => (
            <button
              key={i}
              type="button"
              disabled={answered}
              onClick={() => tapLeft(i)}
              className={cn(
                "flex items-center gap-2 rounded-xl border-2 border-laila-border bg-laila-card p-3 text-start text-sm font-semibold text-laila-deep transition active:scale-[0.98] disabled:opacity-70",
                selectedLeft === i && "border-laila-accent ring-2 ring-laila-accent",
              )}
            >
              <span className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-laila-soft text-xs font-bold text-laila-strong">
                {LETTERS[i] ?? ""}
              </span>
              <span className="flex-1">{pair.left}</span>
              {links[i] != null ? (
                <span className="rounded-full bg-laila-accent px-2 py-0.5 text-[10px] font-bold text-white">
                  {LETTERS[links[i] ?? 0] ?? ""}
                </span>
              ) : null}
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-xs font-bold text-laila-muted">القائمة (ب)</span>
          {rightOrder.map((pairIndex, displayIdx) => (
            <button
              key={pairIndex}
              type="button"
              disabled={answered}
              onClick={() => tapRight(pairIndex)}
              className={cn(
                "flex items-center gap-2 rounded-xl border-2 border-laila-border bg-laila-card p-3 text-start text-sm font-semibold text-laila-deep transition active:scale-[0.98] disabled:opacity-70",
                usedRights.has(pairIndex) && "border-laila-soft bg-laila-soft/60 opacity-70",
              )}
            >
              <span className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-laila-soft text-xs font-bold text-laila-strong">
                {LETTERS[displayIdx]}
              </span>
              <span className="flex-1">{pairs[pairIndex].right}</span>
            </button>
          ))}
        </div>
      </div>
      {!answered ? (
        <button
          type="button"
          onClick={() => {
            setLinks({});
            setSelectedLeft(null);
          }}
          className="inline-flex items-center gap-1.5 self-start text-xs font-bold text-laila-strong"
        >
          <RotateCcw className="size-3.5" />
          إعادة ربط من جديد
        </button>
      ) : null}
      <p className="text-xs text-laila-muted">
        اختر عنصرًا من (أ) ثم اختر ما يلائمه من (ب) — أكمل كل الربط لتصحيح السؤال.
      </p>
    </div>
  );
}

export function QuestionCard({
  question,
  index,
  total,
  children,
}: {
  question: QuizQuestion;
  index: number;
  total: number;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-laila-border bg-laila-card p-5 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <span className="rounded-full bg-laila-soft px-3 py-1 text-xs font-bold text-laila-strong">
          {QUESTION_TYPE_LABELS[question.type]}
        </span>
        <span className="text-xs font-semibold text-laila-muted">
          السؤال {index + 1} من {total}
        </span>
      </div>
      <p className="text-lg font-bold leading-9 text-laila-deep">{question.question}</p>
      {children}
    </div>
  );
}

export function correctAnswerText(question: QuizQuestion): string {
  switch (question.type) {
    case "true_false":
      return question.answer_bool ? "صح" : "خطأ";
    case "mcq":
      return question.options[question.answer_index] ?? "";
    case "fill_blank":
      return question.answer_text;
    case "matching":
      return question.pairs.map((p) => `${p.left} ← ${p.right}`).join("؛ ");
  }
}

export function QuestionFeedback({ graded }: { graded: GradedQuestion }) {
  const { question, correct } = graded;
  return (
    <div
      className={cn(
        "rounded-2xl border-2 p-4",
        correct ? "border-laila-ok bg-laila-ok-soft" : "border-destructive/40 bg-destructive/10",
      )}
    >
      <div className="flex items-center gap-2 text-base font-bold">
        {correct ? <Check className="size-5 text-laila-ok" /> : <X className="size-5 text-destructive" />}
        <span className={correct ? "text-laila-ok" : "text-destructive"}>
          {correct ? "إجابة صحيحة، أحسنت!" : "إجابة غير صحيحة"}
        </span>
      </div>
      {!correct ? (
        <p className="mt-2 text-sm text-laila-deep">
          الإجابة النموذجية: <b>{correctAnswerText(question)}</b>
        </p>
      ) : null}
      <p className="mt-2 text-sm leading-7 text-laila-deep">{question.explanation}</p>
      {question.source ? (
        <span className="mt-2 inline-block rounded-full bg-laila-soft px-3 py-1 text-xs font-semibold text-laila-strong">
          المصدر من المنهج: {question.source}
        </span>
      ) : null}
    </div>
  );
}

export function ScoreCircle({ score }: { score: number }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const filled = (Math.max(0, Math.min(100, score)) / 100) * c;
  return (
    <div className="relative mx-auto size-36">
      <svg viewBox="0 0 120 120" className="size-full -rotate-90">
        <circle cx="60" cy="60" r={r} fill="none" stroke="var(--laila-soft)" strokeWidth="10" />
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke="var(--laila-accent)"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${filled} ${c - filled}`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-extrabold text-laila-deep">{score}</span>
        <span className="text-xs text-laila-muted">من 100</span>
      </div>
    </div>
  );
}
