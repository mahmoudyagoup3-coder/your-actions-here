import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { DAILY_QUIZ_LIMIT, MAX_QUESTIONS } from "@/lib/laila-limits";
import { QUESTION_TYPES } from "@/lib/laila-schema";

/** حدّ تحديات المقال اليومي (الاختبارات محدودة بـ DAILY_QUIZ_LIMIT). */
const DAILY_ESSAY_LIMIT = 5;

const quizInputSchema = z.object({
  stage: z.string().min(1).max(60),
  level: z.string().min(1).max(60),
  subject: z.string().min(1).max(80),
  track: z.string().max(20).optional(),
  difficulty: z.enum(["easy", "medium", "hard"]),
  count: z.number().int().min(5).max(MAX_QUESTIONS),
  types: z.array(z.enum(QUESTION_TYPES)).min(1).max(4),
});

const essayTopicInputSchema = z.object({
  stage: z.string().min(1).max(60),
  level: z.string().min(1).max(60),
  subject: z.string().min(1).max(80),
  track: z.string().max(20).optional(),
  difficulty: z.enum(["easy", "medium", "hard"]),
});

const essayGradeInputSchema = z.object({
  stage: z.string().min(1).max(60),
  level: z.string().min(1).max(60),
  subject: z.string().min(1).max(80),
  difficulty: z.enum(["easy", "medium", "hard"]),
  topic: z.string().min(1).max(1000),
  prompt: z.string().min(1).max(2000),
  points: z.array(z.string().max(300)).min(1).max(10),
  text: z.string().min(50).max(12000),
});

function startOfTodayIso(): string {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

function aiError(error: unknown): "maintenance" | "ai" {
  const message = error instanceof Error ? error.message : "";
  if (message === "maintenance") return "maintenance";
  console.error("[laila] ai request failed", error);
  return "ai";
}

export const generateQuizFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => quizInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    // نظام الحصص: تحقق من الحد اليومي في الخادم لا في الواجهة فقط.
    const { count } = await context.supabase
      .from("laila_attempts")
      .select("id", { count: "exact", head: true })
      .eq("kind", "quiz")
      .gte("created_at", startOfTodayIso());
    if ((count ?? 0) >= DAILY_QUIZ_LIMIT) return { error: "limit" as const };
    try {
      const { generateQuizQuestions } = await import("@/lib/laila.server");
      return { questions: await generateQuizQuestions(data) };
    } catch (error) {
      return { error: aiError(error) };
    }
  });

export const createEssayTopicFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => essayTopicInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { count } = await context.supabase
      .from("laila_attempts")
      .select("id", { count: "exact", head: true })
      .eq("kind", "essay")
      .gte("created_at", startOfTodayIso());
    if ((count ?? 0) >= DAILY_ESSAY_LIMIT) return { error: "essay_limit" as const };
    try {
      const { generateEssayTopic } = await import("@/lib/laila.server");
      return { topic: await generateEssayTopic(data) };
    } catch (error) {
      return { error: aiError(error) };
    }
  });

export const gradeEssayFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => essayGradeInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    try {
      const { gradeEssay } = await import("@/lib/laila.server");
      const evaluation = await gradeEssay(data);
      // تسجيل المحاولة في سجل الطالب (RLS تضمن ملكية السجل).
      const { error: insertError } = await context.supabase.from("laila_attempts").insert({
        user_id: context.userId,
        kind: "essay",
        stage: data.stage,
        level: data.level,
        subject: data.subject,
        difficulty: data.difficulty,
        question_count: 1,
        correct_count: 0,
        total_count: 1,
        score: evaluation.score,
        details: {
          topic: data.topic,
          prompt: data.prompt,
          points: data.points,
          evaluation,
        },
      });
      if (insertError) {
        console.error("[laila] essay insert failed", insertError);
        return { evaluation, saved: false as const };
      }
      return { evaluation, saved: true as const };
    } catch (error) {
      return { error: aiError(error) };
    }
  });
