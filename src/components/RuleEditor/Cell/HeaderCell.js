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
import Tooltip from "../../Rule/Tooltip";
import { useEffect, useState } from "react";
import { capitalize } from "../util/util";
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
    // New optional field injected by compare view to indicate schema changes
    columnChangeStatus,
  },
}) {
  const { operators: types } = useOperators();
  const typeData = types[type];

  const [sectionHeaderRef, setSectionHeaderRef] = useState();
  const [width, setWidth] = useState(165); // Default width for non-first columns
  const [_pinnedCols, setPinnedCols] = useState([]);

  useEffect(() => {
    let currPinnedCols = Array.from(
      sectionHeaderRef?.parentElement?.parentElement?.parentElement?.querySelectorAll(
        ".rdg-cell-frozen"
      ) || []
    ).slice(1);

    setPinnedCols(currPinnedCols);
  }, [sectionHeaderRef, isPinned]);

  // Function to calculate width
  const calculateWidth = () => {
    if (sectionHeaderRef && colIdx === 0) {
      try {
        // Get all column headers
        const colHeaders = Array.from(
          sectionHeaderRef.parentElement.parentElement.parentElement.querySelectorAll(
            '[role="columnheader"]'
          )
        );

        // Filter to current section columns only, using data attributes or other means
        // Use a simpler approach - count columns until we reach a different section
        const currentSectionColumns = [];
        let foundSection = false;
        let _movedToNextSection = false;

        for (const colHeader of colHeaders) {
          // Skip the first select/placeholder column
          if (colHeader.getAttribute("aria-colindex") === "1") {
            continue;
          }

          // Look for the column name div to determine section
          const nameDiv = colHeader.querySelector("div[name]");
          if (nameDiv) {
            const colSectionKey = nameDiv.getAttribute("name");

            if (colSectionKey === sectionKey) {
              foundSection = true;
              currentSectionColumns.push(colHeader);
            } else if (foundSection) {
              // We've moved past our section
              _movedToNextSection = true;
              break;
            }
          }
        }

        // If we couldn't determine sections, fall back to a reasonable default
        if (currentSectionColumns.length === 0) {
          setWidth(165 * 4); // Assume 4 columns as fallback
        } else {
          // Sum the widths
          let totalWidth = 0;
          for (const col of currentSectionColumns) {
            totalWidth += col.getBoundingClientRect().width + 2; // +2 for gap
          }
          if (readOnly && lockedSchema) {
            totalWidth += 165 + 228; // Add width for the select column
          }
          setWidth(totalWidth);
        }
      } catch (e) {
        console.error("Error calculating header width:", e);
        setWidth(165 * 4); // Fallback width
      }
    } else if (colIdx !== 0) {
      setWidth(165); // Default width for non-first columns
    }
  };

  // Calculate width when component mounts or sectionHeaderRef changes
  useEffect(() => {
    calculateWidth();
    // Add resize event listener
    const handleResize = () => {
      calculateWidth();
    };
    setTimeout(() => {
      calculateWidth();
    }, 100);
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [sectionHeaderRef, activeTab]);

  // Apply subtle background for schema changes, if provided
  const columnChangeBgClass =
    columnChangeStatus === "added"
      ? "bg-green-100"
      : columnChangeStatus === "deleted"
      ? "bg-red-100"
      : "";

  return (
    // XXX DO NOT CHANGE OUTER DIV OR THE WORLD ENDS
    <div name={`${sectionKey}`} className="h-full">
      {colIdx === 0 && (
        <div
          className="absolute -top-10 h-10 pl-2 leading-4 flex items-center border-b z-[9999] bg-editorBgGray"
          ref={setSectionHeaderRef}
          style={{ width: `${width}px` }}
        >
          <div
            className={`-top-8 left-[calc(178px)] mr-4 sticky text-editorBlack text-[1.05rem] font-semibold ${
              readOnly ? "!left-[10px]" : ""
            }`}
          >
            {sectionLabel || capitalize(sectionKey)}
          </div>
        </div>
      )}
      {isPinned && (
        <div
          ref={setSectionHeaderRef}
          className="absolute -mt-10 -top-10 h-10 pl-2 leading-4 w-full sticky flex items-center border-b z-[9999] bg-editorBgGray"
        >
          <div
            className={`-top-8 left-[calc(176px)] mr-4 sticky text-editorBlack text-[1.05rem] font-semibold ${
              readOnly ? "!left-[10px]" : ""
            }`}
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
