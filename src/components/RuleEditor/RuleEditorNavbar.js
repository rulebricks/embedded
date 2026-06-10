import {
  CheckIcon as CheckSolidIcon,
  MinusIcon,
  PlusIcon,
  XMarkIcon,
} from "@heroicons/react/20/solid";
import { CheckIcon, DocumentDuplicateIcon } from "@heroicons/react/24/outline";
import {
  IconArrowBackUp,
  IconArrowForwardUp,
  IconArrowsMoveVertical,
  IconBolt,
  IconCircleDotted,
  IconLoader,
  IconTransitionBottomFilled,
  IconTransitionTopFilled,
} from "@tabler/icons-react";
import classNames from "classnames";
import Tooltip from "../ui/Tooltip";
import deepEqual from "deep-equal";
import { useEffect, useState } from "react";
import { usePopper } from "react-popper";
import { useEmbedPublishMutator } from "../../hooks/useEmbedRuleMutator";
import tableActions from "./TableAction";

function MoveToPositionPopover({
  referenceElement,
  sendAction,
  closeDropdown,
  maxPosition,
  selectionSize,
}) {
  const [popperElement, setPopperElement] = useState();
  const { styles, attributes } = usePopper(referenceElement, popperElement, {
    placement: "bottom",
    modifiers: [
      {
        name: "offset",
        options: {
          offset: [0, 12],
        },
      },
    ],
  });

  const [inputValue, setInputValue] = useState("1");
  const numericValue = Number(inputValue);
  const valid =
    Number.isFinite(numericValue) &&
    Math.floor(numericValue) >= 1 &&
    Math.floor(numericValue) <= maxPosition;

  const submit = () => {
    if (!valid) return;
    sendAction("moveSelectedRowsToPosition", {
      targetIndex: Math.floor(numericValue),
    });
    closeDropdown();
  };

  return (
    <div
      ref={setPopperElement}
      className="bg-editorBlack z-50 flex flex-col rounded-md border-2 border-neutral-700 shadow-lg w-full max-w-52 p-2"
      style={{ ...styles.popper }}
      {...attributes.popper}
    >
      <div className="px-1 pt-0.5 pb-1.5 text-xs text-neutral-400">
        Move {selectionSize} selected row{selectionSize === 1 ? "" : "s"} to
        position (1–{maxPosition})
      </div>
      <div className="flex flex-row items-center">
        <input
          type="number"
          min={1}
          max={maxPosition}
          autoFocus
          className="bg-editorSelectBlack rounded-sm outline-none focus:border-neutral-500 border-neutral-700 max-w-32 w-full"
          placeholder="row number"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submit();
            } else if (e.key === "Escape") {
              e.preventDefault();
              closeDropdown();
            }
          }}
        />
        <div className="flex flex-row-reverse items-center">
          <button onClick={submit} disabled={!valid}>
            <CheckSolidIcon
              className={classNames(
                "w-6 h-6 mr-2 ml-2 pb-px",
                valid && "text-lime-500 hover:text-lime-400",
                !valid && "text-gray-300"
              )}
            />
          </button>
          <button onClick={closeDropdown}>
            <XMarkIcon className="w-6 h-6 ml-3 text-red-500 hover:text-red-400" />
          </button>
        </div>
      </div>
    </div>
  );
}

// Matches the server-side sanitizeVersionNote cap.
const VERSION_NOTE_MAX_LENGTH = 500;

