"use client";

export default function ConsumerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-100 flex items-start justify-center">
      <div
        className="relative bg-white w-full shadow-2xl overflow-hidden flex flex-col min-h-screen"
        style={{ maxWidth: 430 }}
      >
        {children}
      </div>
    </div>
  );
}
