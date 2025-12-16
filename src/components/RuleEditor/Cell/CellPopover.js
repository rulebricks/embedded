import { Transition } from "@headlessui/react";
import classNames from "classnames";
import { useState } from "react";
import { usePopper } from "react-popper";
import { createPortal } from "react-dom";

// Stub fonts for embed mode
const archivo = { variable: "--font-archivo" };
const sourceCodePro = { variable: "--font-source-code-pro" };
const jetbrainsMono = { variable: "--font-jetbrains-mono" };

export default function CellPopover({
  referenceElement,
  accept,
  reject,
  valid,
  isPinned,
  children,
}) {
  const [popperElement, setPopperElement] = useState();
  const { styles, attributes } = usePopper(referenceElement, popperElement, {
    placement: "bottom-start",
    strategy: "fixed",
  });

  // Ensure popovers are always above the data grid (react-data-grid creates stacking contexts)
  const popoverZIndex = 999999;

  const portalTarget =
    typeof document !== "undefined"
      ? referenceElement?.closest?.('[data-embed-container="true"]') ||
        document.querySelector('[data-embed-container="true"]')
      : null;

  const popover = (
    <div
      ref={setPopperElement}
      style={{ ...styles.popper, minWidth: "24em", zIndex: popoverZIndex }}
      {...attributes.popper}
      className={classNames(
        "cell-popover bg-white rounded-sm border border-neutral-300 shadow-md p-3 flex flex-col",
        isPinned &&
          `font-sans ${archivo.variable} ${jetbrainsMono.variable} ${sourceCodePro.variable}`
      )}
    >
      {children}
      <div className="flex mt-3 flex-row-reverse items-center">
        <button
          className={classNames(
            "cell-popover-save flex flex-row px-2.5 py-1.5 rounded-sm text-sm font-medium text-white",
            valid && "bg-editorBlack hover:bg-neutral-600",
            !valid &&
              "text-gray-300 pointer-events-none bg-neutral-400 cursor-not-allowed"
          )}
          onClick={accept}
          disabled={!valid}
        >
          Save
        </button>
        <button
          className={classNames(
            "cell-popover-cancel flex flex-row px-2.5 py-1.5 mr-1.5 rounded-sm text-sm font-medium bg-red-700 hover:bg-red-800 text-white"
          )}
          onClick={reject}
        >
          Cancel
        </button>
      </div>
    </div>
  );

  return (
    <Transition
      className="fixed"
      style={{ zIndex: popoverZIndex }}
      appear={true}
      show={true}
      enter="transition duration-100 ease-out"
      enterFrom="transform scale-95 opacity-0"
      enterTo="transform scale-100 opacity-100"
      leave="transition duration-75 ease-out"
      leaveFrom="transform scale-100 opacity-100"
      leaveTo="transform scale-95 opacity-0"
    >
      {portalTarget ? createPortal(popover, portalTarget) : popover}
    </Transition>
  );
}
