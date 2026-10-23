import { useEffect, useRef, useState } from "react";
import { Moon, SendHorizonal } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTIONS = [
  "اشرح لي درسًا بصورة سهلة",
  "لخّص لي أهم النقاط في مادتي",
  "أعطني أسئلة مراجعة سريعة",
];

const GREETING: ChatMessage = {
  role: "assistant",
  content: "أهلًا بك! أنا ليلا 🌙 اسألني عن أي درس أو مادة، وسأساعدك خطوة بخطوة.",
};

export function LailaChat({
  student,
}: {
  student?: { stage?: string; level?: string; subject?: string };
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([GREETING]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function send(text: string) {
    const content = text.trim();
    if (!content || busy) return;
    const history = [...messages, { role: "user" as const, content }];
    setMessages(history);
    setInput("");
    setBusy(true);

    try {
      const res = await fetch("/api/laila-chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: history.slice(-20), context: student }),
      });

      if (!res.ok || !res.body) {
        let fallback = "تعذّر الوصول إلى ليلا الآن، حاول مرة أخرى.";
        try {
          const data = (await res.json()) as { error?: string };
          if (data?.error) fallback = String(data.error);
        } catch {
          // تجاهل جسم الاستجابة غير المتوقع
        }
        setMessages([...history, { role: "assistant", content: fallback }]);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      setMessages([...history, { role: "assistant", content: "" }]);
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setMessages((prev) => {
          const copy = [...prev];
          copy[copy.length - 1] = { role: "assistant", content: acc };
          return copy;
        });
      }
    } catch {
      setMessages((prev) =>
        prev.at(-1)?.content
          ? prev
          : [...history, { role: "assistant", content: "انقطع الاتصال بليلا. حاول مرة أخرى." }],
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-[62vh] min-h-[420px] flex-col overflow-hidden rounded-3xl border border-laila-border bg-laila-surface shadow-sm">
      <div className="flex items-center gap-3 border-b border-laila-border bg-laila-header px-4 py-3">
        <span className="flex size-10 items-center justify-center rounded-2xl bg-laila-accent text-white">
          <Moon className="size-5" />
        </span>
        <div>
          <p className="font-bold text-laila-deep">ليلا</p>
          <p className="text-xs text-laila-muted">
            {busy ? "ليلا تكتب الآن…" : "مساعدتك الدراسية الذكية — متصلة"}
          </p>
        </div>
      </div>

      <div ref={scrollRef} className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
        {messages.map((m, i) => (
          <div
            key={i}
            className={cn(
              "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-7 whitespace-pre-wrap",
              m.role === "user"
                ? "self-start rounded-br-sm bg-laila-accent text-white"
                : "self-end rounded-bl-sm border border-laila-border bg-laila-bubble text-laila-deep",
            )}
          >
            {m.content || "…"}
          </div>
        ))}
        {messages.length <= 1 ? (
          <div className="flex flex-wrap gap-2 self-end">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => void send(s)}
                className="rounded-full border border-laila-border bg-laila-bubble px-3 py-1.5 text-xs font-semibold text-laila-strong transition hover:bg-laila-soft"
              >
                {s}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
        className="flex items-center gap-2 border-t border-laila-border bg-laila-header p-3"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="اكتب سؤالك لليلا…"
          enterKeyHint="send"
          className="h-11 flex-1 rounded-xl border-2 border-laila-border bg-white px-4 text-sm text-laila-deep outline-none transition focus:border-laila-accent"
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          aria-label="إرسال"
          className="flex size-11 items-center justify-center rounded-xl bg-laila-accent text-white transition hover:bg-laila-accent/90 active:scale-95 disabled:opacity-50"
        >
          <SendHorizonal className="size-5" />
        </button>
      </form>
    </div>
  );
}
