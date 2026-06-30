import { useEffect, useRef, useState, type FormEvent } from "react";
import { useI18n } from "../i18n";
import type { ChatMessage } from "../types";

type ChatScreenProps = {
  messages: ChatMessage[];
  loading: boolean;
  onSend: (text: string, files?: File[]) => void;
  onFinishEarly: () => void;
};

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp", "application/pdf"];

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ChatScreen({
  messages,
  loading,
  onSend,
  onFinishEarly,
}: ChatScreenProps) {
  const { t } = useI18n();
  const [input, setInput] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if ((!text && selectedFiles.length === 0) || loading) return;
    onSend(text, selectedFiles.length ? selectedFiles : undefined);
    setInput("");
    setSelectedFiles([]);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    const valid = files.filter((f) => ALLOWED_TYPES.includes(f.type));
    setSelectedFiles((prev) => [...prev, ...valid].slice(0, 5));
    if (e.target) e.target.value = "";
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleQuickReply = (q: string) => {
    onSend(q, selectedFiles.length ? selectedFiles : undefined);
    setInput("");
    setSelectedFiles([]);
  };

  const quickReplies = [
    t("chat.quick1"),
    t("chat.quick2"),
    t("chat.quick3"),
    t("chat.quick4"),
  ];

  return (
    <section className="flex flex-col animate-fade-in-up">
      <div className="card mb-4 flex min-h-[420px] max-h-[55vh] flex-col overflow-hidden p-0">
        <div className="border-b border-border bg-primary-50 px-4 py-3">
          <p className="text-sm font-medium text-primary-800">
            💬 {t("chat.quickReplies")}
          </p>
        </div>

        <div
          className="flex-1 overflow-y-auto px-4 py-4 space-y-4"
          role="log"
          aria-live="polite"
          aria-label={t("chat.title")}
        >
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === "user" ? "justify-start" : "justify-end"}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
                  msg.role === "user"
                    ? "rounded-br-md bg-primary-600 text-white"
                    : "rounded-bl-md bg-white border border-border text-slate-800"
                }`}
              >
                {msg.role === "assistant" && (
                  <span className="mb-1 block text-xs font-medium text-primary-600">
                    {t("app.title")}
                  </span>
                )}
                {msg.content && <p className="whitespace-pre-wrap">{msg.content}</p>}
                {msg.attachments && msg.attachments.length > 0 && (
                  <div className={`mt-2 flex flex-wrap gap-2 ${msg.role === "user" ? "" : ""}`}>
                    {msg.attachments.map((att) => (
                      <div
                        key={att.id}
                        className={`flex items-center gap-2 rounded-lg p-2 text-xs ${
                          msg.role === "user"
                            ? "bg-white/20 text-white"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {att.type === "image" ? (
                          <img
                            src={att.url}
                            alt={att.name}
                            className="h-16 w-16 rounded object-cover"
                          />
                        ) : (
                          <span className="flex h-10 w-10 items-center justify-center rounded bg-red-100 text-lg font-bold text-red-600">
                            PDF
                          </span>
                        )}
                        <div className="max-w-[120px]">
                          <p className="truncate font-medium">{att.name}</p>
                          <p className="opacity-70">{formatSize(att.size)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-end">
              <div className="flex items-center gap-1 rounded-2xl border border-border bg-white px-4 py-3">
                <span className="typing-dot h-2 w-2 rounded-full bg-primary-400" />
                <span className="typing-dot h-2 w-2 rounded-full bg-primary-400" />
                <span className="typing-dot h-2 w-2 rounded-full bg-primary-400" />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {messages.length <= 2 && !loading && (
          <div className="border-t border-border px-4 py-3">
            <p className="mb-2 text-xs text-muted">{t("chat.quickReplies")}:</p>
            <div className="flex flex-wrap gap-2">
              {quickReplies.map((q) => (
                <button
                  key={q}
                  type="button"
                  className="rounded-full border border-primary-200 bg-primary-50 px-3 py-1.5 text-xs text-primary-800 transition hover:bg-primary-100"
                  onClick={() => handleQuickReply(q)}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {selectedFiles.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2 rounded-xl border border-border bg-white p-2">
          {selectedFiles.map((f, i) => (
            <div
              key={i}
              className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-xs"
            >
              {f.type.startsWith("image/") ? (
                <img
                  src={URL.createObjectURL(f)}
                  alt={f.name}
                  className="h-10 w-10 rounded object-cover"
                />
              ) : (
                <span className="flex h-8 w-8 items-center justify-center rounded bg-red-100 text-xs font-bold text-red-600">
                  PDF
                </span>
              )}
              <div className="max-w-[140px]">
                <p className="truncate font-medium text-slate-800">{f.name}</p>
                <p className="text-slate-500">{formatSize(f.size)}</p>
              </div>
              <button
                type="button"
                className="mr-1 text-slate-400 hover:text-red-500"
                onClick={() => removeFile(i)}
                aria-label={t("common.delete")}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 text-center leading-relaxed">
        ⚠️ {t("summary.disclaimer")}
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            className="input-field min-h-[52px] max-h-32 resize-none flex-1"
            placeholder={t("chat.inputPlaceholder")}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            rows={2}
            disabled={loading}
            aria-label={t("chat.inputPlaceholder")}
          />
          <button
            type="button"
            className="btn-secondary shrink-0 self-end px-3 py-2 text-lg"
            onClick={() => fileInputRef.current?.click()}
            disabled={loading || selectedFiles.length >= 5}
            aria-label={t("chat.uploadFile")}
            title={t("chat.uploadHint")}
          >
            📎
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp,application/pdf"
            multiple
            className="hidden"
            onChange={handleFileSelect}
          />
          <button
            type="submit"
            className="btn-primary shrink-0 self-end px-5"
            disabled={(!input.trim() && selectedFiles.length === 0) || loading}
            aria-label={t("chat.send")}
          >
            {t("chat.send")}
          </button>
        </div>
        <button
          type="button"
          className="text-sm text-primary-600 hover:underline self-center"
          onClick={onFinishEarly}
          disabled={loading || messages.filter((m) => m.role === "user").length < 1}
        >
          {t("chat.finishEarly")}
        </button>
      </form>
    </section>
  );
}
