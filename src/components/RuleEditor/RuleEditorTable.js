import {
  BoltIcon,
  ClockIcon,
  PencilSquareIcon,
} from "@heroicons/react/20/solid";
import { IconGridDots, IconSearch } from "@tabler/icons-react";
import PageLoader from "../PageLoader";
import moment from "moment/moment";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import DataGrid from "react-data-grid";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { useQuery, useQueryClient } from "react-query";
import { applyBranding } from "../../util/branding";
import RequestColumn from "./Column/RequestColumn";
import ResponseColumn from "./Column/ResponseColumn";
import SelectColumn from "./Column/SelectColumn";
import { DraggableRowRenderer } from "./Row/DraggableRowRenderer";
import RuleEditorNavbar from "./RuleEditorNavbar";
import tableActions from "./TableAction";
import {
  applyExternalPasteUpdates,
  parseExternalClipboardData,
  prepareRequestCellPasteData,
  prepareResponseCellPasteData,
} from "./util/externalPaste";
import { useRowUtils, withinSchedule } from "./util/util";
import { useEmbedRuleMutator } from "./util/embedMutator";
import { useOperators } from "../../context/OperatorsContext";

const tabNameToKeys = {
  request: { json: "sampleRequest", schema: "requestSchema" },
  response: { json: "sampleResponse", schema: "responseSchema" },
};

