import RequestHeaderCell from "../Cell/HeaderCell";
import RequestCell from "../Cell/RequestCell";

export default function RequestColumn(
  { key, name, type },
  colIdx,
  sendAction,
  showTest,
  globalValues,
  requestSchema,
  activeTab,
  canHide,
  readOnly,
  lockedSchema,
  isPinned = false,
  sectionLabel = null
) {
  return {
    key: `request.${key}`,
    colKey: key,
    colIdx,
    sectionKey: "request",
    sectionLabel,
    sendAction,
    name,
    type,
    activeTab,
    colSchema: requestSchema.find((col) => col.key === key),
    canHide,
    resizable: false,
    readOnly,
    lockedSchema,
    isPinned,
    frozen: isPinned,
    headerRenderer: RequestHeaderCell,
    formatter: ({ row, isCellSelected }) => {
      return (
        <RequestCell
          cellData={row.data.request[key]}
          rowSettings={row.data.settings}
          updateCellData={(newData) =>
            sendAction("updateCellData", {
              newData,
              key,
              sectionKey: "request",
              rowIdx: row.id,
            })
          }
          selected={isCellSelected}
          deactivated={row.data.settings ? !row.data.settings.enabled : false}
          type={type}
          showTest={
            showTest &&
            (Array.isArray(row.successIdxs)
              ? row.id <= Math.max(...row.successIdxs) ||
                row.successIdxs.length === 0
              : false)
          }
          testState={row.testState?.[key]}
          globalValues={globalValues}
          requestSchema={requestSchema.find((s) => s.key === key)}
          readOnly={readOnly}
          isPinned={isPinned}
        />
      );
    },
  };
}
