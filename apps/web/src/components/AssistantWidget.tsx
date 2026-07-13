import { useRef, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import type { AssistantChatMessage, AssistantChatResponse } from "@claimsarathi/shared";
import { apiClient, ApiError } from "../api/client";

export function AssistantWidget() {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<AssistantChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  function scrollToBottom() {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    });
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const question = input.trim();
    if (!question || isSending) return;

    const nextMessages: AssistantChatMessage[] = [...messages, { role: "user", content: question }];
    setMessages(nextMessages);
    setInput("");
    setError(null);
    setIsSending(true);
    scrollToBottom();

    try {
      const response = await apiClient.post<AssistantChatResponse>("/assistant/chat", { messages: nextMessages });
      setMessages([...nextMessages, { role: "assistant", content: response.reply }]);
    } catch (err) {
      if (err instanceof ApiError && err.status === 503) {
        setError(t("assistant.notConfigured"));
      } else {
        setError(t("assistant.error"));
      }
    } finally {
      setIsSending(false);
      scrollToBottom();
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-3">
      {isOpen && (
        <div className="flex h-[28rem] w-80 max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/10">
          <div className="flex items-center justify-between bg-brand-gradient px-4 py-3">
            <span className="text-sm font-semibold text-white">{t("assistant.title")}</span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label={t("assistant.close")}
              className="rounded-full px-2 py-0.5 text-white/90 hover:bg-white/10 hover:text-white"
            >
              ✕
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-3 py-3">
            {messages.length === 0 && (
              <div className="rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-700">{t("assistant.greeting")}</div>
            )}
            {messages.map((message, index) => (
              <div
                key={index}
                className={[
                  "max-w-[85%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm",
                  message.role === "user"
                    ? "ml-auto bg-gradient-to-r from-brand-500 to-amber-500 text-white"
                    : "bg-gray-100 text-gray-800",
                ].join(" ")}
              >
                {message.content}
              </div>
            ))}
            {isSending && <div className="rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-400">{t("assistant.thinking")}</div>}
            {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
          </div>

          <form onSubmit={handleSubmit} className="flex gap-2 border-t border-gray-100 p-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t("assistant.placeholder")}
              className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
            <button
              type="submit"
              disabled={isSending || !input.trim()}
              className="rounded-md bg-gradient-to-r from-brand-500 to-amber-500 px-3 py-2 text-sm font-medium text-white transition hover:from-brand-600 hover:to-amber-600 disabled:opacity-50"
            >
              {t("assistant.send")}
            </button>
          </form>
        </div>
      )}

      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-gradient text-2xl text-white shadow-xl shadow-orange-900/30 transition hover:scale-105"
        aria-label={t("assistant.title")}
      >
        {isOpen ? "✕" : "💬"}
      </button>
    </div>
  );
}
