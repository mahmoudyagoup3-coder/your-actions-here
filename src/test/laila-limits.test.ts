import { describe, expect, it } from "vitest";
import {
  DAILY_QUIZ_LIMIT,
  MAX_QUESTIONS,
  quizzesRemainingToday,
  quizzesTakenToday,
} from "@/lib/laila-limits";

/** قاعدة الحصص: بحد أقصى اختبارين يوميًا لكل طالب، والحد الأقصى 100 سؤال. */
describe("laila daily quiz limits", () => {
  const now = new Date("2026-10-22T12:00:00Z");
  const attempt = (kind: string, iso: string) => ({ kind, created_at: iso, score: 80 });

  it("يمنع الطالب بعد اختبارين في نفس اليوم", () => {
    expect(DAILY_QUIZ_LIMIT).toBe(2);
    const attempts = [
      attempt("quiz", "2026-10-22T09:00:00Z"),
      attempt("quiz", "2026-10-22T10:00:00Z"),
    ];
    expect(quizzesTakenToday(attempts, now)).toBe(2);
    expect(quizzesRemainingToday(attempts, now)).toBe(0);
  });

  it("لا يحسب اختبارات الأمس ولا تحديات المقال في الحد اليومي", () => {
    const attempts = [
      attempt("quiz", "2026-10-21T20:00:00Z"),
      attempt("essay", "2026-10-22T09:00:00Z"),
    ];
    expect(quizzesTakenToday(attempts, now)).toBe(0);
    expect(quizzesRemainingToday(attempts, now)).toBe(DAILY_QUIZ_LIMIT);
  });

  it("الحد الأقصى لعدد أسئلة الاختبار 100 سؤال", () => {
    expect(MAX_QUESTIONS).toBe(100);
  });
});
