import { EyeSlashIcon } from "@heroicons/react/24/solid";
import {
  Icon123,
  IconAlphabetLatin,
  IconBrackets,
  IconCalendar,
  IconCheckbox,
  IconMathFunction,
  IconPin,
  IconPinFilled,
} from "@tabler/icons-react";
import classNames from "classnames";
import Tooltip from "../../ui/Tooltip";
import { capitalize } from "../../../utils/string";
import { useOperators } from "../../../context/OperatorsContext";

export default function HeaderCell({
  column: {
    name,
    type,
    activeTab,
    key,
    colIdx,
    colKey,
    colSchema,
    sectionKey,
    sectionLabel,
    sendAction,
    canHide,
    readOnly = false,
    lockedSchema,
    isPinned = false,
    showSectionHeader = colIdx === 0,
    sectionHeaderWidth = 165 * 4,
    sectionLabelLeft: sectionLabelLeftOverride,
    // New optional field injected by compare view to indicate schema changes
    columnChangeStatus,
  },
}) {
  const { operators: types } = useOperators();
  const typeData = types[type];

  // Apply subtle background for schema changes, if provided
  const columnChangeBgClass =
    columnChangeStatus === "added"
      ? "bg-green-100"
      : columnChangeStatus === "deleted"
      ? "bg-red-100"
      : "";
  const sectionLabelLeft = readOnly
    ? "10px"
    : sectionLabelLeftOverride || "178px";

  return (
    <div name={`${sectionKey}`} className="h-full">
      {showSectionHeader && (
        <div
          className="absolute -top-10 h-10 pl-2 leading-4 flex items-center border-b z-[9999] bg-editorBgGray"
          style={{ width: `${sectionHeaderWidth}px` }}
        >
          <div
            className="-top-8 mr-4 sticky text-editorBlack text-[1.05rem] font-semibold"
            style={{ left: sectionLabelLeft }}
          >
            {sectionLabel || capitalize(sectionKey)}
          </div>
        </div>
      )}
      {isPinned && !showSectionHeader && (
        <div className="absolute -mt-10 -top-10 h-10 pl-2 leading-4 w-full sticky flex items-center border-b z-[9999] bg-editorBgGray">
          <div
            className="-top-8 mr-4 sticky text-editorBlack text-[1.05rem] font-semibold"
            style={{ left: sectionLabelLeft }}
          ></div>
        </div>
      )}
      <div
        className={classNames(
          "flex items-center p-2.5 pt-1 h-full group cursor-pointer bg-white",
          columnChangeBgClass
        )}
        onClick={() => {
          if (!readOnly && !lockedSchema) {
            sendAction("openSidebarToColumn", {
              sidebarTab: sectionKey,
              key: colKey,
            });
          }
        }}
      >
        <div className="flex flex-col flex-1">
          {!lockedSchema && (
            <>
              <div className="mr-2 mt-1 text-lg font-medium leading-normal truncate max-w-sm">
                {name}
              </div>
              <div className="flex opacity-80 rounded-sm border-neutral-300">
                <div
                  className={classNames(
                    "font-normal font-mono aspect-square bg-opacity-35 self-center align-middle border-collapse rounded-[2px] text-xs",
                    typeData?.color.text,
                    typeData?.color.bg
                  )}
                >
                  {typeData.label === "Text" && (
                    <IconAlphabetLatin size={14} stroke={2} />
                  )}
                  {typeData.label === "Number" && (
                    <Icon123 size={14} stroke={2} />
                  )}
                  {typeData.label === "Boolean" && (
                    <IconCheckbox size={14} stroke={2} />
                  )}
                  {typeData.label === "List" && (
                    <IconBrackets size={14} stroke={2} />
                  )}
                  {typeData.label === "Date" && (
                    <IconCalendar size={14} stroke={2} />
                  )}
                  {typeData.label === "Function" && (
                    <IconMathFunction size={14} stroke={2} />
                  )}
                </div>
                <div className="font-mono text-gray-500 h-fit font-normal inline-block self-center align-middle leading-normal ml-1.5 pr-1.5 text-xs truncate max-w-sm">
                  {key.substring(key.indexOf(".") + 1)}
                </div>
              </div>
            </>
          )}
          {lockedSchema && (
            <>
              <div className="mr-2 mt-1 text-lg font-medium leading-normal text-neutral-600 truncate max-w-sm">
                {name}
              </div>
              {colSchema?.description ? (
                <div className="flex rounded-sm border-neutral-300">
                  <Tooltip hint={colSchema?.description}>
                    <div className="font-light opacity-80 cursor-help text-gray-500 hover:text-gray-800 text-xs leading-normal pt-0.5 truncate max-w-sm">
                      {colSchema?.description || ""}
                    </div>
                  </Tooltip>
                </div>
              ) : (
                <div className="flex opacity-80 rounded-sm align-middle border-neutral-300 mt-0.5">
                  <div
                    className={classNames(
                      "font-normal font-mono aspect-square bg-opacity-35 self-center align-middle border-collapse rounded-[2px] text-xs",
                      typeData?.color.text,
                      typeData?.color.bg
                    )}
                  >
                    {typeData.label === "Text" && (
                      <IconAlphabetLatin size={14} stroke={2} />
                    )}
                    {typeData.label === "Number" && (
                      <Icon123 size={14} stroke={2} />
                    )}
                    {typeData.label === "Boolean" && (
                      <IconCheckbox size={14} stroke={2} />
                    )}
                    {typeData.label === "List" && (
                      <IconBrackets size={14} stroke={2} />
                    )}
                    {typeData.label === "Date" && (
                      <IconCalendar size={14} stroke={2} />
                    )}
                    {typeData.label === "Function" && (
                      <IconMathFunction size={14} stroke={2} />
                    )}
                  </div>
                  <div className="font-mono text-gray-500 h-fit font-normal inline-flex self-center align-middle leading-normal ml-1.5 pr-1.5 text-xs truncate max-w-sm">
                    {typeData.label}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
        {!lockedSchema && sectionKey === "request" && (
          <div className="flex gap-3 align-middle">
            <button
              className={classNames(
                "w-4 h-4 opacity-0 group-hover:opacity-100 text-gray-500 relative",
                canHide ? "cursor-pointer" : "cursor-not-allowed"
              )}
              disabled={!canHide}
              onClick={(e) => {
                sendAction("updateColumnSchema", {
                  key: colKey,
                  sectionKey,
                  show: false,
                });
                e.stopPropagation();
              }}
            >
              <EyeSlashIcon
                className={classNames(
                  "w-5 text-gray-400",
                  canHide && "hover:text-black"
                )}
              />
            </button>
            <button
              className={classNames(
                "w-4 h-4 -mt-0.5 group-hover:opacity-100 text-gray-500 relative",
                "cursor-pointer",
                isPinned ? "opacity-100" : "opacity-0"
              )}
              onClick={(e) => {
                sendAction("toggleColumnPin", {
                  key: colKey,
                  sectionKey,
                  isPinned: !isPinned,
                });
                e.stopPropagation();
              }}
              title={isPinned ? "Unpin column" : "Pin column"}
            >
              {isPinned ? (
                <IconPinFilled className="w-5 text-neutral-900 -rotate-45 hover:text-neutral-400 duration-200" />
              ) : (
                <IconPin className="w-5 text-gray-400 hover:text-neutral-600 hover:-rotate-45 duration-200" />
              )}
            </button>
          </div>
        )}
        {!lockedSchema && sectionKey === "response" && (
          <button
            className={classNames(
              "w-4 h-4 ml-4 opacity-0 group-hover:opacity-100 text-gray-500 relative",
              canHide ? "cursor-pointer" : "cursor-not-allowed"
            )}
            disabled={!canHide}
            onClick={(e) => {
              sendAction("updateColumnSchema", {
                key: colKey,
                sectionKey,
                show: false,
              });
              e.stopPropagation();
            }}
          >
            <EyeSlashIcon
              className={classNames(
                "w-5 text-gray-400",
                canHide && "hover:text-black"
              )}
            />
          </button>
        )}
      </div>
    </div>
  );
}
