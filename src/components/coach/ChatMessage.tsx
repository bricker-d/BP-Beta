"use client";

import React from "react";
import { ChatMessage as ChatMessageType } from "@/lib/types";
import { formatTime } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface ChatMessageProps {
  message: ChatMessageType;
}

// Render plain text — strip markdown headers, handle bold and newlines
function renderLine(line: string, key: string) {
  // Strip leading ## / ### markdown headers
  const stripped = line.replace(/^#{1,4}\s+/, "");
  // Split on **bold**
  const parts = stripped.split(/(\*\*[^*]+\*\*)/g);
  return (
    <span key={key}>
      {parts.map((part, i) =>
        part.startsWith("**") && part.endsWith("**")
          ? <strong key={i}>{part.slice(2, -2)}</strong>
          : <span key={i}>{part}</span>
      )}
    </span>
  );
}

function renderContent(content: string) {
  const lines = content.split("\n");
  const result: React.ReactNode[] = [];

  lines.forEach((line, i) => {
    if (i > 0) result.push(<br key={`br-${i}`} />);
    result.push(renderLine(line, `line-${i}`));
  });

  return result;
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
