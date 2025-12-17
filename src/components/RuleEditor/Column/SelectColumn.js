import {
  CheckIcon,
  ClockIcon,
  Cog6ToothIcon,
} from "@heroicons/react/20/solid";
import { IconGridDots } from "@tabler/icons-react";

import classNames from "classnames";
import { useState } from "react";
import { useFocusRef, useRowSelection } from "react-data-grid";

import Modal from "../../ui/Modal";
import { RowSettingsModal } from "../Row/RowSettingsModal";
import { withinSchedule } from "../../../utils/schedule";

const width = 165;

export function SelectCellFormatter({
  value,
  isCellSelected,
  disabled,
  onChange,
  header = false,
  row,
  rule,
  sendAction,
  selectedRows,
  readOnly = false,
  showRowSettings = false,
}) {
  const [rowSettingsOpen, setRowSettingsOpen] = useState(false);
  const [initTabIdx, setInitTabIdx] = useState(0);
  const { ref } = useFocusRef(isCellSelected);

  const elevatedPriority =
    (row?.data.settings?.groupId
      ? rule.groups[row?.data.settings?.groupId]?.priority
      : row?.data.settings?.priority) !== 0;

  return (
    <div
      className={classNames(
        "flex w-[165px] items-center h-full",
        header ? "justify-start pl-10" : "justify-start pl-2 ",
        rowSettingsOpen ? "bg-neutral-200" : "bg-white"
      )}
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
    >
      <div className="flex flex-row justify-between w-full pr-2.5">
        <div className="inline-flex items-center">
          {!header && !readOnly && (
            <IconGridDots
              className={classNames(
                "w-6 h-6 px-1 mr-1",
                "text-gray-300 cursor-move hover:text-editorDisabledGray",
                readOnly ? "pointer-events-none opacity-30" : ""
              )}
            />
          )}
          {!header && (
            <span className="text-gray-300 ml-0 mr-3">{row.id + 1}</span>
          )}
          {!header && !readOnly && (
            <button
              className={classNames(
                "w-4 h-4 border flex items-center justify-center group",
                value ? "border-editorSelected" : "border-editorDisabledGray",
                !header ? "mr-2" : "ml-4"
              )}
              ref={ref}
              disabled={disabled}
              onClick={(e) => onChange(!value, e.nativeEvent.shiftKey)}
            >
              <CheckIcon
                className={classNames(
                  "w-4 h-4",
                  value
                    ? "text-white bg-editorSelected"
                    : "text-transparent group-hover:text-editorDisabledGray"
                )}
              />
            </button>
          )}
          {!header && !readOnly && showRowSettings && (
            <>
              <button
                className="w-6 h-6 p-1 text-gray-300 hover:text-gray-500 ring-0 outline-none focus:outline-none"
                onClick={() => {
                  setInitTabIdx(0);
                  setRowSettingsOpen(true);
                }}
              >
                <Cog6ToothIcon className="w-full h-full" />
              </button>
              <Modal
                open={rowSettingsOpen}
                close={() => setRowSettingsOpen(false)}
                title="Row Settings"
              >
                <RowSettingsModal
                  rowIdx={row.id}
                  rule={rule}
                  sendAction={sendAction}
                  tabIdx={initTabIdx}
                  selectedRows={selectedRows}
                />
              </Modal>
            </>
          )}
        </div>
        <div className="inline-flex items-center">
          {!header &&
            (row.data.settings
              ? row.data.settings.schedule.length > 0
              : false) && (
              <ClockIcon
                title="Scheduled"
                className={`w-5 h-5 m-1.5 mr-0 p-px ${
                  withinSchedule(row.data.settings.schedule)
                    ? "text-lime-500"
                    : "text-red-400"
                }`}
              />
            )}
          {!header &&
            (row.data.settings
              ? row.data.settings.groupId != null ||
                row.data.settings.priority > 0
              : false) && (
              <div
                title="Grouped"
                style={{
                  backgroundColor: row.data.settings?.groupId
                    ? rule.groups[row.data.settings.groupId]?.color
                    : "#000000",
                }}
                onMouseOver={(_e) => {
                  // query all elements with the same group id in the class name
                  // add the "hover:ring-2 ring-sky-300" class to the elements
                  // remove the class on mouse out

                  document
                    ?.querySelectorAll(
                      `.group-${row.data.settings?.groupId?.replace(
                        /[^a-zA-Z0-9]/g,
                        ""
                      )}`
                    )
                    ?.forEach((element) => {
                      element.classList.add("ring-2");
                    });
                }}
                onMouseOut={(_e) => {
                  document
                    ?.querySelectorAll(
                      `.group-${row.data.settings?.groupId?.replace(
                        /[^a-zA-Z0-9]/g,
                        ""
                      )}`
                    )
                    ?.forEach((element) => {
                      element.classList.remove("ring-2");
                    });
                }}
                onClick={() => {
                  if (readOnly) return;
                  if (row.data.settings.groupId != null) {
                    setInitTabIdx(1);
                  } else {
                    setInitTabIdx(0);
                  }
                  setRowSettingsOpen(true);
                }}
                className={`min-w-[1rem] justify-center cursor-pointer hover:ring-2 ring-sky-300 inline-flex h-4 rounded-full m-1.5 mr-0 p-px text-center text-xs text-white items-center ${
                  row.data.settings?.groupId
                    ? `group-${row.data.settings?.groupId?.replace(
                        /[^a-zA-Z0-9]/g,
                        ""
                      )}`
                    : ""
                }`}
              >
                <span className="text-xs items-center px-0.5">
                  {elevatedPriority &&
                    (row.data.settings?.groupId
                      ? rule.groups[row.data.settings.groupId]?.priority
                      : row.data.settings.priority)}
                </span>
              </div>
            )}
        </div>
      </div>
    </div>
  );
}

