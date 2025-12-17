import { XMarkIcon } from "@heroicons/react/20/solid";
import { createPortal } from "react-dom";

/**
 * Embedded modal overlay that renders within the embed container
 * as a full-screen panel instead of a centered modal.
 * Uses a portal to find the closest embed container.
 */
export default function Modal({ open, close, title, children }) {
  if (!open) return null;

  // Portal to the embed container to ensure full coverage
  // Uses a data attribute to find the embed container
  const portalTarget =
    typeof document !== "undefined"
      ? document.querySelector('[data-embed-container="true"]') || document.body
      : null;

  const content = (
    <div
      className="absolute font-sans inset-0 z-[9999] flex flex-col bg-white"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header with close button */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50 flex-shrink-0">
        <h2 className="text-lg font-semibold text-gray-900">
          {title || "Modal"}
        </h2>
        <button
          onClick={close}
          className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-md transition-colors"
        >
          <XMarkIcon className="w-5 h-5" />
        </button>
      </div>
      {/* Content area - scrollable */}
      <div className="flex-1 overflow-auto">{children}</div>
    </div>
  );

  // If we can't find the portal target, render inline
  if (!portalTarget || portalTarget === document.body) {
    return content;
  }

  // Use ReactDOM.createPortal to render in the embed container
  return createPortal(content, portalTarget);
}
