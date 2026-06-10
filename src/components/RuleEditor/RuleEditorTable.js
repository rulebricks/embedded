import {
  BoltIcon,
  ClockIcon,
  PencilSquareIcon,
} from "@heroicons/react/20/solid";
import { IconGridDots, IconSearch } from "@tabler/icons-react";
import PageLoader from "../ui/PageLoader";
import moment from "moment/moment";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import DataGrid from "react-data-grid";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { useQuery, useQueryClient } from "react-query";
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
} from "../../utils/clipboard";
import { useRowUtils } from "../../hooks/useRowUtils";
import { withinSchedule } from "../../utils/schedule";
import { useEmbedRuleMutator } from "../../hooks/useEmbedRuleMutator";
import { splitKey } from "../../utils/table";
import { batchDebounce } from "../../utils/concurrency";
import {
  createEdgeAutoScroller,
  getGridContainer,
  scrollRowIntoView,
} from "../../utils/autoScroll";
import { useOperators } from "../../context/OperatorsContext";

export default function RuleEditorTable({
  ruleOverride = null,
  globalValuesOverride = null,
  // Embed props
  editMode = "full", // 'none', 'cells', or 'full'
  canPublish = false,
  publishVersionNotes = false, // Show optional version-note popover on publish
  lockedSchema: lockedSchemaProp = null, // null = derive from editMode, true/false = explicit
  embedToken = null,
  apiBaseUrl = null,
  ruleId: explicitRuleId = null,
  embedUser = null,
  showFooter = true,
  showControls = true, // Whether to show the top navbar with controls
  showRowSettings = false, // Whether to show the gear icon in rows
  onRuleChange = null,
  onPublish = null,
  onError = null,
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
  const [frozenColumnOffsetStyles, setFrozenColumnOffsetStyles] = useState("");
  const [sectionHeaderMetrics, setSectionHeaderMetrics] = useState({});

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

  // After a row move (button, popover, or drag-drop), bring the moved row
  // into view and shift react-data-grid's internal focus onto it so rdg's
  // own scroll-on-mount logic (which targets the previously-selected cell)
  // can't drag the viewport back to a stale cell.
  const focusMovedRow = useCallback(
    (newRowIdx) => {
      if (typeof newRowIdx !== "number" || newRowIdx < 0) return;
      const preferredColIdx = selectedCell?.column?.idx;
      const colIdx =
        typeof preferredColIdx === "number" && preferredColIdx >= 1
          ? preferredColIdx
          : 1;

      // Wait one frame so rdg has rendered the new row order before we move
      // its selection (and so its own scrollIntoView runs on the right cell).
      requestAnimationFrame(() => {
        const grid = gridRef.current;
        if (grid && typeof grid.selectCell === "function") {
          grid.selectCell({ rowIdx: newRowIdx, idx: colIdx });
        }

        // Mirror the new focus in our local selectedCell state so paste
        // targeting stays in sync with rdg.
        const row = { id: newRowIdx };
        const columnForState =
          selectedCell?.column && selectedCell.column.idx === colIdx
            ? selectedCell.column
            : { idx: colIdx, key: selectedCell?.column?.key };
        setSelectedCell({ row, column: columnForState });

        // Use an instant scroll so we land at the true top (scrollTop 0)
        // before rdg's cell-mount scrollIntoView runs. A smooth scroll gets
        // interrupted by rdg's synchronous scrollIntoView on the selected
        // cell, which honours scrollPaddingBlock and leaves row 0 clipped
        // just under the header.
        scrollRowIntoView(getGridContainer(), newRowIdx, { behavior: "auto" });
      });
    },
    [selectedCell]
  );

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
  const [activeTab, setActiveTab] = useState(null);

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

  // Auto-scroll the decision table near viewport edges while the user is
  // dragging the cell-fill handle or re-ordering rows. Both interactions
  // share a single edge-based scroller instance so they never fight.
  useEffect(() => {
    if (!canEdit) return;

    const autoScroller = createEdgeAutoScroller(getGridContainer);

    // --- Cell-fill drag (react-data-grid fill handle) -----------------------
    // react-data-grid exposes the fill handle as `.rdg-cell-drag-handle` and
    // tracks the drag via window-level mousemove/mouseup. We piggy-back on
    // the same lifecycle: start tracking on mousedown on the handle, update
    // the scroller on every mousemove, and stop on mouseup.
    const handleFillMouseDown = (event) => {
      if (event.button !== 0) return;
      if (!event.target?.closest?.(".rdg-cell-drag-handle")) return;
      const onMouseMove = (e) => autoScroller.update(e.clientY);
      const onMouseUp = () => {
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);
        autoScroller.stop();
      };
      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    };

    // --- Row-reorder drag (react-dnd HTML5 backend) -------------------------
    // The HTML5 backend fires native dragover events while a row is being
    // dragged. We only care when the pointer is over the grid, and stop on
    // dragend/drop (both fire on the source element at the end of a drag).
    const handleDragOver = (event) => {
      const container = getGridContainer();
      if (!container) return;
      const rect = container.getBoundingClientRect();
      if (
        event.clientX < rect.left ||
        event.clientX > rect.right ||
        event.clientY < rect.top ||
        event.clientY > rect.bottom
      ) {
        return;
      }
      autoScroller.update(event.clientY);
    };
    const stopDragAutoScroll = () => autoScroller.stop();

    document.addEventListener("mousedown", handleFillMouseDown, true);
    document.addEventListener("dragover", handleDragOver);
    document.addEventListener("dragend", stopDragAutoScroll);
    document.addEventListener("drop", stopDragAutoScroll);

    return () => {
      document.removeEventListener("mousedown", handleFillMouseDown, true);
      document.removeEventListener("dragover", handleDragOver);
      document.removeEventListener("dragend", stopDragAutoScroll);
      document.removeEventListener("drop", stopDragAutoScroll);
      autoScroller.stop();
    };
  }, [canEdit]);

  // listen for undo/redo events and row keyboard shortcuts
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

      // Shared guard: skip row shortcuts in editable text inputs, popovers,
      // or without edit access.
      const isRowShortcutBlocked = () => {
        if (!canEdit) return true;
        const ae = document.activeElement;
        if (!ae) return false;
        if (ae.tagName === "INPUT" || ae.tagName === "TEXTAREA") return true;
        if (ae.isContentEditable) return true;
        if (ae.closest(".cm-content")) return true;
        if (ae.closest(".cell-popover")) return true;
        return false;
      };

      // Cmd/Ctrl + Enter: insert a row below the focused cell, or append if none
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && !e.shiftKey) {
        if (isRowShortcutBlocked()) return;
        e.preventDefault();
        const focusedRowId = selectedCell?.row?.id;
        if (typeof focusedRowId === "number") {
          sendAction("addRow", { insertAfterIdx: focusedRowId });
        } else {
          sendAction("addRow");
        }
        return;
      }

      // Cmd/Ctrl + Backspace/Delete: delete rows (selectedRows, or focused row)
      if (
        (e.key === "Backspace" || e.key === "Delete") &&
        (e.metaKey || e.ctrlKey)
      ) {
        if (isRowShortcutBlocked()) return;
        if (selectedRows && selectedRows.size > 0) {
          e.preventDefault();
          sendAction("deleteSelectedRows");
          return;
        }
        const focusedRowId = selectedCell?.row?.id;
        if (focusedRowId !== undefined && focusedRowId !== null) {
          e.preventDefault();
          sendAction("deleteSelectedRows", {
            rowIds: new Set([focusedRowId]),
          });
          return;
        }
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
  }, [sendAction, selectedCell, selectedRows, canEdit]);

  const [focusedColumnKey, setFocusedColumnKey] = useState(null);
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

    // Capture pre-move conditions length so the bottom-target index remains
    // correct regardless of how selectedRows is reset during the action.
    const preMoveConditionsLen = rule?.conditions?.length || 0;

    const result = await tableActions[action](
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
        user: effectiveUser,
        pinnedColumns,
        setPinnedColumns,
      },
      args
    );

    if (action === "moveSelectedRowsToTop") {
      focusMovedRow(0);
    } else if (action === "moveSelectedRowsToBottom") {
      focusMovedRow(Math.max(0, preMoveConditionsLen - 1));
    } else if (action === "moveSelectedRowsToPosition") {
      const zeroBased =
        result && typeof result.targetIndex === "number"
          ? result.targetIndex
          : null;
      if (zeroBased !== null) {
        focusMovedRow(zeroBased);
      }
    }

    return result;
  }

  const showTest = !!testState;
  const visibleRequestColumns =
    rule?.requestSchema?.filter((c) => c.show) || [];
  const visibleResponseColumns =
    rule?.responseSchema?.filter((c) => c.show) || [];

  const columns = useMemo(() => {
    if (!rule) return [];

    const firstPinnedRequestColumn = visibleRequestColumns.find((col) =>
      pinnedColumns.has(col.key)
    );
    const requestSectionHeaderKey =
      firstPinnedRequestColumn?.key ?? visibleRequestColumns[0]?.key;

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
          requestLabel,
          col.key === requestSectionHeaderKey,
          sectionHeaderMetrics.request
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
          responseLabel,
          colIdx === 0,
          sectionHeaderMetrics.response
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
    sectionHeaderMetrics,
  ]);

  // Central layout engine for section headers and pinned (frozen) columns.
  // Measures rendered column headers with a ResizeObserver + rAF and emits:
  // - sectionHeaderMetrics: { request|response: { width, labelLeft } }
  // - frozenColumnOffsetStyles: CSS overriding frozen cell offsets per column
  useEffect(() => {
    let frameId = null;
    let resizeObserver = null;

    // Prefer this instance's grid element so multiple embeds on a page
    // don't measure each other's headers.
    const getGridElement = () =>
      gridRef.current?.element ??
      document.querySelector(".rule-editor-grid");

    const updateHeaderLayout = () => {
      const grid = getGridElement();
      if (!grid) {
        setFrozenColumnOffsetStyles("");
        setSectionHeaderMetrics((currentMetrics) =>
          Object.keys(currentMetrics).length === 0 ? currentMetrics : {}
        );
        return;
      }

      const headers = Array.from(
        grid.querySelectorAll('.rdg-cell[role="columnheader"]')
      ).sort(
        (a, b) =>
          Number(a.getAttribute("aria-colindex")) -
          Number(b.getAttribute("aria-colindex"))
      );
      const sectionHeaders = headers
        .map((header) => ({
          header,
          section: header.querySelector("div[name]")?.getAttribute("name"),
        }))
        .filter(({ section }) => section);
      const frozenHeaders = headers.filter((header) =>
        header.classList.contains("rdg-cell-frozen")
      );

      const widthOf = (headersForWidth) =>
        headersForWidth.reduce(
          (total, header) => total + header.getBoundingClientRect().width + 2,
          0
        );

      const requestHeaders = sectionHeaders
        .filter(({ section }) => section === "request")
        .map(({ header }) => header);
      const responseHeaders = sectionHeaders
        .filter(({ section }) => section === "response")
        .map(({ header }) => header);
      const frozenRequestHeaders = requestHeaders.filter((header) =>
        header.classList.contains("rdg-cell-frozen")
      );
      const requestHeadersForWidth =
        pinnedColumns.size > 0 && frozenRequestHeaders.length > 0
          ? frozenRequestHeaders
          : requestHeaders;

      let frozenWidth = 0;
      let nextStyles = "";

      if (pinnedColumns.size === 0 || frozenHeaders.length <= 1) {
        setFrozenColumnOffsetStyles("");
      } else {
        let left = 0;
        nextStyles = frozenHeaders
          .map((header) => {
            const ariaColIndex = header.getAttribute("aria-colindex");
            const cssRule = `
              .rule-editor-grid .rdg-cell-frozen[aria-colindex="${ariaColIndex}"] {
                inset-inline-start: ${Math.round(left)}px !important;
              }
            `;

            left += header.getBoundingClientRect().width;
            return cssRule;
          })
          .join("\n");
        frozenWidth = left;
      }

      const sectionLabelLeft = Math.round(frozenWidth + 12);
      const cssVariables = `
        .rule-editor-grid {
          --rule-editor-frozen-width: ${Math.round(frozenWidth)}px;
          --rule-editor-section-label-left: ${sectionLabelLeft}px;
        }
      `;
      const nextMetrics = {
        request: {
          width: widthOf(requestHeadersForWidth) || 165 * 4,
          labelLeft: "178px",
        },
        response: {
          width: widthOf(responseHeaders) || 165 * 4,
          labelLeft: frozenWidth > 0 ? `${sectionLabelLeft}px` : "178px",
        },
      };
      const nextFrozenStyles =
        frozenWidth > 0 ? `${cssVariables}\n${nextStyles}` : "";

      setFrozenColumnOffsetStyles((currentStyles) =>
        currentStyles === nextFrozenStyles ? currentStyles : nextFrozenStyles
      );
      setSectionHeaderMetrics((currentMetrics) =>
        JSON.stringify(currentMetrics) === JSON.stringify(nextMetrics)
          ? currentMetrics
          : nextMetrics
      );
    };

    const scheduleUpdate = () => {
      if (frameId != null) {
        cancelAnimationFrame(frameId);
      }
      frameId = requestAnimationFrame(() => {
        frameId = null;
        updateHeaderLayout();
      });
    };

    scheduleUpdate();
    window.addEventListener("resize", scheduleUpdate);

    const grid = getGridElement();
    if (grid && typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(scheduleUpdate);
      resizeObserver.observe(grid);
      grid
        .querySelectorAll('.rdg-cell[role="columnheader"]')
        .forEach((header) => resizeObserver.observe(header));
    }

    return () => {
      if (frameId != null) {
        cancelAnimationFrame(frameId);
      }
      window.removeEventListener("resize", scheduleUpdate);
      resizeObserver?.disconnect();
    };
  }, [pinnedColumns, columns, filteredRows.length]);

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

  const debouncedFill = batchDebounce(handleFill, 50);

  return (
    <>
      <div
        className="flex flex-col text-editorBlack overflow-hidden relative"
        style={{ height: "100%", maxHeight: "100%" }}
      >
        {frozenColumnOffsetStyles && <style>{frozenColumnOffsetStyles}</style>}
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
            publishVersionNotes={publishVersionNotes}
            embedToken={embedToken}
            apiBaseUrl={apiBaseUrl}
            onPublish={onPublish}
            onRuleChange={onRuleChange}
            onError={onError}
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
                // Block react-data-grid's built-in Shift+Space row-select
                if (e.key === " " && e.shiftKey) {
                  e.preventGridDefault();
                  e.preventDefault();
                  return;
                }

                // Cmd/Ctrl+Backspace/Delete handled by the window-level
                // shortcut; don't also clear the cell here.
                const isModifiedDelete =
                  ["Backspace", "Delete"].includes(e.key) &&
                  (e.metaKey || e.ctrlKey);

                // Only allow cell edits if user has edit permissions and not in readOnly mode
                if (canEdit && !isModifiedDelete) {
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
              className="rule-editor-grid flex-1 rdg-light select-none h-full bg-editorBgGray gap-0.5 pt-10"
              enableVirtualization={true}
              headerRowHeight={75}
              rowHeight={44}
            />
          </DndProvider>

          {/* need a little box to hide the checkbox row from scrolling out of the top */}
          <div className="absolute left-0 top-0 h-10 w-[166px] z-0 bg-editorBgGray border-r border-b">
            &nbsp;
          </div>
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
                      className="w-48 h-7 -ml-1 pl-2 self-center bg-transparent text-sm placeholder:text-neutral-400 rounded-r-md rounded-l-none border-neutral-300 border border-l-0 text-neutral-800 focus:outline-none focus:ring-0 focus:border-neutral-300 pr-7"
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