function VersionNotePopover({
  referenceElement,
  onConfirm,
  closeDropdown,
  isPublishing,
}) {
  const [popperElement, setPopperElement] = useState();
  const { styles, attributes } = usePopper(referenceElement, popperElement, {
    placement: "bottom-end",
    modifiers: [
      {
        name: "offset",
        options: {
          offset: [0, 12],
        },
      },
    ],
  });

  const [note, setNote] = useState("");

  return (
    <div
      ref={setPopperElement}
      className="bg-editorBlack z-50 flex flex-col rounded-md border-2 border-neutral-700 shadow-lg w-72 p-2"
      style={{ ...styles.popper }}
      {...attributes.popper}
    >
      <div className="px-1 pt-0.5 pb-1.5 text-xs text-neutral-400">
        Add an optional note for this version
      </div>
      <textarea
        autoFocus
        rows={3}
        maxLength={VERSION_NOTE_MAX_LENGTH}
        className="bg-editorSelectBlack text-sm text-white rounded-sm outline-none focus:border-neutral-500 border-neutral-700 w-full resize-none p-1.5"
        placeholder="What changed in this version?"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.preventDefault();
            closeDropdown();
          }
        }}
      />
      <div className="flex flex-row-reverse items-center mt-2 gap-2">
        <button
          className={classNames(
            "px-3 h-7 inline-flex items-center tracking-wide shadow justify-center rounded-sm font-medium text-sm",
            isPublishing
              ? "bg-yellow-600 bg-opacity-20 text-yellow-300 cursor-not-allowed"
              : "bg-yellow-600 bg-opacity-40 hover:bg-opacity-60 hover:text-white text-yellow-200"
          )}
          disabled={isPublishing}
          onClick={() => onConfirm(note.trim())}
        >
          {isPublishing ? (
            <IconLoader className="self-center w-4 h-4 mr-1.5 animate-spin" />
          ) : (
            <IconBolt className="self-center w-4 h-4 mr-1.5" />
          )}
          Publish
        </button>
        <button
          className="px-3 h-7 inline-flex items-center justify-center rounded-sm text-sm text-neutral-400 hover:text-white"
          onClick={closeDropdown}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function EmbedPublishButton({
  rule,
  embedToken,
  apiBaseUrl,
  canPublish,
  publishVersionNotes = false,
  onPublish,
  onRuleChange,
  onError,
}) {
  const [justPublished, setJustPublished] = useState(false);
  const [showNotePopover, setShowNotePopover] = useState(false);
  const [buttonRef, setButtonRef] = useState(null);

  const publishRule = useEmbedPublishMutator({
    embedToken,
    apiBaseUrl,
    ruleId: rule.id,
    onRuleChange,
    onSuccess: (data) => {
      setShowNotePopover(false);
      // Prefer the post-publish rule from the API response
      onPublish?.({ ...data, rule: data?.rule || rule });
      setJustPublished(true);
      setTimeout(() => setJustPublished(false), 3000);
    },
    onError: (error) => {
      console.error("Publish error:", error);
      onError?.({ error });
    },
  });
  const isPublishing = publishRule.isLoading;

  const handlePublishClick = () => {
    if (!canPublish || isPublishing) return;
    if (publishVersionNotes) {
      setShowNotePopover((v) => !v);
      return;
    }
    publishRule.mutate({});
  };

  return (
    <>
      <div ref={setButtonRef} className="inline-flex my-auto">
        <button
          className={`px-3 h-8 inline-flex items-center tracking-wide my-auto shadow justify-end py-1 rounded-sm mx-3 font-medium text-base ${
            !canPublish || isPublishing || justPublished
              ? "bg-yellow-600 bg-opacity-20 text-yellow-300 cursor-not-allowed"
              : "bg-yellow-600 bg-opacity-40 hover:bg-opacity-60 hover:text-white text-yellow-200"
          }`}
          onClick={handlePublishClick}
          disabled={!canPublish || isPublishing || justPublished}
          title={!canPublish ? "No changes to publish" : "Publish rule"}
        >
          {isPublishing ? (
            <IconLoader className="self-center w-4 h-4 mr-2 animate-spin" />
          ) : justPublished ? (
            <CheckIcon className="self-center w-4 h-4 mr-2" />
          ) : (
            <IconBolt className="self-center w-4 h-4 mr-2" />
          )}
          {justPublished ? "Published!" : "Publish"}
        </button>
      </div>
      {publishVersionNotes && showNotePopover && buttonRef && (
        <VersionNotePopover
          referenceElement={buttonRef}
          isPublishing={isPublishing}
          closeDropdown={() => setShowNotePopover(false)}
          onConfirm={(note) =>
            publishRule.mutate(note ? { versionNote: note } : {})
          }
        />
      )}
    </>
  );
}