export default function RuleEditorTable({
  ruleOverride = null,
  globalValuesOverride = null,
  // Embed props
  editMode = "full", // 'none', 'cells', or 'full'
  canPublish = false,
  lockedSchema: lockedSchemaProp = null, // null = derive from editMode, true/false = explicit
  embedToken = null,
  apiBaseUrl = null,
  ruleId: explicitRuleId = null,
  embedUser = null,
  showFooter = true,
  showControls = true, // Whether to show the top navbar with controls
  showRowSettings = false, // Whether to show the gear icon in rows
  onRuleChange = null,
  // Configurable column labels
  requestLabel = null,
  responseLabel = null,
  // External test state control
  testStateProp = null,
  setTestStateProp = null,
}) {
  // Embed mode: no auth context needed
  const members = [];
  const gridRef = useRef(null);
  const { operators } = useOperators();

  // Always use explicit ruleId in embed
  const id = explicitRuleId;

  useEffect(() => {
    if (!embedToken || !apiBaseUrl) return;

    const fetchBranding = async () => {
      try {
        const response = await fetch(`${apiBaseUrl}/api/embed/branding`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Embed-Token": embedToken,
          },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.branding) {
            applyBranding(data.branding);
          }
        }
      } catch (error) {
        console.error("Failed to fetch embed branding:", error);
      }
    };

    fetchBranding();
  }, [embedToken, apiBaseUrl]);

  // Realtime channel is not used in embed mode

  const [onlineMembers, setOnlineMembers] = useState([]);
  const [selectedRows, setSelectedRows] = useState(new Set());
  // Support both controlled (prop) and uncontrolled (internal) test state
  const [internalTestState, setInternalTestState] = useState(null);
  const testState =
    testStateProp !== undefined ? testStateProp : internalTestState;
  const setTestState = setTestStateProp || setInternalTestState;

  const [searchRows, setSearchRows] = useState("");
  const [rows, setRows] = useState([]);
  const [filteredRows, setFilteredRows] = useState([]);
  const [selectedCell, setSelectedCell] = useState(null);
  const [hasInternalCopy, setHasInternalCopy] = useState(false);
  const [pinnedColumns, setPinnedColumns] = useState(new Set());

  // Use embed mutator for API-based mutations
  const queryClient = useQueryClient();
  const updateRule = useEmbedRuleMutator({
    embedToken,
    apiBaseUrl,
    ruleId: id,
    onRuleChange,
  });

  // Permission checks based on editMode prop
  // editMode: 'none' = read-only, 'cells' = cell editing only, 'full' = all editing
  const canEdit = editMode !== "none";

  // Show structure buttons (add/delete/duplicate/group/move rows) only in 'full' mode
  const canEditStructure = editMode === "full";

  // Schema viewing: controlled by lockedSchema prop if provided, otherwise derive from editMode
  // When lockedSchema=true, show descriptions instead of icons/keys in column headers
  // When lockedSchema=false, show icons/keys (schema view)
  const canViewSchema =
    lockedSchemaProp !== null ? !lockedSchemaProp : editMode === "full";

  // Use embedUser prop if provided, otherwise fall back to default
  const effectiveUser = embedUser || { name: "Embed User", email: "" };

  const rowRenderer = useCallback(
    (key, props) => {
      const { onRowReorder, onRowsReorder } = useRowUtils(
        setRows,
        selectedRows,
        setSelectedRows,
        updateRule,
        effectiveUser
      );
      return (
        <DraggableRowRenderer
          key={key}
          {...props}
          onRowReorder={onRowReorder}
          selectedRows={selectedRows}
          onRowsReorder={onRowsReorder}
          canDrag={canEdit}
        />
      );
    },
    [selectedRows, setSelectedRows, effectiveUser, canEdit, updateRule]
  );
  // Use embed-specific query key and initialize with ruleOverride
  const embedQueryKey = ["embed-rule", { ruleId: id }];

  // Initialize embed cache with ruleOverride on first render
  useEffect(() => {
    if (ruleOverride && id) {
      queryClient.setQueryData(embedQueryKey, ruleOverride);
    }
  }, [ruleOverride, id, queryClient]);

  // Read from the embed cache (which gets updated by mutations)
  const { data: embedRule } = useQuery({
    queryKey: embedQueryKey,
    queryFn: () => ruleOverride, // Fallback to ruleOverride if cache is empty
    enabled: !!id,
    staleTime: Infinity, // Don't refetch - we update via mutations
  });

  // Use embed rule, ruleOverride as fallback
  const rule = embedRule || ruleOverride;

  // Embed mode: global values come from props
  const globalValues = globalValuesOverride || [];

  const lockedSchema = !canViewSchema;
  // Sidebar is always hidden in embed mode
  const initialTab = () => null;

  const [activeTab, setActiveTab] = useState(initialTab());

  // Sidebar stays closed in embed mode
  useEffect(() => {
    if (activeTab !== null) {
      setActiveTab(null);
    }
  }, [activeTab]);

  // Reset internal copy flag when user does external copy
  useEffect(() => {
    const handleExternalCopy = (e) => {
      // If the copy event is not from the grid, reset the flag
      if (!e.target.closest(".rdg-light")) {
        setHasInternalCopy(false);
      }
    };

    window.addEventListener("copy", handleExternalCopy);
    return () => window.removeEventListener("copy", handleExternalCopy);
  }, []);

  // only set rows when rule or preview changes
  useEffect(() => {
    if (rule) {
      const sourceConditions = rule.conditions;

      setRows(
        sourceConditions.map((c, id) => {
          return {
            id,
            data: {
              ...c,
            },
            testState: testState?.conditions?.[id],
            successIdxs: testState?.successIdxs,
          };
        })
      );
    }
  }, [rule, testState]);

  useEffect(() => {
    setFilteredRows(rows);
  }, [rows]);

  useEffect(() => {
    if (searchRows.length > 0) {
      try {
        setFilteredRows(
          rows.filter((row) => {
            const requestValues = Object.values(row.data.request).map(
              (v) => `${v.op} ${JSON.stringify(v.args)}`
            );
            const responseValues = Object.values(row.data.response).map(
              (v) => `${JSON.stringify(v.value)}`
            );
            return JSON.stringify(requestValues.concat(responseValues))
              .toLowerCase()
              .includes(searchRows.toLowerCase());
          })
        );
      } catch (_e) {
        setFilteredRows(rows);
      }
    } else {
      setFilteredRows(rows);
    }
  }, [searchRows, rows]);

  // listen for undo/redo events
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "z" && e.metaKey) {
        // ensure we're not in an input field of any kind
        if (
          document.activeElement.tagName === "INPUT" ||
          document.activeElement.tagName === "TEXTAREA"
        ) {
          return;
        }
        e.preventDefault();
        if (e.shiftKey) {
          sendAction("redoRuleUpdate");
        } else {
          sendAction("undoRuleUpdate");
        }
      }
      // shift + space seems to select rows. disable this
      if (e.key === " " && e.shiftKey) {
        e.preventDefault();
      }
      // if the user is focuesed on any nested child of the .cell-popover element and inside anything besides
      // a textarea, allow enter to save and escape to cancel
      // using cell-popover-save and cell-popover-cancel classnames to target buttons
      // if they exist
      if (
        e.key === "Enter" &&
        document.activeElement.closest(".cell-popover")
      ) {
        // ensure we're not in a textarea
        if (
          document.activeElement.tagName !== "TEXTAREA" &&
          document.activeElement.className !== "cm-content" &&
          (!document.activeElement.closest(".tf-operator") ||
            !document.querySelector(".cell-popover-arguments"))
        ) {
          e.preventDefault();
          document.activeElement
            .closest(".cell-popover")
            .querySelector(".cell-popover-save")
            .click();
        }
      }
      if (
        e.key === "Escape" &&
        document.activeElement.closest(".cell-popover")
      ) {
        e.preventDefault();
        document.activeElement
          .closest(".cell-popover")
          .querySelector(".cell-popover-cancel")
          .click();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [sendAction]);

  function getInitialColumnKey(tabName) {
    if (!rule) {
      return null;
    }
    if (!tabNameToKeys[tabName]) {
      return null;
    }
    const columnSchema = rule[tabNameToKeys[tabName].schema];
    return columnSchema[0] ? columnSchema[0].key : null;
  }

  const [focusedColumnKey, setFocusedColumnKey] = useState(() =>
    getInitialColumnKey(activeTab)
  );
  // Global paste handler for when grid's onPaste isn't active
  // Must be before conditional returns to follow React hooks rules
  useEffect(() => {
    if (!rule || !canEdit) return;

    const handleGlobalPaste = async (e) => {
      // Skip if we have an internal copy - let the grid's onPaste handler deal with it
      if (hasInternalCopy) return;

      // Only handle if the paste is happening within the grid OR we have a selected cell
      // (After cell edit, focus moves to body but we still want to allow paste)
      if (!e.target.closest(".rdg-light") && !selectedCell) return;

      if (
        document.activeElement.tagName === "INPUT" ||
        document.activeElement.tagName === "TEXTAREA"
      ) {
        return;
      }

      if (!selectedCell) return;

      // Prevent default to avoid double paste
      e.preventDefault();

      // Get the selected cell's position
      const rowIdx = selectedCell.row.id;
      const colIdx = selectedCell.column.idx;

      if (isNaN(rowIdx) || isNaN(colIdx) || rowIdx < 0 || colIdx < 0) return;

      const showTest = !!testState;
      const visibleRequestColumns = rule.requestSchema.filter((c) => c.show);
      const visibleResponseColumns = rule.responseSchema.filter((c) => c.show);

      // Get the clipboard text
      try {
        const clipboardText = await navigator.clipboard.readText();
        const externalData = parseExternalClipboardData(clipboardText);

        if (!externalData || externalData.length === 0) return;

        // Get the column information
        const allColumns = [
          canEdit
            ? SelectColumn({ rule, sendAction, selectedRows, showRowSettings })
            : {
                key: "select-row",
                name: "",
                width: 40,
                formatter: () => <div style={{ width: 40 }} />,
              },
          ...visibleRequestColumns.map((col, idx) =>
            RequestColumn(
              col,
              idx,
              sendAction,
              showTest,
              globalValues,
              rule.requestSchema,
              activeTab,
              canViewSchema && visibleRequestColumns.length > 1,
              !canEdit,
              !canViewSchema,
              pinnedColumns.has(col.key),
              requestLabel
            )
          ),
          ...visibleResponseColumns.map((col, idx) =>
            ResponseColumn(
              col,
              idx,
              sendAction,
              showTest,
              globalValues,
              rule.responseSchema,
              rule.sampleRequest,
              rule.sampleResponse,
              activeTab,
              canViewSchema && visibleResponseColumns.length > 1,
              !canEdit,
              !canViewSchema,
              responseLabel
            )
          ),
        ];

        const targetColumn = allColumns[colIdx];
        if (
          !targetColumn ||
          !targetColumn.key ||
          targetColumn.key === "select-row"
        )
          return;

        const { column, section } = splitKey(targetColumn.key);

        // Prepare the paste updates based on section type
        let updates = [];
        if (section === "request") {
          updates = prepareRequestCellPasteData(
            externalData,
            column,
            rowIdx,
            rule.conditions,
            rule.requestSchema,
            operators
          );
        } else if (section === "response") {
          updates = prepareResponseCellPasteData(
            externalData,
            column,
            rowIdx,
            rule.conditions,
            rule.responseSchema
          );
        }

        // Apply the updates
        if (updates.length > 0) {
          applyExternalPasteUpdates(
            updates,
            rule.conditions,
            updateRule,
            null,
            rule,
            tableActions.pushToRuleUndoStack
          );
          setTestState(null);
        }
      } catch {
        // Could not read clipboard
      }
    };

    window.addEventListener("paste", handleGlobalPaste);
    return () => window.removeEventListener("paste", handleGlobalPaste);
  }, [
    hasInternalCopy,
    rule,
    null,
    updateRule,
    sendAction,
    selectedRows,
    globalValues,
    activeTab,
    testState,
    setTestState,
    selectedCell,
  ]);

  function splitKey(columnKey) {
    if (columnKey.startsWith("request.")) {
      return {
        section: "request",
        column: columnKey.split("request.").splice(1).join(""),
      };
    }
    if (columnKey.startsWith("response.")) {
      return {
        section: "response",
        column: columnKey.split("response.").splice(1).join(""),
      };
    }
    return null;
  }

  async function sendAction(action, args) {
    if (
      !["undoRuleUpdate", "redoRuleUpdate", "toggleColumnPin"].includes(action)
    ) {
      tableActions.pushToRuleUndoStack({
        conditions: rule.conditions,
        requestSchema: rule.requestSchema,
        responseSchema: rule.responseSchema,
        sampleRequest: rule.sampleRequest,
        sampleResponse: rule.sampleResponse,
        groups: rule.groups,
      });
    }

    return await tableActions[action](
      {
        testState,
        setTestState,
        selectedRows,
        setSelectedRows,
        activeTab,
        setActiveTab,
        focusedColumnKey,
        setFocusedColumnKey,
        updateRule,
        rule,
        user: null,
        pinnedColumns,
        setPinnedColumns,
      },
      args
    );
  }

  const showTest = !!testState;
  const visibleRequestColumns =
    rule?.requestSchema?.filter((c) => c.show) || [];
  const visibleResponseColumns =
    rule?.responseSchema?.filter((c) => c.show) || [];

  const columns = useMemo(() => {
    if (!rule) return [];

    return [
      // Use select column if user has edit permissions, otherwise use a placeholder column
      canEdit
        ? SelectColumn({ rule, sendAction, selectedRows, showRowSettings })
        : {
            key: "select-row", // Keep the same key for consistency
            name: "",
            width: 165, // Same width as the select column
            minWidth: 165,
            maxWidth: 165,
            resizable: false,
            frozen: true,
            formatter: ({ row }) => (
              <div className="flex w-[165px] items-center h-full bg-white justify-start pl-2">
                <div className="flex flex-row justify-between w-full pr-2.5">
                  <div className="inline-flex items-center">
                    {/* Show drag handle but make it non-interactive */}
                    <IconGridDots className="w-6 h-6 px-1 mr-1 text-gray-300 opacity-50" />
                    {/* Just show the row number */}
                    <span className="text-gray-300 ml-0 mr-3">
                      {row.id + 1}
                    </span>
                  </div>
                  <div className="inline-flex items-center">
                    {/* Show schedule indicator if applicable */}
                    {row.data.settings?.schedule &&
                      row.data.settings.schedule.length > 0 && (
                        <ClockIcon
                          title="Scheduled"
                          className={`w-5 h-5 m-1.5 mr-0 p-px ${
                            withinSchedule(row.data.settings.schedule)
                              ? "text-lime-500"
                              : "text-red-400"
                          }`}
                        />
                      )}
                    {/* Show group/priority indicator if applicable */}
                    {row.data.settings &&
                      (row.data.settings.groupId != null ||
                        row.data.settings.priority > 0) && (
                        <div
                          title="Grouped"
                          style={{
                            backgroundColor: row.data.settings?.groupId
                              ? rule.groups[row.data.settings.groupId]?.color
                              : "#000000",
                          }}
                          className="min-w-[1rem] justify-center inline-flex h-4 rounded-full m-1.5 mr-0 p-px text-center text-xs text-white items-center"
                        >
                          <span className="text-xs items-center px-0.5">
                            {(row.data.settings?.groupId
                              ? rule.groups[row.data.settings.groupId]?.priority
                              : row.data.settings.priority) !== 0 &&
                              (row.data.settings?.groupId
                                ? rule.groups[row.data.settings.groupId]
                                    ?.priority
                                : row.data.settings.priority)}
                          </span>
                        </div>
                      )}
                  </div>
                </div>
              </div>
            ),
            headerRenderer: () => (
              <div className="flex w-[165px] items-center h-full bg-white justify-start pl-10">
                {/* Empty header */}
              </div>
            ),
          },
      ...visibleRequestColumns.map((col, colIdx) =>
        RequestColumn(
          col,
          colIdx,
          sendAction,
          showTest,
          globalValues,
          rule.requestSchema,
          activeTab,
          canViewSchema &&
            visibleRequestColumns.length > 1 &&
            !rule.conditions.some(
              (x) => x.request[col.key] && x.request[col.key].op !== "any"
            ),
          !canEdit, // readOnly flag
          !canViewSchema,
          pinnedColumns.has(col.key), // isPinned flag
          requestLabel
        )
      ),
      ...visibleResponseColumns.map((col, colIdx) =>
        ResponseColumn(
          col,
          colIdx,
          sendAction,
          showTest,
          globalValues,
          rule.responseSchema,
          rule.sampleRequest,
          rule.sampleResponse,
          activeTab,
          canViewSchema && visibleResponseColumns.length > 1,
          !canEdit, // readOnly flag
          !canViewSchema,
          responseLabel
        )
      ),
    ];
  }, [
    rule,
    selectedRows,
    visibleRequestColumns,
    visibleResponseColumns,
    requestLabel,
    responseLabel,
    sendAction,
    showTest,
    globalValues,
    activeTab,
    canEdit,
    canViewSchema,
    pinnedColumns,
    showRowSettings,
  ]);

  // Show loader while rule is not yet available
  if (!rule) {
    return <PageLoader />;
  }

  function handleFill({ columnKey, sourceRow, targetRows }) {
    const { column, section } = splitKey(columnKey);

    const rowIdxs = new Set();
    targetRows.forEach((row) => {
      for (
        let i = Math.min(sourceRow.id, row.id);
        i <= Math.max(sourceRow.id, row.id);
        i++
      ) {
        rowIdxs.add(i);
      }
    });

    sendAction("batchUpdateCellData", {
      newData: sourceRow.data[section][column],
      key: column,
      sectionKey: section,
      rowIdxs: new Set(Array.from(rowIdxs)),
    });
  }

  function batchDebounce(func, wait) {
    let timerId = null;
    const calls = new Map();

    return ({ columnKey, sourceRow, targetRow }) => {
      const key = JSON.stringify({ columnKey, sourceRow: sourceRow.id });
      if (!calls.has(key)) {
        calls.set(key, { columnKey, sourceRow, targetRows: [] });
      }
      calls.get(key).targetRows.push(targetRow);

      clearTimeout(timerId);
      timerId = setTimeout(() => {
        calls.forEach((call) => func(call));
        calls.clear();
      }, wait);
    };
  }

  const debouncedFill = batchDebounce(handleFill, 50);

  return (
    <>
      {/* Meta tag skipped in embed mode */}
      <div
        className="flex flex-col text-editorBlack h-full overflow-hidden relative"
        data-embed-container="true"
      >
        {/* Hide navbar when showControls=false or in read-only mode (editMode='none') */}
        {showControls && editMode !== "none" && (
          <RuleEditorNavbar
            rule={rule}
            onboard={false}
            selectedRows={selectedRows}
            activeTab={activeTab}
            sendAction={sendAction}
            onlineMembers={onlineMembers}
            members={members}
            values={globalValues}
            editMode={editMode}
            canEditStructure={canEditStructure}
            canPublish={canPublish}
            embedToken={embedToken}
            apiBaseUrl={apiBaseUrl}
            onOpenCommandPalette={() => {
              // AI palette is disabled in embed mode
            }}
          />
        )}
        <div className="flex relative flex-1 min-h-0 overflow-auto">
          <DndProvider backend={HTML5Backend}>
            <DataGrid
              ref={gridRef}
              onCellKeyDown={(gridEvent, e) => {
                // Only allow cell edits if user has edit permissions and not in readOnly mode
                if (canEdit) {
                  // if event.key is backspace or delete and the document.activeElement has role="gridcell"
                  // then we should clear the selected cell
                  if (
                    ["Backspace", "Delete"].includes(e.key) &&
                    document.activeElement.getAttribute("role") === "gridcell"
                  ) {
                    let clearedData = {};
                    if (gridEvent.column.sectionKey === "request") {
                      clearedData = { op: "any", args: [] };
                    } else if (gridEvent.column.sectionKey === "response") {
                      clearedData = { value: null };
                    }
                    sendAction("updateCellData", {
                      newData: clearedData,
                      key: gridEvent.column.colKey,
                      sectionKey: gridEvent.column.sectionKey,
                      rowIdx: gridEvent.rowIdx,
                    });
                  }
                }

                // prevent default on arrow keys
                if (
                  ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(
                    e.key
                  )
                ) {
                  e.preventGridDefault();
                }
              }}
              columns={columns}
              rows={filteredRows}
              onRowsChange={canEdit ? setRows : undefined}
              onCellClick={({ row: _row, column }) => {
                setSelectedCell({ row: _row, column });
                if (column?.key && canViewSchema && activeTab !== null) {
                  const cellSidebar = splitKey(column.key);
                  setActiveTab(cellSidebar.section);
                  setFocusedColumnKey(cellSidebar.column);
                }
              }}
              enableCellSelect={canEdit}
              onCopy={() => {
                setHasInternalCopy(true);
              }}
              onPaste={
                canEdit
                  ? async (event) => {
                      // If we have an internal copy and sourceRow exists, use internal paste
                      if (hasInternalCopy && event.sourceRow) {
                        const {
                          sourceColumnKey,
                          sourceRow,
                          targetColumnKey,
                          targetRow,
                        } = event;

                        // verify the column type is the same as the source column before pasting
                        const { column: sourceColumn, section: sourceSection } =
                          splitKey(sourceColumnKey);
                        const { column: targetColumn, section: targetSection } =
                          splitKey(targetColumnKey);

                        if (sourceSection !== targetSection) {
                          return;
                        }

                        if (sourceSection === "request") {
                          if (
                            rule.requestSchema.find(
                              (c) => c.key === targetColumn
                            ).type !==
                            rule.requestSchema.find(
                              (c) => c.key === sourceColumn
                            ).type
                          ) {
                            return;
                          }
                        } else if (sourceSection === "response") {
                          if (
                            rule.responseSchema.find(
                              (c) => c.key === targetColumn
                            ).type !==
                            rule.responseSchema.find(
                              (c) => c.key === sourceColumn
                            ).type
                          ) {
                            return;
                          }
                        }

                        sendAction("updateCellData", {
                          newData: sourceRow.data[sourceSection][sourceColumn],
                          key: targetColumn,
                          sectionKey: targetSection,
                          rowIdx: targetRow.id,
                        });

                        // Reset the flag after successful internal paste
                        setTimeout(() => {
                          setHasInternalCopy(false);
                        }, 200);
                        return;
                      }

                      // Handle external paste (when not an internal copy or no sourceRow)
                      // Reset internal copy flag if it's still set
                      if (hasInternalCopy) {
                        setHasInternalCopy(false);
                      }

                      // Get target cell information
                      const { targetColumnKey, targetRow } = event;
                      if (!targetColumnKey || !targetRow) return;

                      // Skip select column
                      if (targetColumnKey === "select-row") return;

                      try {
                        // Get clipboard text
                        const clipboardText =
                          await navigator.clipboard.readText();
                        const externalData =
                          parseExternalClipboardData(clipboardText);

                        if (!externalData || externalData.length === 0) return;

                        const { column, section } = splitKey(targetColumnKey);

                        // Prepare the paste updates based on section type
                        let updates = [];
                        if (section === "request") {
                          updates = prepareRequestCellPasteData(
                            externalData,
                            column,
                            targetRow.id,
                            rule.conditions,
                            rule.requestSchema,
                            operators
                          );
                        } else if (section === "response") {
                          updates = prepareResponseCellPasteData(
                            externalData,
                            column,
                            targetRow.id,
                            rule.conditions,
                            rule.responseSchema
                          );
                        }

                        // Apply the updates
                        if (updates.length > 0) {
                          applyExternalPasteUpdates(
                            updates,
                            rule.conditions,
                            updateRule,
                            null,
                            rule,
                            tableActions.pushToRuleUndoStack
                          );
                          setTestState(null);
                        }
                      } catch {
                        // Could not read clipboard or process paste
                      }
                    }
                  : undefined
              }
              onFill={canEdit ? debouncedFill : undefined}
              renderers={{
                rowRenderer,
              }}
              rowKeyGetter={(row) => row.id}
              selectedRows={selectedRows}
              onSelectedRowsChange={setSelectedRows}
              className="flex-1 rdg-light select-none h-full bg-editorBgGray gap-0.5 pt-10"
              // virtualization causes a scrolling issue, because columns
              // change the grid size when they're added. keep it disabled
              enableVirtualization={true}
              headerRowHeight={75}
              rowHeight={44}
            />
          </DndProvider>

          {/* AI Palette is disabled in embed mode */}

          {/* need a little box to hide the checkbox row from scrolling out of the top */}
          <div className="absolute left-0 top-0 h-10 w-[166px] z-0 bg-editorBgGray border-r border-b">
            &nbsp;
          </div>
          {/* Sidebar disabled in embed mode */}
        </div>
        {showFooter && (
          <div
            style={{ height: "39px" }}
            className="inline-flex w-full bg-editorBgGray border-t border-neutral-300 shadow relative h-[39px] min-h-[39px] flex-shrink-0"
          >
            <div className="inline-flex space-x-4 align-middle items-center h-[39px] min-h-[39px] flex-shrink-0 justify-between px-4 w-full">
              <div className="inline-flex divide-x divide-neutral-200 h-full space-x-4">
                <span className="inline-flex text-neutral-400 text-sm self-center mr-1 whitespace-nowrap">
                  {rows.length} conditions
                </span>
                <div className="inline-flex align-middle pl-2">
                  <div className="inline-flex h-fit self-center bg-neutral-50 focus-within:bg-white rounded-md relative">
                    <IconSearch className="w-6 h-7 self-center text-neutral-400 bg-transparent p-1.5 pr-0 rounded-l-md border border-neutral-300 border-r-0" />
                    <input
                      type="text"
                      placeholder="Search all conditions..."
                      value={searchRows}
                      onChange={(e) => setSearchRows(e.target.value)}
                      className="w-48 h-7 -ml-1 self-center bg-transparent text-sm placeholder:text-neutral-400 rounded-r-md rounded-l-none border-neutral-300 border border-l-0 text-neutral-800 focus:outline-none focus:ring-0 focus:border-neutral-300 pr-7"
                    />
                    {searchRows && (
                      <button
                        onClick={() => setSearchRows("")}
                        className="absolute right-1 top-1/2 -translate-y-1/2 p-1 text-neutral-400 hover:text-neutral-600 transition-colors"
                        aria-label="Clear search"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              </div>
              <div className="inline-flex divide-x divide-neutral-200 align-middle space-x-4 h-full">
                {rule.published && (
                  <div className="inline-flex align-middle mr-1">
                    <BoltIcon className="w-6 h-[1.5rem] p-1 mr-1.5 self-center text-neutral-400" />
                    <span className="inline-flex text-neutral-400 text-sm self-center whitespace-nowrap">
                      Published {moment(rule.publishedAt).fromNow()}
                    </span>
                  </div>
                )}
                {!rule.published && (
                  <div className="inline-flex align-middle mr-1">
                    <span className="inline-flex text-neutral-400 text-sm self-center whitespace-nowrap">
                      Draft (not published)
                    </span>
                  </div>
                )}
                <div className="inline-flex align-middle pl-4">
                  <PencilSquareIcon className="w-6 h-[1.6rem] p-1 mr-1.5 self-center text-neutral-400" />
                  <span className="inline-flex text-neutral-400 text-sm self-center whitespace-nowrap">
                    Last modified {moment(rule.updatedAt).fromNow()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
