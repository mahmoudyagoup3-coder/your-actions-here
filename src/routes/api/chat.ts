import { createFileRoute } from "@tanstack/react-router";
import { createOpenAI } from "@ai-sdk/openai";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { createClient } from "@supabase/supabase-js";

const BASE_PROMPT = `أنتِ "ليلا"، المساعدة الذكية لموقع «مكتبة اليعقوبي»، مساعدة ذكية داخل موقع عربي لتحميل الكتب والمذكرات الدراسية بصيغة PDF.
- أجب دائمًا بالعربية الفصحى المبسّطة وبإيجاز.
- ساعد الطالب في العثور على الملف المناسب حسب المرحلة والصف والمادة، ووجّهه إلى الصفحة الصحيحة:
  الابتدائية: /stage/preparatory/term-6
  المتوسطة: /stage/middle/grade-1 أو grade-2 أو grade-3
  الثانوية: /stage/secondary/grade-1 أو grade-2 أو grade-3
  البحث العام: /search
- المذكرات متاحة فقط في: الفصل السادس الابتدائي، الثالث المتوسط، الثالث الثانوي.
- لا تخترع ملفات غير موجودة في القائمة. إن لم يوجد الملف، قل ذلك واقترح البحث أو مادة قريبة.
- يمكنك أيضًا شرح الدروس والإجابة عن الأسئلة الدراسية.`;

async function buildCatalog(): Promise<string> {
  try {
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
    const url = process.env["SUPABASE_URL"];
    if (!key || !url) return "";
    const client = createClient(url, key, {
      auth: { persistSession: false },
      global: {
        fetch: (input, init) => {
          const h = new Headers(init?.headers);
          if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) {
            h.delete("Authorization");
          }
          h.set("apikey", key);
          return fetch(input, { ...init, headers: h });
        },
      },
    });
    const { data } = await client
      .from("library_materials")
      .select("title, subject, stage, level, kind")
      .order("created_at", { ascending: false })
      .limit(200);
    if (!data?.length) return "\n\nلا توجد ملفات منشورة على الموقع حاليًا.";
    const lines = data.map(
      (m) => `- ${m.title} | ${m.subject} | ${m.stage}/${m.level} | ${m.kind}`,
    );
    return `\n\nالملفات المتاحة حاليًا على الموقع:\n${lines.join("\n")}`;
  } catch {
    return "";
  }
}

const RATE_LIMIT = 10; // requests
const RATE_WINDOW_MS = 60_000; // per minute
const MAX_MESSAGES = 30;
const MAX_CHARS_PER_MESSAGE = 2_000;
const MAX_TOTAL_CHARS = 12_000;

const hits = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5_000) {
    for (const [key, times] of hits) {
      if (!times.some((t) => now - t < RATE_WINDOW_MS)) hits.delete(key);
    }
  }
  return recent.length > RATE_LIMIT;
}

function messageText(message: UIMessage): string {
  const parts = (message as { parts?: Array<{ type?: string; text?: string }> }).parts ?? [];
  return parts.map((p) => (typeof p.text === "string" ? p.text : "")).join("");
}

function jsonError(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const ip =
          request.headers.get("cf-connecting-ip") ??
          request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
          "unknown";
        if (isRateLimited(ip)) {
          return jsonError("أرسلت رسائل كثيرة بسرعة. انتظر دقيقة ثم حاول مجددًا.", 429);
        }

        const apiKey = process.env["LOVABLE_API_KEY"];
        if (!apiKey) {
          return new Response(JSON.stringify({ error: "ليلا غير مهيّأة حاليًا." }), {
            status: 500,
            headers: { "content-type": "application/json" },
          });
        }

        let body: { messages?: UIMessage[] };
        try {
          body = (await request.json()) as { messages?: UIMessage[] };
        } catch {
          return jsonError("طلب غير صالح.", 400);
        }
        const all = Array.isArray(body.messages) ? body.messages : [];
        if (all.length === 0) return jsonError("لا توجد رسالة.", 400);
        if (all.some((m) => messageText(m).length > MAX_CHARS_PER_MESSAGE)) {
          return jsonError(`الرسالة طويلة جدًا (الحد ${MAX_CHARS_PER_MESSAGE} حرف).`, 413);
        }
        // keep only the most recent turns and cap total size
        const messages = all.slice(-MAX_MESSAGES);
        const totalChars = messages.reduce((sum, m) => sum + messageText(m).length, 0);
        if (totalChars > MAX_TOTAL_CHARS) {
          return jsonError("المحادثة طويلة جدًا، ابدأ محادثة جديدة.", 413);
        }

        const gateway = createOpenAI({
          baseURL: "https://ai.gateway.lovable.dev/v1",
          apiKey,
          headers: {
            "Lovable-API-Key": apiKey,
            "X-Lovable-AIG-SDK": "vercel-ai-sdk",
          },
        });

        try {
          const result = streamText({
            model: gateway.responses("openai/gpt-5.6-terra"),
            system: BASE_PROMPT + (await buildCatalog()),
            messages: await convertToModelMessages(messages),
            abortSignal: request.signal,
            providerOptions: { openai: { store: false } },
          });

          return result.toUIMessageStreamResponse();
        } catch (error) {
          const message = error instanceof Error ? error.message : "خطأ غير متوقع";
          const status = /429/.test(message) ? 429 : /402/.test(message) ? 402 : 500;
          return new Response(JSON.stringify({ error: message }), {
            status,
            headers: { "content-type": "application/json" },
          });
        }
      },
    },
  },
});
