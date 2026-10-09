import { useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Bot, Loader2, MessageCircle, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const SUGGESTIONS = [
  "ما الكتب المتاحة للصف الثالث الثانوي؟",
  "أين أجد مذكرات الفصل السادس؟",
  "اشرح لي درس المتجهات باختصار",
];

export function AiAssistant() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });

  const busy = status === "submitted" || status === "streaming";

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, status]);

  const submit = (text: string) => {
    const value = text.trim();
    if (!value || busy) return;
    setInput("");
    void sendMessage({ text: value });
  };

  return (
    <>
      <Button
        size="lg"
        aria-label="افتح المساعدة الذكية ليلا"
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-5 left-5 z-50 size-14 rounded-full border border-chat-border bg-chat-launcher p-0 text-chat-launcher-foreground shadow-lg transition-colors hover:bg-[var(--primary-hover)]"
      >
        {open ? <X className="size-6" /> : <MessageCircle className="size-6" />}
      </Button>

      {open ? (
        <div dir="rtl" className="fixed bottom-24 left-5 z-50 flex h-[30rem] w-[min(22rem,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-2xl border border-chat-border bg-chat-surface text-chat-surface-foreground shadow-lift">
          <header className="flex items-center gap-2 border-b border-chat-border bg-chat-header px-4 py-3">
            <span className="flex size-9 items-center justify-center rounded-full bg-chat-accent text-chat-accent-foreground">
              <Bot className="size-5" />
            </span>
            <div>
              <p className="text-sm font-bold">ليلا — المساعدة الذكية</p>
              <p className="text-xs text-muted-foreground">يساعدك في إيجاد الملفات وشرح الدروس</p>
            </div>
          </header>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {messages.length === 0 ? (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  مرحبًا، أنا ليلا! اسأليني/اسألني عن أي كتاب أو مذكرة أو ورقة عمل أو حصة، أو اطلب شرحًا لدرس.
                </p>
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => submit(s)}
                    className="block w-full rounded-xl border border-chat-border bg-chat-bubble px-3 py-2 text-right text-xs transition-colors hover:bg-chat-header"
                  >
                    {s}
                  </button>
                ))}
              </div>
            ) : null}

            {messages.map((message) => {
              const text = message.parts
                .filter((p) => p.type === "text")
                .map((p) => (p as { text: string }).text)
                .join("");
              if (!text) return null;
              return (
                <div
                  key={message.id}
                  className={
                    message.role === "user"
                      ? "ms-auto w-fit max-w-[85%] rounded-2xl bg-primary px-3 py-2 text-sm text-primary-foreground"
                      : "me-auto w-fit max-w-[90%] rounded-2xl bg-chat-bubble px-3 py-2 text-sm whitespace-pre-wrap"
                  }
                >
                  {text}
                </div>
              );
            })}

            {busy ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="size-4 animate-spin" /> يكتب الآن…
              </div>
            ) : null}

            {error ? (
              /maintenance/.test(error.message) ? (
                <p className="rounded-xl bg-chat-bubble px-3 py-2 text-xs text-muted-foreground">
                  ليلا في استراحة قصيرة للصيانة 🌙 يمكنك تصفّح الكتب والمذكرات مباشرة من المراحل الدراسية، وستعود قريبًا.
                </p>
              ) : (
                <p className="rounded-xl bg-destructive/10 px-3 py-2 text-xs text-destructive">
                  {/429|كثيرة|مشغولة/.test(error.message)
                    ? "أرسلت رسائل كثيرة بسرعة. انتظر دقيقة ثم حاول مجددًا."
                    : "تعذّر الاتصال بـ ليلا. حاول مرة أخرى."}
                </p>
              )
            ) : null}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit(input);
            }}
            className="flex items-center gap-2 border-t border-chat-border p-3"
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="اكتب سؤالك…"
              className="flex-1 border-chat-border bg-chat-bubble focus-visible:border-chat-accent focus-visible:ring-chat-accent/25"
            />
            <Button
              type="submit"
              size="icon"
              disabled={busy || !input.trim()}
              className="bg-chat-accent text-chat-accent-foreground hover:bg-chat-accent/90"
            >
              <Send className="size-4" />
            </Button>
          </form>
        </div>
      ) : null}
    </>
  );
}
