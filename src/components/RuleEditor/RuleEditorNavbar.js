import { MinusIcon, PlusIcon } from "@heroicons/react/20/solid";
import { CheckIcon, DocumentDuplicateIcon } from "@heroicons/react/24/outline";
import {
  IconArrowBackUp,
  IconArrowForwardUp,
  IconBolt,
  IconCircleDotted,
  IconListCheck,
  IconLoader,
  IconTransitionBottomFilled,
  IconTransitionTopFilled,
  IconX,
} from "@tabler/icons-react";
import classNames from "classnames";
import Tooltip from "../Rule/Tooltip";
import deepEqual from "deep-equal";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import tableActions from "./TableAction";

function EmbedPublishButton({ rule, embedToken, apiBaseUrl, canPublish }) {
  const [isPublishing, setIsPublishing] = useState(false);
  const [justPublished, setJustPublished] = useState(false);

  const handlePublish = async () => {
    if (!canPublish || isPublishing) return;

    setIsPublishing(true);
    try {
      const response = await fetch(`${apiBaseUrl}/api/embed/publish`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Embed-Token": embedToken,
        },
        body: JSON.stringify({ ruleId: rule.id }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `Publish failed: ${response.status}`
        );
      }

      toast.success("Rule published successfully!");
      setJustPublished(true);
      setTimeout(() => setJustPublished(false), 3000);
    } catch (error) {
      console.error("Publish error:", error);
      toast.error(error.message || "Failed to publish rule");
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <>
      <button
        className={`px-3 h-8 inline-flex items-center tracking-wide my-auto shadow justify-end py-1 rounded-sm mx-3 font-medium text-base ${
          !canPublish || isPublishing || justPublished
            ? "bg-yellow-600 bg-opacity-20 text-yellow-300 cursor-not-allowed"
            : "bg-yellow-600 bg-opacity-40 hover:bg-opacity-60 hover:text-white text-yellow-200"
        }`}
        onClick={handlePublish}
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
    </>
  );
}

const showTestResults = (results, id) => {
  toast.custom(
    (t) => (
      <div
        className={`${
          t.visible ? "animate-enter" : "animate-leave"
        } max-w-md w-full z-[100] bg-white shadow-lg rounded-md pointer-events-auto flex ring-1 ring-black ring-opacity-5`}
      >
        <div className="flex-1 w-0">
          <div className="flex flex-row h-full items-center">
            <div className="h-full align-middle">
              <IconListCheck
                strokeWidth={1.2}
                className="h-full self-center w-12 p-2 rounded-sm rounded-r-none border-r border-red-800/10 bg-red-100/50 text-red-600/80"
                aria-hidden="true"
              />
            </div>
            <div className="m-1 -mt-0 flex-1 truncate p-2.5">
              <div className="flex flex-row w-full justify-between">
                <p className="text-base w-auto truncate text-red-700">
                  Failed to publish ({results.failedTests?.length || 0} critical
                  tests failed)
                </p>
              </div>
              <p className="text-xs text-neutral-500 whitespace-pre-wrap">
                <ul className="bg-neutral-100 rounded-sm border mt-2 divide-y">
                  {results.failedTests.map((testName) => (
                    <li
                      className="text-xs py-2 pb-1 px-2 truncate"
                      key={testName}
                    >
                      <div className="inline-flex">
                        <IconX className="h-4 w-4 mr-1 text-neutral-400" />
                        {testName}
                      </div>
                    </li>
                  ))}
                </ul>
              </p>
            </div>
          </div>
        </div>
      </div>
    ),
    {
      duration: 5000,
      id: id,
      position: "bottom-right",
    }
  );
};

export default function RuleEditorNavbar({
  rule,
  selectedRows,
  sendAction,
  editMode = "full",
  canEditStructure = true,
  canPublish: canPublishProp = false,
  embedToken = null,
  apiBaseUrl = null,
}) {
  const [visibleDropdown, setVisibleDropdown] = useState(null);
  const [visibleHelpDropdown, setVisibleHelpDropdown] = useState(null);
  const [showDeployModal, setShowDeployModal] = useState(false);
  const [showNameEditor, setShowNameEditor] = useState(false);
  const [canPublish, setCanPublish] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [justPublished, setJustPublished] = useState(false);
  const [isFirstPublish, setIsFirstPublish] = useState(false);
  const [undoAvailable, setUndoAvailable] = useState(false);
  const [redoAvailable, setRedoAvailable] = useState(false);
  const [ruleSettings, setRuleSettings] = useState(rule.settings || {});
  const [draftRequiresApproval, setDraftRequiresApproval] = useState(false);
  const [canEditPublication, setCanEditPublication] = useState(false);
  const [isApprover, setIsApprover] = useState(false);

  const { isUndoAvailable, isRedoAvailable } = tableActions;
  useEffect(() => {
    setUndoAvailable(isUndoAvailable());
  }, [isUndoAvailable()]);
  useEffect(() => {
    setRedoAvailable(isRedoAvailable());
  }, [isRedoAvailable()]);

  // First publish celebration is skipped in embed mode
  useEffect(() => {
    setIsFirstPublish(false);
  }, []);
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
      // if the rule is too larg
      setCanPublish(true);
    }

    // In embed mode, permission is based on token permissions
    const canPublishRule = !!canPublish;
    const isApproverUser = false; // Approvals not supported in embed mode

    if (isApproverUser || (canPublishRule && !ruleSettings.requiresApproval)) {
      setCanEditPublication(true);
      setIsApprover(isApproverUser);
    } else {
      setIsApprover(false);
      setDraftRequiresApproval(
        ruleSettings.requiresApproval && ruleSettings.approver
      );
      setCanEditPublication(false);
    }
  }, [rule, showDeployModal]);

  const publishRule = async () => {
    // Publishing is handled by EmbedPublishButton in embed mode
    setIsPublishing(true);
    setTimeout(async () => {
      await sendAction("publishRule", { score: null });
      setIsPublishing(false);
      setJustPublished(true);
      setCanPublish(false);
      setTimeout(() => setJustPublished(false), 2000);
      if (isFirstPublish) {
        setIsFirstPublish(false);
      }
    }, 1000);
  };

  const canEdit = editMode !== "none";

  return (
    <header className="bg-editorBlack h-12 min-h-[47px] flex-shrink-0 z-30 grid grid-rows-1 text-white select-none border-b border-editorBorderGray grid-cols-2">
      <div className="inline-block">
        <div className="inline-flex self-center align-middle h-full items-center">
          {/* Back button hidden in embed mode */}
          {(visibleDropdown !== null ||
            visibleHelpDropdown ||
            showNameEditor) && (
            <div
              className="bg-transparent absolute inset-0 w-screen h-screen z-40"
              onClick={() => {
                setVisibleDropdown(null);
                setVisibleHelpDropdown(null);
                setShowNameEditor(false);
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
            />
          )}
        </div>
      </div>
    </header>
  );
}
