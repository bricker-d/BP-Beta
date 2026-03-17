"use client";

import { ChatMessage as ChatMessageType } from "@/lib/types";
import { formatTime } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface ChatMessageProps {
  message: ChatMessageType;
}

// Render basic markdown bold (**text**)
function renderContent(content: string) {
  const parts = content.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    // Handle newlines
    return part.split("\n").map((line, j, arr) => (
      <span key={`${i}-${j}`}>
        {line}
        {j < arr.length - 1 && <br />}
      </span>
    ));
  });
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex flex-col", isUser ? "items-end" : "items-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-4 py-3 text-[14px] leading-relaxed",
          isUser
            ? "gradient-btn text-white rounded-br-sm"
            : "bg-white text-text-primary shadow-card rounded-bl-sm"
        )}
      >
        {renderContent(message.content)}
      </div>
      <span className="text-[10px] text-text-muted mt-1 px-1">
        {formatTime(message.timestamp)}
      </span>
    </div>
  );
}