function SelectFormatter(props) {
  const [isRowSelected, onRowSelectionChange] = useRowSelection();

  return (
    <SelectCellFormatter
      aria-label="Select"
      isCellSelected={props.isCellSelected}
      value={isRowSelected}
      onChange={(checked, isShiftClick) => {
        onRowSelectionChange({ row: props.row, checked, isShiftClick });
      }}
      row={props.row}
      rule={props.rule}
      sendAction={props.sendAction}
      selectedRows={props.selectedRows}
      readOnly={props.readOnly}
      showRowSettings={props.showRowSettings}
      embedMode={props.embedMode}
    />
  );
}

function SelectGroupFormatter(props) {
  const [isRowSelected, onRowSelectionChange] = useRowSelection();

  return (
    <SelectCellFormatter
      aria-label="Select Group"
      isCellSelected={props.isCellSelected}
      value={isRowSelected}
      onChange={(checked) => {
        onRowSelectionChange({ row: props.row, checked, isShiftClick: false });
      }}
      rule={props.rule}
      sendAction={props.sendAction}
      selectedRows={props.selectedRows}
    />
  );
}

export default function SelectColumn({
  rule,
  sendAction,
  selectedRows,
  readOnly = false,
  showRowSettings = false,
}) {
  return {
    key: "select-row",
    name: "",
    width,
    minWidth: width,
    maxWidth: width,
    resizable: false,
    sortable: false,
    frozen: true,
    headerRenderer(props) {
      return (
        <SelectCellFormatter
          aria-label="Select All"
          isCellSelected={props.isCellSelected}
          value={props.allRowsSelected}
          onChange={props.onAllRowsSelectionChange}
          header={true}
          rule={rule}
          sendAction={sendAction}
          selectedRows={selectedRows}
          readOnly={readOnly}
          showRowSettings={showRowSettings}
        />
      );
    },
    formatter(props) {
      return (
        <SelectFormatter
          {...props}
          rule={rule}
          sendAction={sendAction}
          selectedRows={selectedRows}
          readOnly={readOnly}
          showRowSettings={showRowSettings}
        />
      );
    },
    groupFormatter(props) {
      return (
        <SelectGroupFormatter
          {...props}
          rule={rule}
          sendAction={sendAction}
          selectedRows={selectedRows}
          readOnly={readOnly}
        />
      );
    },
  };
}
