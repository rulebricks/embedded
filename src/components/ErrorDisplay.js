import * as React from "react";

export default function ErrorDisplay({ height = "600px", title, message }) {
  const normalizedHeight = typeof height === "number" ? `${height}px` : height;

  return (
    <div
      style={{ height: normalizedHeight }}
      className="rulebricks-embed flex items-center justify-center bg-red-50 rounded-lg"
    >
      <div className="font-sans text-center max-w-md p-6 h-full flex flex-col justify-center">
        <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-6 h-6 text-red-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-red-900 mb-2">{title}</h3>
        <p className="text-red-700 text-sm">{message}</p>
      </div>
    </div>
  );
}

