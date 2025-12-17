import { autocompletion } from "@codemirror/autocomplete";
import { javascript, scopeCompletionSource } from "@codemirror/lang-javascript";
import { tooltips } from "@codemirror/view";
import { IconCheck, IconCode, IconMaximize } from "@tabler/icons-react";
import ReactCodeMirror from "@uiw/react-codemirror";
import classNames from "classnames";
import { unflatten } from "flat";
import { js as beautify } from "js-beautify";
import { useEffect, useRef, useState } from "react";
import Modal from "../../ui/Modal";
import standardLibraries from "../../../constants/standardLibraries";

export default function CodeEditor({
  value,
  setValue,
  disabled,
  placeholder,
  request = {},
  response = {},
  context = {},
  readOnly = false,
  multiline = false,
  globalValues,
  zoom = null,
  maxWidth = "max-w-sm",
}) {
  const cmRef = useRef(null);
  const modalCmRef = useRef(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [justFormatted, setJustFormatted] = useState(false);

  // Create autocompletion function directly instead of through state
  const createCompletionExtension = () => {
    return autocompletion({
      override: [
        scopeCompletionSource({
          ...unflatten(request),
          ...unflatten(response),
          ...context,
          ...standardLibraries,
        }),
        (context) => {
          const word = context.matchBefore(/\$[^$(]*$/);
          if (!word) return null;
          let globalCompletions = [];
          if (globalValues) {
            globalCompletions = globalValues.map((v) => ({
              label: `$${v.name.toUpperCase().replaceAll(" ", "_")}`,
              type: v.id.includes("rb-") ? "function" : "variable",
              detail: v.id.includes("rb-")
                ? v.value.includes(" => ")
                  ? v.value.split(" => ")[0].substring(1)
                  : v.value
                : JSON.stringify(v.value),
            }));
          }
          return {
            from: word.from,
            options: globalCompletions,
          };
        },
      ],
    });
  };

  const formatCode = () => {
    try {
      if (!value || disabled) return;
      const formattedCode = beautify(value, {
        indent_size: 2,
        space_in_empty_paren: true,
        preserve_newlines: true,
        max_preserve_newlines: 2,
        wrap_line_length: 40,
      });
      setValue(formattedCode);
      setJustFormatted(true);
      setTimeout(() => setJustFormatted(false), 3000);
    } catch (e) {
      // Silently ignore formatting errors
      console.error("Error formatting code:", e);
    }
  };

  const openExpandedView = () => {
    setModalOpen(true);
  };

  // i am genuinely so smart
  const updateZoom = (zoom) => {
    cmRef.current?.editor
      ?.querySelector(".cm-cursorLayer")
      ?.style.setProperty(
        "transform",
        `scale(${1 / zoom}) translateY(${100 * (1 - zoom)}%)`
      );
    cmRef.current?.editor
      ?.querySelector(".cm-selectionLayer")
      ?.style.setProperty(
        "transform",
        `scale(${1 / zoom}) translateY(${100 * (1 - zoom)}%)`
      );
  };

  useEffect(() => {
    if (zoom) {
      // remove focus from the editor
      cmRef.current?.view?.contentDOM.blur();
      // unselect any selected text in the editor
      cmRef.current?.view?.dispatch({ selection: { anchor: 0, head: 0 } });
    }
  }, [zoom]);

  if (!readOnly) {
    return (
      <div className="relative w-full h-full z-0">
        <div
          className={`${
            disabled ? "opacity-50 pointer-events-none" : ""
          } h-auto cursor-text nodrag overflow-x-hidden border border-neutral-300 focus-within:outline outline-2 outline-blue-500 -outline-offset-1 rounded-sm bg-white p-1 py-[0.3rem] ${maxWidth}`}
        >
          {/* Toolbar */}
          <div className="absolute right-1.5 bottom-1.5 flex z-[1]">
            <button
              onClick={formatCode}
              className={classNames(
                "cursor-pointer w-6 h-6 justify-center items-center mr-1 align-middle text-xs text-neutral-400 hover:text-neutral-800 duration-100",
                disabled && "opacity-50 pointer-events-none"
              )}
              title="Format code"
            >
              {justFormatted ? (
                <IconCheck className="w-full h-full p-0.5 self-center" />
              ) : (
                <IconCode className="w-full h-full p-0.5 self-center" />
              )}
            </button>
            <button
              onClick={openExpandedView}
              className={classNames(
                "cursor-pointer w-6 h-6 justify-center items-center align-middle text-xs text-neutral-400 hover:text-neutral-800 duration-100",
                disabled && "opacity-50 pointer-events-none"
              )}
              title="Expand view"
            >
              <IconMaximize className="w-full h-full p-0.5 self-center" />
            </button>
          </div>
          <ReactCodeMirror
            ref={cmRef}
            zoom={zoom}
            onFocus={() => {
              updateZoom(zoom);
            }}
            style={{
              fontSize: "14px",
            }}
            id="jsCodeEditor"
            className="font-mono overflow-hidden"
            extensions={[
              javascript(),
              createCompletionExtension(),
              tooltips({
                parent: document.body,
              }),
            ]}
            placeholder={
              placeholder ||
              'Enter JS expression \nUse "$" to browse functions...\n'
            }
            height={zoom ? "auto" : "150px"}
            value={value}
            readOnly={disabled}
            onChange={setValue}
            basicSetup={{
              mode: "javascript",
              foldGutter: false,
              lineNumbers: false,
              matchBrackets: true,
              autoCloseBrackets: true,
              styleActiveLine: false,
              highlightActiveLine: false,
              autocompletion: true,
              singleCursorHeightPerLine: false,
              cursorHeight: "14px",
            }}
          />
        </div>
        {/* Modal for expanded view */}
        <Modal
          open={modalOpen}
          close={() => setModalOpen(false)}
          title="Edit JavaScript"
        >
          <div className="relative rounded-b-sm p-4 h-auto text-neutral-600 max-h-[80vh] overflow-y-auto">
            <div className="absolute right-5 top-2.5 flex z-[1]">
              <button
                onClick={formatCode}
                className={classNames(
                  "cursor-pointer w-6 h-6 justify-center items-center align-middle text-xs text-neutral-400 hover:text-neutral-800 duration-100"
                )}
                title="Format code"
              >
                {justFormatted ? (
                  <IconCheck className="w-full h-full p-0.5 self-center" />
                ) : (
                  <IconCode className="w-full h-full p-0.5 self-center" />
                )}
              </button>
            </div>
            <div className="transition-all duration-300 ease-in-out w-full pt-6">
              <ReactCodeMirror
                ref={modalCmRef}
                style={{
                  fontSize: "0.875rem",
                  fontFamily: "monospace",
                }}
                className="text-sm p-2 font-mono h-full border border-neutral-200 rounded-sm"
                extensions={[
                  javascript(),
                  createCompletionExtension(),
                  tooltips({
                    parent: document.body,
                  }),
                ]}
                placeholder={
                  placeholder ||
                  'Enter JS expression \nUse "$" to browse functions...\n'
                }
                height="auto"
                value={value}
                readOnly={disabled}
                onChange={setValue}
                minHeight="300px"
                basicSetup={{
                  mode: "javascript",
                  foldGutter: true,
                  lineNumbers: true,
                  matchBrackets: true,
                  autoCloseBrackets: true,
                  styleActiveLine: true,
                  highlightActiveLine: true,
                  autocompletion: true,
                }}
              />
            </div>
          </div>
        </Modal>
      </div>
    );
  }

  // Read-only mode
  return (
    <div className="relative w-full h-full z-0">
      <div
        className={`cursor-pointer overflow-hidden -ml-1 mr-2 filter duration-200 scale-100 origin-center mix-blend-darken ${
          multiline ? "" : "h-[1.75rem]"
        }`}
      >
        {/* Toolbar for readonly mode */}
        <div className="absolute right-1.5 top-1.5 flex z-[1]">
          <button
            onClick={openExpandedView}
            className={
              "cursor-pointer w-6 h-6 justify-center items-center align-middle mr-1 text-xs text-neutral-400 hover:text-neutral-800 duration-100"
            }
            title="Expand view"
          >
            <IconMaximize className="w-full h-full p-0.5 self-center" />
          </button>
          <button
            onClick={formatCode}
            className={
              "cursor-pointer w-6 h-6 justify-center items-center align-middle text-xs text-neutral-400 hover:text-neutral-800 duration-100"
            }
            title="Format code"
          >
            {justFormatted ? (
              <IconCheck className="w-full h-full p-0.5 self-center" />
            ) : (
              <IconCode className="w-full h-full p-0.5 self-center" />
            )}
          </button>
        </div>
        <ReactCodeMirror
          id="jsCodeEditor"
          className={`font-mono font-medium truncate ${
            multiline ? "" : "pointer-events-none"
          }`}
          extensions={[
            javascript(),
            createCompletionExtension(),
            tooltips({
              parent: document.body,
            }),
          ]}
          placeholder={placeholder || "Enter JS expression..."}
          value={value ? value.replaceAll("\n  ", "").replaceAll("\n", "") : ""}
          readOnly={true}
          onChange={setValue}
          basicSetup={{
            mode: "javascript",
            foldGutter: false,
            lineNumbers: false,
            matchBrackets: true,
            autoCloseBrackets: true,
            styleActiveLine: false,
            highlightActiveLine: false,
            autocompletion: true,
          }}
        />
      </div>
      {/* Modal for expanded view */}
      <Modal
        open={modalOpen}
        close={() => setModalOpen(false)}
        title="View JavaScript"
      >
        <div className="relative rounded-b-sm p-4 h-auto text-neutral-600 max-h-[80vh] overflow-y-auto">
          <div className="absolute right-5 top-2.5 flex z-[1]">
            <button
              onClick={formatCode}
              className={classNames(
                "cursor-pointer w-6 h-6 justify-center items-center align-middle text-xs text-neutral-400 hover:text-neutral-800 duration-100"
              )}
              title="Format code"
            >
              {justFormatted ? (
                <IconCheck className="w-full h-full p-0.5 self-center" />
              ) : (
                <IconCode className="w-full h-full p-0.5 self-center" />
              )}
            </button>
          </div>
          <div className="transition-all duration-300 ease-in-out w-full pt-6">
            <ReactCodeMirror
              ref={modalCmRef}
              style={{
                fontSize: "0.875rem",
                fontFamily: "monospace",
              }}
              className="text-sm p-2 font-mono h-full border border-neutral-200 rounded-sm"
              extensions={[
                javascript(),
                createCompletionExtension(),
                tooltips({
                  parent: document.body,
                }),
              ]}
              placeholder={placeholder || "Enter JS expression..."}
              height="auto"
              value={
                multiline
                  ? value
                  : value
                  ? value.replaceAll("\n  ", "").replaceAll("\n", "")
                  : ""
              }
              readOnly={true}
              onChange={setValue}
              basicSetup={{
                mode: "javascript",
                foldGutter: true,
                lineNumbers: true,
                matchBrackets: true,
                autoCloseBrackets: true,
                styleActiveLine: true,
                highlightActiveLine: true,
                autocompletion: true,
              }}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
