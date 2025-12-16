import RequestHeaderCell from "../Cell/HeaderCell";
import ResponseCell from "../Cell/ResponseCell";

export default function ResponseColumn(
  { key, name, type },
  colIdx,
  sendAction,
  showTest,
  globalValues,
  responseSchema,
  sampleRequest,
  sampleResponse,
  activeTab,
  canHide,
  readOnly,
  lockedSchema,
  sectionLabel = null
) {
  // remove key from sampleResponse
  if (sampleResponse) {
    const { [key]: _, ...rest } = sampleResponse;
    sampleResponse = rest;
  }
  return {
    key: `response.${key}`,
    colKey: key,
    colIdx,
    sectionKey: "response",
    sectionLabel,
    sendAction,
    name,
    type,
    activeTab,
    colSchema: responseSchema.find((col) => col.key === key),
    canHide,
    resizable: false,
    readOnly,
    lockedSchema,
    headerRenderer: RequestHeaderCell,
    formatter: ({ row, isCellSelected }) => {
      return (
        <ResponseCell
          idx={row.id}
          cellData={row.data.response[key]}
          updateCellData={(newData) =>
            sendAction("updateCellData", {
              newData,
              key,
              sectionKey: "response",
              rowIdx: row.id,
            })
          }
          selected={isCellSelected}
          deactivated={row.data.settings ? !row.data.settings.enabled : false}
          colIdx={colIdx}
          type={type}
          showTest={showTest}
          testSuccess={row.successIdxs?.includes(row.id)}
          globalValues={globalValues}
          responseSchema={responseSchema.find((col) => col.key === key)}
          sampleRequest={sampleRequest}
          sampleResponse={sampleResponse}
          readOnly={readOnly}
          lockedSchema={lockedSchema}
        />
      );
    },
  };
}
