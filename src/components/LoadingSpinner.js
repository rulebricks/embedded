import * as React from "react";

export default function LoadingSpinner({ height = "600px" }) {
  const normalizedHeight = typeof height === "number" ? `${height}px` : height;

  return (
    <div
      style={{ height: normalizedHeight }}
      className="rulebricks-embed flex items-center justify-center bg-gray-50 rounded-lg"
    >
      <div className="font-sans flex flex-col items-center gap-3 h-full justify-center">
        <div className="w-8 h-8 border-4 border-zinc-600 border-t-transparent rounded-full animate-spin" />
      </div>
    </div>
  );
}

