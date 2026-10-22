import { z } from "zod";

/** رسالة الصيانة المعروضة للمستخدم عندما لا يتوفر مفتاح الذكاء الاصطناعي. */
export const AI_MAINTENANCE = "ليلا في استراحة قصيرة للصيانة 🌙 حاول مرة أخرى بعد قليل.";

export const QUESTION_TYPES = ["true_false", "fill_blank", "mcq", "matching"] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  true_false: "صح أو خطأ",
  fill_blank: "إكمال الفراغ",
  mcq: "اختيار من متعدد",
  matching: "توصيل ومطابقة",
};

export const DIFFICULTIES = [
  { key: "easy", name: "سهل", minutes: 15 },
  { key: "medium", name: "متوسط", minutes: 25 },
  { key: "hard", name: "صعب", minutes: 40 },
] as const;
export type DifficultyKey = (typeof DIFFICULTIES)[number]["key"];

export function difficultyName(key: string): string {
  return DIFFICULTIES.find((d) => d.key === key)?.name ?? key;
}

export function difficultyMinutes(key: string): number {
  return DIFFICULTIES.find((d) => d.key === key)?.minutes ?? 20;
}

/** السؤال كما يولّده الذكاء الاصطناعي (قبل التنقية). */
export const RawQuestionSchema = z.object({
  type: z.enum(QUESTION_TYPES),
  question: z.string(),
  options: z.array(z.string()).nullable().optional(),
  pairs: z
    .array(z.object({ left: z.string(), right: z.string() }))
    .nullable()
    .optional(),
  answer_bool: z.boolean().nullable().optional(),
  answer_text: z.string().nullable().optional(),
  answer_variants: z.array(z.string()).nullable().optional(),
  answer_index: z.number().int().min(0).max(9).nullable().optional(),
  explanation: z.string(),
  source: z.string(),
});
export type RawQuestion = z.infer<typeof RawQuestionSchema>;

export interface QuizBase {
  type: QuestionType;
  question: string;
  explanation: string;
  source: string;
}
export interface TfQuestion extends QuizBase {
  type: "true_false";
  answer_bool: boolean;
}
export interface McqQuestion extends QuizBase {
  type: "mcq";
  options: string[];
  answer_index: number;
}
export interface FillQuestion extends QuizBase {
  type: "fill_blank";
  answer_text: string;
  answer_variants: string[];
}
export interface MatchPair {
  left: string;
  right: string;
}
export interface MatchQuestion extends QuizBase {
  type: "matching";
  pairs: MatchPair[];
}
export type QuizQuestion = TfQuestion | McqQuestion | FillQuestion | MatchQuestion;

/** تنقية سؤال مولَّد: يرفض أي سؤال ناقص البيانات. */
export function normalizeQuestion(raw: RawQuestion): QuizQuestion | null {
  const question = raw.question?.trim();
  if (!question) return null;
  const base = {
    type: raw.type,
    question,
    explanation: raw.explanation?.trim() || "راجع الدرس المرتبط بهذا السؤال.",
    source: raw.source?.trim() || "",
  };
  if (raw.type === "true_false" && typeof raw.answer_bool === "boolean") {
    return { ...base, type: "true_false", answer_bool: raw.answer_bool };
  }
  if (
    raw.type === "mcq" &&
    raw.options &&
    raw.options.length >= 2 &&
    typeof raw.answer_index === "number" &&
    raw.answer_index >= 0 &&
    raw.answer_index < raw.options.length
  ) {
    const options = raw.options.slice(0, 4).map((o) => String(o).trim()).filter(Boolean);
    if (options.length < 2 || raw.answer_index >= options.length) return null;
    return { ...base, type: "mcq", options, answer_index: raw.answer_index };
  }
  if (raw.type === "fill_blank" && raw.answer_text && raw.answer_text.trim()) {
    return {
      ...base,
      type: "fill_blank",
      answer_text: raw.answer_text.trim(),
      answer_variants: (raw.answer_variants ?? []).map((v) => String(v).trim()).filter(Boolean),
    };
  }
  if (
    raw.type === "matching" &&
    raw.pairs &&
    raw.pairs.length >= 2 &&
    raw.pairs.length <= 6 &&
    raw.pairs.every((p) => p.left?.trim() && p.right?.trim())
  ) {
    return {
      ...base,
      type: "matching",
      pairs: raw.pairs.map((p) => ({ left: p.left.trim(), right: p.right.trim() })),
    };
  }
  return null;
}

