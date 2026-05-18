"use client";

import { useEffect, useRef, useState } from "react";
import { Send, Loader2, ChevronLeft, RotateCcw } from "lucide-react";
import { useHealthStore } from "@/store/useHealthStore";
import { ChatMessage as ChatMessageType } from "@/lib/types";
import ChatMessageComponent from "@/components/coach/ChatMessage";
import Link from "next/link";

const QUICK_QUESTIONS = [
  "What should I focus on first?",
  "Explain my out-of-range markers",
  "Why am I feeling fatigued?",
  "What does my protocol target?",
];

export default function CoachPage() {
  const { messages, addMessage, clearMessages, labPanel, wearableData, actions, intakeProfile } = useHealthStore();
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Reset conversation every time you leave this page
  useEffect(() => {
    return () => { clearMessages(); };
  }, []);

  useEffect(() => {
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
          messages: [...messages, userMsg].map(m => ({ role: m.role, content: m.content })),
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

      addMessage({ id: aiMsgId, role: "assistant", content: "", timestamp: new Date().toISOString() });

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const lines = decoder.decode(value).split("\n");
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6);
          if (data === "[DONE]") break;
          try {
            const delta = JSON.parse(data).text ?? "";
            if (delta) {
              accumulated += delta;
              useHealthStore.setState(state => ({
                messages: state.messages.map(m => m.id === aiMsgId ? { ...m, content: accumulated } : m),
              }));
            }
          } catch { /* skip malformed chunk */ }
        }
      }
    } catch {
      addMessage({
        id: `ai-err-${Date.now()}`,
        role: "assistant",
        content: "Connection error. Please check that the API key is configured and try again.",
        timestamp: new Date().toISOString(),
      });
    } finally {
      setIsStreaming(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
  }

  const hasLabData = !!labPanel;

  // Auto-briefing: fire once on first open when lab data exists
  const briefingFired = useRef(false);
  useEffect(() => {
    if (briefingFired.current || messages.length > 0 || !labPanel) return;
    briefingFired.current = true;
    const timer = setTimeout(() => {
      sendMessage("Give me a brief health snapshot — the 3 most important things I should know from my labs right now. Be direct, plain English, no clinical terms or lab values.");
    }, 700);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [labPanel]);

  return (
    <div className="flex flex-col h-screen page-enter" style={{ background: "var(--bg)" }}>

      {/* Header */}
      <div
        className="flex items-center gap-3 px-5 pt-12 pb-4"
        style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)" }}
      >
        <Link href="/" className="w-8 h-8 flex items-center justify-center rounded-full flex-shrink-0"
          style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
          <ChevronLeft size={16} color="var(--text2)" />
        </Link>
        <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: "var(--accent-lo)" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round">
            <path d="M2 12h3l3-8 3 16 3-10 3 5 2-3h3" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-bold" style={{ color: "var(--text1)" }}>BioPrecision AI</p>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full pulse-dot" style={{ background: "var(--green)" }} />
            <span className="text-[11px]" style={{ color: "var(--text2)" }}>
              {hasLabData ? `${labPanel!.biomarkers.length} biomarkers loaded` : "Ready"}
            </span>
          </div>
        </div>

        {/* Reset conversation */}
        {messages.length > 0 && !isStreaming && (
          <button
            onClick={() => { clearMessages(); briefingFired.current = false; }}
            className="w-8 h-8 flex items-center justify-center rounded-full flex-shrink-0"
            style={{ background: "var(--bg)", border: "1px solid var(--border)" }}
            title="New conversation"
          >
            <RotateCcw size={13} color="var(--text3)" />
          </button>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-5 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center text-center pt-6 pb-4 gap-3">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{ background: "var(--accent-lo)" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round">
                <path d="M2 12h3l3-8 3 16 3-10 3 5 2-3h3" />
              </svg>
            </div>
            <div>
              <p className="text-[15px] font-semibold" style={{ color: "var(--text1)" }}>
                {intakeProfile?.name ? `Hi ${intakeProfile.name.split(" ")[0]}, I'm your health coach.` : "I'm your health coach."}
              </p>
              <p className="text-[13px] mt-1" style={{ color: "var(--text2)", lineHeight: 1.5 }}>
                {hasLabData
                  ? "I've reviewed your labs. Ask me anything about your results, protocol, or how to optimize a specific marker."
                  : "Upload your lab results so I can give you specific, personalized guidance based on your actual numbers."}
              </p>
            </div>
          </div>
        )}

        {messages.map(msg => <ChatMessageComponent key={msg.id} message={msg} />)}

        {isStreaming && messages[messages.length - 1]?.content === "" && (
          <div className="flex items-start">
            <div className="rounded-2xl px-4 py-3" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <div className="flex gap-1.5">
                {[0, 1, 2].map(i => (
                  <span key={i} className="w-2 h-2 rounded-full animate-bounce"
                    style={{ background: "var(--accent)", animationDelay: `${i * 0.15}s`, opacity: 0.6 }} />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Quick questions */}
      {messages.length === 0 && (
        <div className="px-4 pb-3">
          <div className="grid grid-cols-2 gap-2">
            {QUICK_QUESTIONS.map(q => (
              <button key={q} onClick={() => sendMessage(q)}
                className="rounded-xl px-3 py-3 text-left text-[12px] font-medium transition-opacity active:opacity-60"
                style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text2)" }}>
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="px-4 pb-24 pt-2" style={{ borderTop: "1px solid var(--border)", background: "var(--surface)" }}>
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your labs, protocol, or anything health..."
            rows={1}
            className="flex-1 resize-none outline-none text-[14px] bg-transparent leading-relaxed max-h-28 pt-2"
            style={{ color: "var(--text1)" }}
            onInput={e => {
              const t = e.currentTarget;
              t.style.height = "auto";
              t.style.height = `${t.scrollHeight}px`;
            }}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || isStreaming}
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-opacity disabled:opacity-30"
            style={{ background: "var(--accent)" }}
          >
            {isStreaming
              ? <Loader2 size={15} color="white" className="animate-spin" />
              : <Send size={14} color="white" />}
          </button>
        </div>
      </div>
    </div>
  );
}