export default function RuleEditorNavbar({
  rule,
  selectedRows,
  sendAction,
  editMode = "full",
  canEditStructure = true,
  canPublish: canPublishProp = false,
  publishVersionNotes = false,
  embedToken = null,
  apiBaseUrl = null,
  onPublish = null,
  onRuleChange = null,
  onError = null,
}) {
  const [visibleDropdown, setVisibleDropdown] = useState(null);
  const [visibleHelpDropdown, setVisibleHelpDropdown] = useState(null);
  const [canPublish, setCanPublish] = useState(false);
  const [undoAvailable, setUndoAvailable] = useState(false);
  const [redoAvailable, setRedoAvailable] = useState(false);
  const [showMoveToPosition, setShowMoveToPosition] = useState(false);
  const [moveToPositionRef, setMoveToPositionRef] = useState(null);

  const { isUndoAvailable, isRedoAvailable } = tableActions;
  useEffect(() => {
    setUndoAvailable(isUndoAvailable());
  }, [isUndoAvailable()]);
  useEffect(() => {
    setRedoAvailable(isRedoAvailable());
  }, [isRedoAvailable()]);

  useEffect(() => {
    if (rule.conditions?.length && rule.conditions.length < 1000) {
      setCanPublish(
        !deepEqual(rule.published_requestSchema, rule.requestSchema) ||
          !deepEqual(rule.published_responseSchema, rule.responseSchema) ||
          !deepEqual(rule.published_conditions, rule.conditions) ||
          !deepEqual(rule.published_groups, rule.groups) ||
          !rule.published
      );
    } else {
      setCanPublish(true);
    }
  }, [rule]);

  const canEdit = editMode !== "none";

  return (
    <header className="bg-editorBlack h-12 min-h-[47px] flex-shrink-0 z-30 grid grid-rows-1 text-white select-none border-b border-editorBorderGray grid-cols-2">
      <div className="inline-block">
        <div className="inline-flex self-center align-middle h-full items-center">
          {(visibleDropdown !== null || visibleHelpDropdown) && (
            <div
              className="bg-transparent absolute inset-0 w-screen h-screen z-40"
              onClick={() => {
                setVisibleDropdown(null);
                setVisibleHelpDropdown(null);
              }}
            />
          )}
          {/* Only show editing buttons if user has edit permissions */}
          {canEdit && (
            <>
              {/* Structure buttons (add/delete/duplicate/group/move) - only in 'full' editMode */}
              {canEditStructure && (
                <>
                  <Tooltip hint="Delete selected rows">
                    <button
                      disabled={
                        selectedRows.size === 0 ||
                        selectedRows.size === rule.conditions.length
                      }
                      className={classNames(
                        "px-1.5 py-1 my-auto md:flex hidden shadow rounded-sm mx-3 font-semibold text-base items-center justify-center duration-100",
                        selectedRows.size === 0 ||
                          selectedRows.size === rule.conditions.length
                          ? "bg-gray-600 bg-opacity-20 pointer-events-none text-gray-500"
                          : "bg-red-600 bg-opacity-40 hover:bg-opacity-60 hover:text-white text-red-200"
                      )}
                      onClick={() => sendAction("deleteSelectedRows")}
                      title="Delete selected rows"
                    >
                      <MinusIcon className="w-5 h-6" />
                    </button>
                  </Tooltip>
                  <Tooltip hint="Add a new row">
                    <button
                      className="px-1.5 py-1 my-auto md:flex hidden shadow rounded-sm font-semibold bg-sky-600 bg-opacity-40 hover:bg-opacity-60 hover:text-white text-sky-200 items-center justify-center duration-100"
                      onClick={() => sendAction("addRow")}
                      title="Add a new row"
                    >
                      <PlusIcon className="w-5 h-6" />
                    </button>
                  </Tooltip>
                  <Tooltip hint="Clone selected rows">
                    <button
                      className={classNames(
                        "px-1.5 py-1 my-auto ml-3 md:flex hidden shadow rounded-sm font-semibold items-center justify-center duration-100",
                        selectedRows.size === 0
                          ? "bg-gray-600 bg-opacity-20 pointer-events-none text-gray-500"
                          : "bg-lime-600 bg-opacity-40 hover:bg-opacity-60 hover:text-white text-lime-200"
                      )}
                      onClick={() => sendAction("duplicateSelectedRows")}
                      title="Clone selected rows"
                    >
                      <DocumentDuplicateIcon className="w-5 h-6" />
                    </button>
                  </Tooltip>
                  <Tooltip hint="Group selected rows">
                    <button
                      className={classNames(
                        "px-1.5 py-1 my-auto ml-3 md:flex hidden shadow rounded-sm font-semibold items-center justify-center duration-100",
                        selectedRows.size < 2
                          ? "bg-gray-600 bg-opacity-20 pointer-events-none text-gray-500"
                          : "bg-lime-600 bg-opacity-40 hover:bg-opacity-60 hover:text-white text-lime-200"
                      )}
                      onClick={() => sendAction("groupRows")}
                      title="Group selected rows"
                    >
                      <IconCircleDotted className="w-5 h-6" />
                    </button>
                  </Tooltip>
                  {selectedRows.size > 0 && (
                    <>
                      <Tooltip hint="Move selected rows to top">
                        <button
                          className="px-1.5 py-1 my-auto ml-3 md:flex hidden shadow rounded-sm font-semibold bg-purple-600 bg-opacity-40 hover:bg-opacity-60 hover:text-white text-purple-200 items-center justify-center duration-100"
                          onClick={() => sendAction("moveSelectedRowsToTop")}
                          title="Move selected rows to top"
                        >
                          <IconTransitionTopFilled className="w-5 h-6" />
                        </button>
                      </Tooltip>
                      <div
                        ref={setMoveToPositionRef}
                        className="inline-flex my-auto"
                      >
                        <Tooltip hint="Move selected rows to position…">
                          <button
                            className={classNames(
                              "px-1.5 py-1 my-auto ml-3 md:flex hidden shadow rounded-sm font-semibold bg-purple-600 bg-opacity-40 hover:bg-opacity-60 hover:text-white text-purple-200 items-center justify-center duration-100",
                              showMoveToPosition &&
                                "bg-purple-600 bg-opacity-80 text-white"
                            )}
                            onClick={() => setShowMoveToPosition((v) => !v)}
                            title="Move selected rows to position"
                          >
                            <IconArrowsMoveVertical className="w-5 h-6" />
                          </button>
                        </Tooltip>
                      </div>
                      {showMoveToPosition && moveToPositionRef && (
                        <MoveToPositionPopover
                          referenceElement={moveToPositionRef}
                          sendAction={sendAction}
                          closeDropdown={() => setShowMoveToPosition(false)}
                          selectionSize={selectedRows.size}
                          maxPosition={Math.max(
                            1,
                            (rule.conditions?.length || 0) -
                              selectedRows.size +
                              1
                          )}
                        />
                      )}
                      <Tooltip hint="Move selected rows to bottom">
                        <button
                          className="px-1.5 py-1 my-auto ml-3 md:flex hidden shadow rounded-sm font-semibold bg-purple-600 bg-opacity-40 hover:bg-opacity-60 hover:text-white text-purple-200 items-center justify-center duration-100"
                          onClick={() => sendAction("moveSelectedRowsToBottom")}
                          title="Move selected rows to bottom"
                        >
                          <IconTransitionBottomFilled className="w-5 h-6" />
                        </button>
                      </Tooltip>
                    </>
                  )}
                </>
              )}
              {/* Undo/Redo - always shown when canEdit */}
              <Tooltip hint="Undo">
                <button
                  className={classNames(
                    "px-1.5 py-1 my-auto ml-3 md:flex hidden shadow rounded-sm font-semibold items-center justify-center ",
                    !undoAvailable
                      ? "pointer-events-none text-gray-500"
                      : "text-white hover:text-gray-300"
                  )}
                  onClick={() => sendAction("undoRuleUpdate")}
                  title="Undo"
                >
                  <IconArrowBackUp className="w-5 h-6" />
                </button>
              </Tooltip>
              <Tooltip hint="Redo">
                <button
                  className={classNames(
                    "px-1.5 py-1 my-auto ml-3 md:flex hidden shadow rounded-sm font-semibold items-center justify-center ",
                    !redoAvailable
                      ? "pointer-events-none text-gray-500"
                      : "text-white hover:text-gray-300"
                  )}
                  onClick={() => sendAction("redoRuleUpdate")}
                  title="Redo"
                >
                  <IconArrowForwardUp className="w-5 h-6" />
                </button>
              </Tooltip>
            </>
          )}
        </div>
      </div>
      <div className="inline-block items-center justify-end">
        <div className="flex flex-row-reverse self-center align-middle h-full items-center">
          {/* Simplified publish button for embed mode - only show if has publish permission */}
          {canPublishProp && (
            <EmbedPublishButton
              rule={rule}
              embedToken={embedToken}
              apiBaseUrl={apiBaseUrl}
              canPublish={canPublish}
              publishVersionNotes={publishVersionNotes}
              onPublish={onPublish}
              onRuleChange={onRuleChange}
              onError={onError}
            />
          )}
        </div>
      </div>
    </header>
  );
}
