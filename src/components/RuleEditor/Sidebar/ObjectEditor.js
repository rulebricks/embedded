import { Editor as Json5Editor } from "json5-editor";
import { IconCheck, IconCopy, IconMaximize } from "@tabler/icons-react";
import classNames from "classnames";
import JSON5 from "json5";
import { useState } from "react";
import EmbeddedModalOverlay from "../EmbeddedModalOverlay";

// Re-export JSON parsing utilities from JsonEditor for backwards compatibility
export {
  tryParseJSON,
  tryParseJSONArray,
  tryParsePrimitive,
} from "./JsonEditor";

export default function ObjectEditor({
  value,
  setValue,
  readOnly,
  valid,
  placeholder,
}) {
  const [justCopied, setJustCopied] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const copyToClipboard = () => {
    try {
      const stringValue =
        typeof value === "string" ? value : JSON5.stringify(value, null, 2);
      navigator.clipboard.writeText(
        JSON.stringify(JSON5.parse(stringValue), null, 2)
      );
      setJustCopied(true);
      setTimeout(() => setJustCopied(false), 3000);
    } catch (_e) {
      // Silently ignore clipboard or JSON parsing errors
    }
  };

  const openExpandedView = () => {
    setModalOpen(true);
  };

  const displayValue =
    typeof value === "string" ? value : JSON5.stringify(value, null, 2);

  return (
    <div className="relative w-full h-full z-0">
      <div className="absolute right-1.5 top-1.5 flex z-[1]">
        <button
          onClick={openExpandedView}
          className={classNames(
            "cursor-pointer w-6 h-6 justify-center items-center align-middle mr-1 text-xs text-neutral-400 hover:text-neutral-800 duration-100"
          )}
          title="Expand view"
        >
          <IconMaximize className="w-full h-full p-0.5 self-center" />
        </button>
        <button
          onClick={copyToClipboard}
          className={classNames(
            "cursor-pointer w-6 h-6 justify-center items-center align-middle text-xs text-neutral-400 hover:text-neutral-800 duration-100"
          )}
          title="Copy to clipboard"
        >
          {justCopied ? (
            <IconCheck className="w-full h-full p-0.5 self-center" />
          ) : (
            <IconCopy className="w-full h-full p-0.5 self-center" />
          )}
        </button>
      </div>
      <Json5Editor
        style={{ fontSize: "0.75rem", fontFamily: "JetBrains Mono" }}
        className={classNames(
          "text-xs p-1 font-mono rounded-sm border",
          !valid && "border border-red-500"
        )}
        placeholder={placeholder || "{}"}
        value={displayValue}
        readOnly={readOnly}
        onChange={setValue}
        formatConfig={{
          type: "whole",
        }}
      />
      <EmbeddedModalOverlay
        open={modalOpen}
        close={() => setModalOpen(false)}
        title="Edit Object"
      >
        <div className="relative rounded-b-sm p-4 h-auto text-neutral-600 max-h-[80vh] overflow-y-auto">
          <div className="absolute right-5 top-2.5 flex z-[1]">
            <button
              onClick={copyToClipboard}
              className={classNames(
                "cursor-pointer w-6 h-6 justify-center items-center align-middle text-xs text-neutral-400 hover:text-neutral-800 duration-100"
              )}
              title="Copy to clipboard"
            >
              {justCopied ? (
                <IconCheck className="w-full h-full p-0.5 self-center" />
              ) : (
                <IconCopy className="w-full h-full p-0.5 self-center" />
              )}
            </button>
          </div>
          <div className="transition-all duration-300 ease-in-out w-full pt-6">
            <Json5Editor
              style={{
                fontSize: "0.875rem",
                height: "auto",
                maxHeight: "100%",
                fontFamily: "monospace",
              }}
              className="text-sm !max-h-[unset] p-2 font-mono h-full border border-neutral-200 rounded-sm"
              placeholder={placeholder || "{}"}
              value={displayValue}
              readOnly={readOnly}
              onChange={setValue}
              showLineNumber
              formatConfig={{
                type: "whole",
              }}
            />
          </div>
        </div>
      </EmbeddedModalOverlay>
    </div>
  );
}
