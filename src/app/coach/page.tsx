"use client";

import { useEffect, useRef, useState } from "react";
import { Send, Loader2 } from "lucide-react";
import { useHealthStore } from "@/store/useHealthStore";
import { ChatMessage as ChatMessageType } from "@/lib/types";
import ChatMessageComponent from "@/components/coach/ChatMessage";
import QuickQuestions from "@/components/coach/QuickQuestions";
import Link from "next/link";

export default function CoachPage() {
  const { messages, addMessage, labPanel, wearableData, actions, intakeProfile } = useHealthStore();
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // Scroll to bottom on new messages
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function sendMessage(text: string) {
    if (!text.trim() || isStreaming) return;

    const userMsg: ChatMessageType = {
      id: `msg-${Date.now()}`,
      role: "user",
      content: text.trim(),
      timestamp: new Date().toISOString(),
    };

    addMessage(userMsg);
    setInput("");
    setIsStreaming(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMsg].map((m) => ({
            role: m.role,
            content: m.content,
          })),
          labPanel,
          wearableData,
          intakeProfile,
          todaysActions: actions,
        }),
      });

      if (!res.ok) throw new Error("Chat failed");

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error("No reader");

      const aiMsgId = `ai-${Date.now()}`;
      let accumulated = "";

      // Add empty placeholder
      addMessage({
        id: aiMsgId,
        role: "assistant",
        content: "",
        timestamp: new Date().toISOString(),
      });

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") break;
            try {
              const parsed = JSON.parse(data);
              const delta = parsed.choices?.[0]?.delta?.content ?? "";
              if (delta) {
                accumulated += delta;
                // Update last message
                useHealthStore.setState((state) => ({
                  messages: state.messages.map((m) =>
                    m.id === aiMsgId ? { ...m, content: accumulated } : m
                  ),
                }));
              }
            } catch {
              // skip malformed chunk
            }
          }
        }
      }
    } catch {
      // Fallback response
      addMessage({
        id: `ai-${Date.now()}`,
        role: "assistant",
        content:
          "I'm having trouble connecting right now. Make sure your `ANTHROPIC_API_KEY` is set in `.env.local` and restart the server.",
        timestamp: new Date().toISOString(),
      });
    } finally {
      setIsStreaming(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Gradient header */}
      <div className="gradient-header px-5 pt-12 pb-4 flex items-center gap-3">
        <Link href="/" className="text-white/80 active:text-white">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
        </Link>

        <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
            <path d="M2 12h3l3-8 3 16 3-10 3 5 2-3h3" />
          </svg>
        </div>

        <div className="flex-1">
          <p className="text-[15px] font-bold text-white">BioPrecision AI</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="w-2 h-2 rounded-full bg-green-400 pulse-dot" />
            <span className="text-[12px] text-white/80">Active</span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-4"
        style={{ scrollBehavior: "smooth" }}
      >
        {messages.map((msg) => (
          <ChatMessageComponent key={msg.id} message={msg} />
        ))}

        {isStreaming && messages[messages.length - 1]?.content === "" && (
          <div className="flex items-start">
            <div className="bg-white rounded-2xl px-4 py-3 shadow-card">
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Quick questions (only show if few messages) */}
      {messages.length <= 2 && (
        <QuickQuestions onSelect={(q) => sendMessage(q)} />
      )}

      {/* Input bar */}
      <div className="px-4 pb-20 pt-2 bg-background border-t border-gray-100">
        <div className="flex items-end gap-2 bg-white rounded-2xl px-4 py-2.5 shadow-card border border-gray-100">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask me anything about your health..."
            rows={1}
            className="flex-1 resize-none outline-none text-[14px] text-text-primary placeholder:text-text-muted bg-transparent leading-relaxed max-h-28"
            style={{ height: "auto" }}
            onInput={(e) => {
              const t = e.currentTarget;
              t.style.height = "auto";
              t.style.height = `${t.scrollHeight}px`;
            }}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || isStreaming}
            className="w-9 h-9 gradient-btn rounded-xl flex items-center justify-center flex-shrink-0 disabled:opacity-40 transition-opacity active:scale-95"
          >
            {isStreaming ? (
              <Loader2 size={16} className="text-white animate-spin" />
            ) : (
              <Send size={15} className="text-white" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