/** تطبيع النص العربي لمقارنة إجابات إكمال الفراغ. */
export function normalizeArabicText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\u064B-\u0652\u0670\u0640]/g, "") // التشكيل والتطويل
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/\s+/g, " ");
}

export function fillBlankMatches(answer: string, expected: string, variants: string[] = []): boolean {
  const norm = normalizeArabicText(answer);
  if (!norm) return false;
  return [expected, ...variants].some((v) => normalizeArabicText(v) === norm);
}

/** استجابة الطالب على سؤال التوصيل: فهرس الزوج الأيسر -> فهرس الزوج الأيمن المختار. */
export type MatchingResponse = Record<number, number>;

export interface GradedQuestion {
  question: QuizQuestion;
  response: unknown;
  correct: boolean;
  /** 0 إلى 1 (يعطي جزئيًا لأسئلة التوصيل). */
  partial: number;
}

export function gradeQuestion(question: QuizQuestion, response: unknown): GradedQuestion {
  if (question.type === "true_false") {
    const correct = typeof response === "boolean" && response === question.answer_bool;
    return { question, response, correct, partial: correct ? 1 : 0 };
  }
  if (question.type === "mcq") {
    const correct = typeof response === "number" && response === question.answer_index;
    return { question, response, correct, partial: correct ? 1 : 0 };
  }
  if (question.type === "fill_blank") {
    const correct =
      typeof response === "string" &&
      fillBlankMatches(response, question.answer_text, question.answer_variants);
    return { question, response, correct, partial: correct ? 1 : 0 };
  }
  // matching: تصحيح جزئي بحسب الأزواج الصحيحة.
  const map = (response ?? {}) as MatchingResponse;
  const total = question.pairs.length;
  let matched = 0;
  for (let i = 0; i < total; i += 1) if (map[i] === i) matched += 1;
  const partial = total > 0 ? matched / total : 0;
  return { question, response, correct: matched === total, partial };
}

/** دقة كل نوع سؤال لبناء التقرير النهائي. */
export function typeAccuracy(results: GradedQuestion[]): {
  type: QuestionType;
  correct: number;
  total: number;
  percent: number;
}[] {
  const stats = new Map<QuestionType, { correct: number; total: number }>();
  for (const r of results) {
    const entry = stats.get(r.question.type) ?? { correct: 0, total: 0 };
    entry.total += 1;
    if (r.correct) entry.correct += 1;
    stats.set(r.question.type, entry);
  }
  return [...stats.entries()].map(([type, s]) => ({
    type,
    correct: s.correct,
    total: s.total,
    percent: s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0,
  }));
}

/** موضوع تحدي المقال كما يولّده الذكاء الاصطناعي. */
export const EssayTopicSchema = z.object({
  topic: z.string(),
  prompt: z.string(),
  points: z.array(z.string()),
});
export type EssayTopic = z.infer<typeof EssayTopicSchema>;

/** تقييم ليلا للمقال بعد التسليم. */
export const EssayEvaluationSchema = z.object({
  score: z.number().int().min(0).max(100),
  summary: z.string(),
  strengths: z.array(z.string()),
  covered: z.array(z.string()),
  missing: z.array(z.string()),
  improvements: z.array(z.string()),
});
export type EssayEvaluation = z.infer<typeof EssayEvaluationSchema>;
