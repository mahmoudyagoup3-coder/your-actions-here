/** حدود نظام الحصص والاختبارات في غرفة ليلا. */

/** الحد اليومي: اختبارين كحد أقصى لكل طالب. */
export const DAILY_QUIZ_LIMIT = 2;

/** الحد الأقصى لعدد أسئلة الاختبار الواحد. */
export const MAX_QUESTIONS = 100;

export interface AttemptLite {
  kind: string;
  created_at: string;
  score: number;
}

/** عدد الاختبارات المأخوذة اليوم (بحسب تاريخ UTC) من سجلات المحاولات. */
export function quizzesTakenToday(attempts: AttemptLite[], now: Date = new Date()): number {
  const dayStart = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const dayEnd = dayStart + 86_400_000;
  return attempts.filter((a) => {
    if (a.kind !== "quiz") return false;
    const t = Date.parse(a.created_at);
    return Number.isFinite(t) && t >= dayStart && t < dayEnd;
  }).length;
}

/** عدد الاختبارات المتبقية للطالب اليوم (0 إلى DAILY_QUIZ_LIMIT). */
export function quizzesRemainingToday(attempts: AttemptLite[], now: Date = new Date()): number {
  return Math.max(0, DAILY_QUIZ_LIMIT - quizzesTakenToday(attempts, now));
}
