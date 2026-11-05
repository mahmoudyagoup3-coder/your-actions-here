import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const ChatBodySchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(6000),
      }),
    )
    .min(1)
    .max(24),
  context: z
    .object({
      stage: z.string().max(60).optional(),
      level: z.string().max(60).optional(),
      subject: z.string().max(80).optional(),
    })
    .optional(),
});

export const Route = createFileRoute("/api/laila-chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // تُحمَّل وحدة الخادم داخل المعالج فقط (لا تصل لحزمة الواجهة).
        const { clientIp, rateLimit, buildChatSystem, getGeminiModel } = await import(
          "@/lib/laila.server"
        );
        const { AI_MAINTENANCE } = await import("@/lib/laila-schema");

        const ip = clientIp(request);
        // 30 رسالة في الساعة لكل عنوان IP.
        if (!rateLimit(`chat:${ip}`, 30, 3_600_000)) {
          return Response.json(
            { error: "رسائل كثيرة! خذ نفسًا وحاول بعد قليل." },
            { status: 429 },
          );
        }

        let body: z.infer<typeof ChatBodySchema>;
        try {
          body = ChatBodySchema.parse(await request.json());
        } catch {
          return Response.json({ error: "طلب غير صالح." }, { status: 400 });
        }

        const model = getGeminiModel();
        if (!model) {
          return Response.json({ error: AI_MAINTENANCE }, { status: 503 });
        }

        try {
          const { streamText } = await import("ai");
          const result = streamText({
            model,
            system: buildChatSystem(body.context),
            messages: body.messages,
          });
          // بث الرد نصًا: عند فشل النموذج تظهر رسالة ودية داخل الدردشة بدل رد فارغ.
          const encoder = new TextEncoder();
          const stream = new ReadableStream<Uint8Array>({
            async start(controller) {
              try {
                for await (const chunk of result.textStream) {
                  controller.enqueue(encoder.encode(chunk));
                }
              } catch (streamError) {
                console.error("[laila-chat] stream failed", streamError);
                controller.enqueue(
                  encoder.encode("ليلا مشغولة قليلًا الآن 🌙 حاولي مرة أخرى بعد لحظات."),
                );
              } finally {
                controller.close();
              }
            },
          });
          return new Response(stream, {
            headers: { "content-type": "text/plain; charset=utf-8" },
          });
        } catch (error) {
          console.error("[laila-chat] failed", error);
          return Response.json({ error: "تعذّر الوصول إلى ليلا الآن." }, { status: 502 });
        }
      },
    },
  },
});
