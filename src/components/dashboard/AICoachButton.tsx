"use client";

import { useRouter } from "next/navigation";
import { MessageCircle } from "lucide-react";

export default function AICoachButton() {
  const router = useRouter();

  return (
    <div>
      <h2 className="text-[17px] font-bold text-text-primary mb-2">AI Health Coach</h2>
      <button
        onClick={() => router.push("/coach")}
        className="w-full gradient-btn rounded-2xl p-4 flex items-center gap-4 active:opacity-90 active:scale-[0.98] transition-all shadow-card-lg"
      >
        <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
          <MessageCircle size={22} className="text-white" />
        </div>
        <div className="text-left">
          <p className="text-[15px] font-bold text-white">Start Conversation</p>
          <p className="text-[13px] text-white/80 mt-0.5">
            Get personalized insights and support
          </p>
        </div>
      </button>
    </div>
  );
}
