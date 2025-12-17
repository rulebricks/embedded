import { RadioGroup } from "@headlessui/react";
import { Cog6ToothIcon, MinusCircleIcon } from "@heroicons/react/20/solid";
import {
  IconArrowDown,
  IconCheck,
  IconCircleDashedX,
} from "@tabler/icons-react";
import classNames from "classnames";
import { useEffect, useState } from "react";
import CodeEditor from "../Inputs/CodeEditor";
import Toggle from "../../ui/Toggle";

import { typedStrategyOptions } from "../../../constants/strategies";

const tabs = ["Row Activation", "Group Activation"];
const daysOfWeek = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];
const aggregationStrategyOptions = [
  /*
  {
    name: "List Aggregate",
    value: "list",
    description:
      "Collects all of the group’s satisfied response objects in a list. Note that by making your rule potentially return a list, using this strategy may break certain features in Rulebricks, like rule forms & flows.",
    example: "{ result: 1 } + { result: 2 } = [ { result: 1 }, { result: 2 } ]",
  },
  */
  {
    name: "Fill Values",
    value: "object",
    description:
      "Collects and updates non-null properties of the group’s satisfied response objects into a single response object.",
    example:
      "{ status: “success”, error: null } + { status: null, error: false } = { status: “success”, error: false }",
  },
  {
    name: "Add Values",
    value: "value",
    description:
      'Similar to the "Fill Values" strategy, but also adds values within the group’s satisfied responses together wherever possible.',
    example: `Text: Appends text, “A” + “B” = “AB”
Numbers: Adds numbers, 1 + 2 = 3
Lists: Appends lists: [1,2] + [5,6] = [1,2,5,6]
Booleans: Executes OR: true + false = true
Dates: Does nothing, returns the first value found`,
  },
  {
    name: "Compute Values",
    value: "custom",
    description:
      "(Advanced) Allows you to define a custom accumulation function for each property in the group’s satisfied response objects.",
  },
];

export function RowSettingsModal({
  rowIdx,
  rule,
  sendAction,
  tabIdx = 0,
  selectedRows = [],
}) {
  const [tab, setTab] = useState(tabs[tabIdx]);
  const [conditionSettings, setConditionSettings] = useState(
    rule.conditions[rowIdx].settings
      ? rule.conditions[rowIdx].settings
      : {
          enabled: true,
          schedule: [],
          priority: 0,
          groupId: null,
        }
  );
  const [groupSettings, setGroupSettings] = useState(
    conditionSettings?.groupId
      ? rule.groups[conditionSettings.groupId]
      : {
          strategy: aggregationStrategyOptions[0].value,
          priority: 0,
        }
  );
  // if there is more than one row selected, check if all selected rows have the same group ID
  let sameGroupId = false;
  if (selectedRows.size > 1) {
    sameGroupId = Array.from(selectedRows).every(
      (rowIdx) =>
        rule.conditions[rowIdx].settings?.groupId ===
        rule.conditions[selectedRows.values().next().value].settings?.groupId
    );
  }

  const [selectedAggregationStrategy, setSelectedAggregationStrategy] =
    useState(groupSettings?.strategy || aggregationStrategyOptions[0].value);

  let existingCustomStrategy = {};
  let existingCode = null;

  // separate the custom strategy object into two objects, one for the strategy and one for the code
  if (groupSettings?.custom) {
    existingCustomStrategy = Object.keys(groupSettings.custom).reduce(
      (acc, key) => {
        const keyStrategy = groupSettings.custom[key].strategy;
        if (rule.responseSchema.find((col) => col.key === key)) {
          if (
            Object.keys(
              typedStrategyOptions[
                rule.responseSchema.find((col) => col.key === key).type
              ]
            ).includes(keyStrategy)
          ) {
            acc[key] = keyStrategy;
          } else {
            acc[key] =
              typedStrategyOptions[
                rule.responseSchema.find((col) => col.key === key).type
              ][0];
          }
        } else {
          acc[key] = keyStrategy;
        }
        return acc;
      },
      {}
    );
    existingCode = Object.keys(groupSettings.custom).reduce((acc, key) => {
      acc[key] = groupSettings.custom[key].code;
      return acc;
    }, {});
  }

  const [customStrategy, setCustomStrategy] = useState(
    existingCustomStrategy || {}
  );

  const [customStrategyCode, setCustomStrategyCode] = useState(
    existingCode || {}
  );

  useEffect(() => {
    const mergedCustomStrategy = {};
    if (
      customStrategy &&
      customStrategyCode &&
      Object.keys(customStrategy).length > 0
    ) {
      Object.keys(customStrategy).forEach((key) => {
        mergedCustomStrategy[key] = {
          strategy: customStrategy[key],
          code: customStrategyCode[key],
        };
      });

      if (groupSettings.strategy === "custom") {
        setGroupSettings({
          ...groupSettings,
          custom: mergedCustomStrategy,
        });
      }
    }
  }, [customStrategy, customStrategyCode]);

  // TODO: check that this always works
  useEffect(() => {
    // send action to update condition and groups
    if (conditionSettings?.groupId) {
      // if the group settings is custom, update the object with the custom strategy
      // merge the customStrategy and customStrategyCode objects to include the code for each function strategy
      sendAction("updateGroupSettings", {
        groupId: conditionSettings.groupId,
        groupSettings,
      });
    }
  }, [groupSettings]);

  useEffect(() => {
    if (selectedRows?.size > 1) {
      sendAction("bulkUpdateConditionSettings", {
        rowIdxs: selectedRows,
        conditionSettings,
      });
    } else {
      sendAction("updateConditionSettings", { rowIdx, conditionSettings });
    }
  }, [conditionSettings]);

  return (
    <div className="p-6 pb-0 pt-4 w-full text-left align-middle bg-white rounded-md shadow-xl flex flex-col ">
      <div className="flex flex-col justify-start py-2">
        <h3 className="text-2xl font-semibold leading-6 text-neutral-900">
          {tab === "Group Activation"
            ? "Group-Level Settings"
            : "Row-Level Settings"}
        </h3>
        <div className="flex mt-2 text-md items-center">
          <div className="flex-1">
            <p className="text-neutral-500">
              {tab === "Group Activation"
                ? "Configure behaviors unique to this row's group in your rule."
                : "Configure behaviors unique to this specific row of conditions & results in your rule."}
            </p>
          </div>
        </div>
      </div>
      <div className="mt-3">
        <div className="sm:hidden">
          <label htmlFor="current-tab" className="sr-only">
            Select a tab
          </label>
          <select
            id="current-tab"
            name="current-tab"
            className="block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
            defaultValue={tab}
            onChange={(e) => setTab(e.target.value)}
          >
            {tabs.map((tab) => (
              <option key={tab}>{tab}</option>
            ))}
          </select>
        </div>
        <div className="hidden sm:block">
          <nav className="-mb-px flex space-x-6 border-b -mx-6 px-6">
            {tabs.map((tabHeading) => (
              <button
                key={tabHeading}
                onClick={() => setTab(tabHeading)}
                className={classNames(
                  tabHeading === tab
                    ? "border-[var(--primary-color)] text-black"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300",
                  (conditionSettings?.groupId === null ||
                    !groupSettings ||
                    (selectedRows.size > 1 && !sameGroupId)) &&
                    tabHeading === "Group Activation"
                    ? "opacity-40 pointer-events-none"
                    : "",
                  "whitespace-nowrap pb-3 px-1 border-b-4 font-medium flex flex-row align-middle items-center text-md"
                )}
                aria-current={tabHeading ? "page" : undefined}
              >
                {conditionSettings?.groupId !== null &&
                  tabHeading === "Group Activation" && (
                    <div
                      title="Grouped"
                      style={{
                        backgroundColor: conditionSettings.groupId
                          ? rule.groups[conditionSettings.groupId]?.color
                          : "#000000",
                      }}
                      className={
                        "justify-center border-2 translate-y-px border-black/40 self-center inline-flex h-3 w-3 rounded-full mr-2.5 text-center text-xs text-white items-center"
                      }
                    />
                  )}
                {tabHeading === "Row Activation" && (
                  <Cog6ToothIcon
                    className={`w-3.5 h-3.5 mr-2.5 self-center text-black ${
                      tab === "Row Activation" ? "text-black" : "text-gray-500"
                    }`}
                  />
                )}
                {tabHeading}
              </button>
            ))}
          </nav>
        </div>
      </div>
      <div className="mt-4 sm:mt-0 h-[35rem] -mx-6 p-6 pb-0 overflow-y-auto border-t">
        {tab === "Row Activation" && (
          <div className="flex flex-col space-y-6 mb-4">
            <div>
              <div className="inline-flex justify-between w-full">
                <label className="block">
                  <span className="text-black font-medium text-md">
                    "OR" Row
                  </span>
                  <div className="mt-0.5 max-w-sm pr-2 w-full">
                    <h3 className="text-xs text-left text-neutral-900">
                      When enabled, this row will be satisfied if ANY of the
                      comparisons in it are satisfied, rather than ALL (default
                      behavior).
                    </h3>
                  </div>
                </label>
                <Toggle
                  checked={conditionSettings.or}
                  onChange={() =>
                    setConditionSettings({
                      ...conditionSettings,
                      or: !conditionSettings.or,
                    })
                  }
                />
              </div>
            </div>
            <div>
              <div className="inline-flex justify-between w-full">
                <label className="block">
                  <span className="text-black font-medium text-md">
                    Activate/Deactivate Row
                  </span>
                  <div className="mt-0.5 max-w-sm pr-2 w-full">
                    <h3 className="text-xs text-left text-neutral-900">
                      You can keep this row present in your rule, but deactivate
                      it to ignore the conditions in this row when the rule is
                      executed.
                    </h3>
                  </div>
                </label>
                <Toggle
                  checked={conditionSettings.enabled}
                  onChange={() =>
                    setConditionSettings({
                      ...conditionSettings,
                      enabled: !conditionSettings.enabled,
                    })
                  }
                />
              </div>
            </div>
            <div
              className={
                !conditionSettings.enabled
                  ? "opacity-30 pointer-events-none"
                  : ""
              }
            >
              <span className="text-black font-medium text-md">
                Scheduled Activation
              </span>
              <div className="my-0.5 mb-4 max-w-sm pr-2 w-full">
                <h3 className="text-xs text-left text-neutral-900">
                  Only activate this row of conditions on specific days between
                  specific times. Selecting any day below will deactivate this
                  row for every unselected day– unselect all rows to keep this
                  row active all the time.
                </h3>
              </div>
              <div className="bg-neutral-50 rounded-sm p-4 pt-1 border overflow-y-auto h-36">
                {daysOfWeek.map((day, dayIdx) => {
                  return (
                    <div
                      key={dayIdx}
                      className="flex flex-row justify-between items-center space-y-1 text-sm"
                    >
                      <div className="flex flex-row items-center mt-1">
                        <input
                          type="checkbox"
                          className="rounded-sm cursor-pointer"
                          checked={
                            !!conditionSettings.schedule.find(
                              (d) => d.day === day
                            )
                          }
                          onChange={(_e) => {
                            if (
                              conditionSettings.schedule.find(
                                (d) => d.day === day
                              )
                            ) {
                              setConditionSettings({
                                ...conditionSettings,
                                schedule: conditionSettings.schedule.filter(
                                  (d) => d.day !== day
                                ),
                              });
                            } else {
                              setConditionSettings({
                                ...conditionSettings,
                                schedule: [
                                  ...conditionSettings.schedule,
                                  { day: day, from: "00:00", to: "23:59" },
                                ],
                              });
                            }
                          }}
                        />
                        <span className="mx-2">{day}</span>
                      </div>
                      <div
                        className={`flex flex-row items-center text-neutral-400 ${
                          conditionSettings.schedule.find((d) => d.day === day)
                            ? ""
                            : "opacity-30 pointer-events-none"
                        }`}
                      >
                        <span className="mr-2">between</span>
                        <input
                          type="time"
                          value={
                            conditionSettings.schedule.find(
                              (d) => d.day === day
                            )?.from || "00:00"
                          }
                          onChange={(e) => {
                            setConditionSettings({
                              ...conditionSettings,
                              schedule: conditionSettings.schedule.map((d) => {
                                if (d.day === day) {
                                  return { ...d, from: e.target.value };
                                }
                                return d;
                              }),
                            });
                          }}
                          className="h-8 rounded-sm mr-2 border-neutral-400"
                        />
                        <span className="mr-2">and</span>
                        <input
                          type="time"
                          value={
                            conditionSettings.schedule.find(
                              (d) => d.day === day
                            )?.to || "23:59"
                          }
                          onChange={(e) => {
                            setConditionSettings({
                              ...conditionSettings,
                              schedule: conditionSettings.schedule.map((d) => {
                                if (d.day === day) {
                                  return { ...d, to: e.target.value };
                                }
                                return d;
                              }),
                            });
                          }}
                          className="h-8 rounded-sm border-neutral-400"
                        />
                        <span className="mx-2">GMT</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div
              className={`inline-flex justify-between w-full ${
                conditionSettings?.groupId === null || !groupSettings
                  ? ""
                  : "opacity-40 pointer-events-none"
              }`}
            >
              <label className="block">
                <span className="text-black font-medium text-md">
                  Row Priority
                  {conditionSettings?.groupId !== null &&
                    " (Disabled, uses group priority)"}
                </span>
                <div className="my-0.5 mb-4 max-w-sm pr-2 w-full">
                  <h3 className="text-xs text-left text-neutral-900">
                    If multiple rows/groups are satisfied, Rulebricks will only
                    return the result of the highest priority row or group. This
                    value is ignored if the row is in a group, and group
                    priority is used instead.
                  </h3>
                </div>
              </label>
              <input
                type="number"
                name="rowPriority"
                id="rowPriority"
                className="block w-24 h-10 px-3 py-2 border border-neutral-300 rounded-sm placeholder-neutral-500 focus:outline-none focus:ring-neutral-500 focus:border-neutral-500 sm:text-sm"
                placeholder=""
                defaultValue={conditionSettings.priority || 0}
                onChange={(e) => {
                  if (e.target.value === "" || Number.isNaN(e.target.value)) {
                    setConditionSettings({
                      ...conditionSettings,
                      priority: 0,
                    });
                  } else {
                    setConditionSettings({
                      ...conditionSettings,
                      priority: Number.parseInt(e.target.value),
                    });
                  }
                }}
              />
            </div>
          </div>
        )}
        {tab === "Group Activation" && (
          <div className="flex flex-col space-y-6">
            <div className="flex flex-col justify-start py-0">
              <div className="flex mt-0 text-sm items-center">
                <div className="flex-1">
                  <p className="text-neutral-500">
                    Groups allow you to combine values from <b>multiple</b>{" "}
                    satisfied rows in your decision table in different ways,
                    depending on a hit policy.{" "}
                    <i>
                      Changes to these settings always affect the entire group
                      that this row currently belongs to.
                    </i>
                  </p>
                </div>
              </div>
            </div>
            <div>
              <div>
                <span className="text-black font-medium text-md">
                  Hit Policy
                </span>
                <div className="my-0.5 mb-4 max-w-3xl pr-2 w-full">
                  <h3 className="text-xs text-left text-neutral-900">
                    The response objects for all satisfied rows in the first
                    matching group in your rule will be combined together in
                    order of their appearance in the decision table according to
                    the strategy you select below.
                  </h3>
                </div>
                <RadioGroup
                  value={selectedAggregationStrategy}
                  onChange={(v) => {
                    setSelectedAggregationStrategy(v);
                    setGroupSettings({
                      ...groupSettings,
                      strategy: v,
                    });
                  }}
                >
                  <RadioGroup.Label className="sr-only">
                    Hit Policy
                  </RadioGroup.Label>
                  <div className="-space-y-px rounded-md bg-white">
                    {aggregationStrategyOptions.map((ags, agsIdx) => (
                      <RadioGroup.Option
                        key={ags.name}
                        value={ags.value}
                        className={({ checked }) =>
                          classNames(
                            agsIdx === 0 ? "rounded-t-md" : "",
                            agsIdx === aggregationStrategyOptions.length - 1
                              ? "rounded-b-md"
                              : "",
                            checked
                              ? "z-10 border-green-200 bg-green-50"
                              : "border-neutral-200 hover:bg-neutral-100",
                            "relative flex cursor-pointer border p-4 select-none focus:outline-none"
                          )
                        }
                      >
                        {({ checked }) => (
                          <>
                            <div className="w-full justify-between flex flex-col">
                              <span className="ml-1 flex flex-col">
                                <RadioGroup.Label
                                  as="span"
                                  className={classNames(
                                    checked
                                      ? "text-green-900"
                                      : "text-neutral-900",
                                    "inline-flex items-center align-middle text-sm font-medium"
                                  )}
                                >
                                  {ags.name}
                                  {checked && (
                                    <IconCheck className="w-4 h-4 ml-2 self-center" />
                                  )}
                                </RadioGroup.Label>
                                <RadioGroup.Description
                                  as="span"
                                  className={classNames(
                                    checked
                                      ? "text-green-700"
                                      : "text-neutral-500",
                                    "block text-xs mt-0.5 max-w-full"
                                  )}
                                >
                                  {ags.description}
                                </RadioGroup.Description>
                              </span>
                              {ags.value === "object" && (
                                <div className="flex flex-col space-y-2 bg-neutral-900 bg-opacity-5 border mt-3">
                                  <table
                                    className={`w-full table border-separate rounded-t-md divide-y ${
                                      selectedAggregationStrategy === "object"
                                        ? ""
                                        : "saturate-0"
                                    }`}
                                  >
                                    <thead>
                                      <tr className="divide-x">
                                        <th className="text-left font-normal text-xs text-neutral-800 p-2">
                                          Status
                                        </th>
                                        <th className="text-left font-normal text-xs text-neutral-800 p-2">
                                          Error
                                        </th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                      <tr className="divide-x">
                                        <td className="text-left font-mono text-xs bg-green-50 text-green-800 p-2">
                                          "success"
                                        </td>
                                        <td className="text-left font-mono bg-red-100 text-xs text-red-800 p-2">
                                          null
                                        </td>
                                      </tr>
                                      <tr className="divide-x">
                                        <td className="text-left font-mono bg-red-100 text-xs text-red-800 p-2">
                                          null
                                        </td>
                                        <td className="text-left bg-green-50 font-mono text-xs text-green-800 p-2">
                                          false
                                        </td>
                                      </tr>
                                    </tbody>
                                  </table>
                                  <IconArrowDown className="w-6 h-6 mx-auto text-neutral-400" />
                                  <table
                                    className={`w-full table border-separate rounded-b-md divide-y mt-3 ${
                                      selectedAggregationStrategy === "object"
                                        ? ""
                                        : "saturate-0"
                                    }`}
                                  >
                                    <tbody className="divide-y">
                                      <tr className="divide-x">
                                        <td className="text-left font-mono text-xs text-green-800 p-2 bg-green-50">
                                          "success"
                                        </td>
                                        <td className="text-left font-mono text-xs text-green-800 p-2 bg-green-50">
                                          false
                                        </td>
                                      </tr>
                                    </tbody>
                                  </table>
                                </div>
                              )}
                              {ags.value === "value" && (
                                <div
                                  className={`border bg-neutral-900 bg-opacity-5 opacity-80 mt-3 px-0 pt-0.5 pb-2.5 mx-1 divide-y space-y-2 ${
                                    selectedAggregationStrategy === "value"
                                      ? ""
                                      : "saturate-0"
                                  }`}
                                >
                                  <div className="flex flex-row space-x-2 w-full justify-between pt-2 px-3 align-middle items-center">
                                    <div className="flex flex-col">
                                      <span className="text-xs text-neutral-800">
                                        Text
                                      </span>
                                      <span className="text-xs text-neutral-400">
                                        Appends text
                                      </span>
                                    </div>
                                    <pre>
                                      <code className="text-xs text-green-800 bg-green-50 p-1 px-2 rounded-sm">
                                        "A" + "B" → "AB"
                                      </code>
                                    </pre>
                                  </div>
                                  <div className="flex flex-row space-x-2 w-full justify-between pt-2 px-3 items-center">
                                    <div className="flex flex-col">
                                      <span className="text-xs text-neutral-800">
                                        Numbers
                                      </span>
                                      <span className="text-xs text-neutral-400">
                                        Adds numbers
                                      </span>
                                    </div>
                                    <pre>
                                      <code className="text-xs text-green-800 bg-green-50 p-1 px-2 rounded-sm">
                                        1 + 2 → 3
                                      </code>
                                    </pre>
                                  </div>
                                  <div className="flex flex-row space-x-2 w-full justify-between pt-2 px-3 items-center">
                                    <div className="flex flex-col">
                                      <span className="text-xs text-neutral-800">
                                        Lists
                                      </span>
                                      <span className="text-xs text-neutral-400">
                                        Appends lists
                                      </span>
                                    </div>
                                    <pre>
                                      <code className="text-xs text-green-800 bg-green-50 p-1 px-2 rounded-sm">
                                        [1,2] + [5,6] → [1,2,5,6]
                                      </code>
                                    </pre>
                                  </div>
                                  <div className="flex flex-row space-x-2 w-full justify-between pt-2 px-3 items-center">
                                    <div className="flex flex-col">
                                      <span className="text-xs text-neutral-800">
                                        Booleans
                                      </span>
                                      <span className="text-xs text-neutral-400">
                                        Executes OR
                                      </span>
                                    </div>
                                    <pre>
                                      <code className="text-xs text-green-800 bg-green-50 p-1 px-2 rounded-sm">
                                        true + false → true
                                      </code>
                                    </pre>
                                  </div>
                                  <div className="flex flex-row space-x-2 w-full justify-between pt-2 px-3 items-center">
                                    <div className="flex flex-col">
                                      <span className="text-xs text-neutral-800">
                                        Dates
                                      </span>
                                      <span className="text-xs text-neutral-400">
                                        Does nothing
                                      </span>
                                    </div>
                                    <pre>
                                      <code className="text-xs text-green-800 bg-green-50 p-1 px-2 rounded-sm">
                                        2022-01-01 + 2022-01-02 → 2022-01-01
                                      </code>
                                    </pre>
                                  </div>
                                </div>
                              )}
                              {ags.value === "custom" && (
                                <div
                                  className={`border bg-neutral-900 bg-opacity-5 opacity-80 mt-3 px-0 pt-0.5 pb-2.5 mx-1 divide-y space-y-2 ${
                                    checked ? "" : "saturate-0"
                                  }`}
                                >
                                  {rule.responseSchema.map((col, _colIdx) => {
                                    return (
                                      <div
                                        key={col.key}
                                        className="flex flex-row items-center space-x-2 w-full justify-between pt-2 px-3"
                                      >
                                        <div className="flex flex-col">
                                          <span className="text-xs text-neutral-800">
                                            {col.name}
                                          </span>
                                          <span className="text-xs text-neutral-400">
                                            {col.type}
                                          </span>
                                        </div>
                                        {
                                          <div className="flex flex-col space-y-2">
                                            <select
                                              className="w-full max-w-xs text-xs rounded-sm border-neutral-400"
                                              defaultValue={
                                                customStrategy[col.key] ||
                                                Object.keys(
                                                  typedStrategyOptions[col.type]
                                                )[0]
                                              }
                                              onChange={(e) => {
                                                setCustomStrategy({
                                                  ...customStrategy,
                                                  [col.key]: e.target.value,
                                                });
                                                setCustomStrategyCode({
                                                  ...customStrategyCode,
                                                  [col.key]:
                                                    typedStrategyOptions[
                                                      col.type
                                                    ][e.target.value].value,
                                                });
                                              }}
                                            >
                                              {Object.keys(
                                                typedStrategyOptions[col.type]
                                              ).map((opt) => (
                                                <option key={opt}>{opt}</option>
                                              ))}
                                            </select>
                                            {customStrategy[col.key] &&
                                              ![
                                                "Do Nothing",
                                                "Custom",
                                              ].includes(
                                                customStrategy[col.key]
                                              ) && (
                                                <pre>
                                                  <code className="text-xs text-green-800 bg-green-50 p-1 px-2 rounded-sm">
                                                    {customStrategy[col.key] &&
                                                      typedStrategyOptions[
                                                        col.type
                                                      ][customStrategy[col.key]]
                                                        .example}
                                                  </code>
                                                </pre>
                                              )}
                                            {customStrategy[col.key] ===
                                              "Custom" && (
                                              <div
                                                onKeyDown={(e) =>
                                                  (e.key === " " ||
                                                    e.code === "Space" ||
                                                    e.keyCode === 32) &&
                                                  e.stopPropagation()
                                                }
                                                className="w-full max-w-3xl"
                                              >
                                                <CodeEditor
                                                  value={
                                                    customStrategyCode[
                                                      col.key
                                                    ] ||
                                                    "(a, b) => {\n\treturn a\n}"
                                                  }
                                                  placeholder={
                                                    "(a, b) => {\n\treturn a\n}"
                                                  }
                                                  setValue={(v) => {
                                                    setCustomStrategyCode({
                                                      ...customStrategyCode,
                                                      [col.key]: v,
                                                    });
                                                  }}
                                                  maxWidth=" w-[20rem]"
                                                />
                                              </div>
                                            )}
                                          </div>
                                        }
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </>
                        )}
                      </RadioGroup.Option>
                    ))}
                  </div>
                </RadioGroup>
              </div>
            </div>
            <div className="inline-flex justify-between w-full">
              <label className="block">
                <span className="text-black font-medium text-md">
                  Group Priority
                </span>
                <div className="my-0.5 mb-4 max-w-sm pr-2 w-full">
                  <h3 className="text-xs text-left text-neutral-900">
                    If multiple rows/groups are satisfied, Rulebricks will only
                    return the result of the highest priority row or group
                    (Default: 0).
                  </h3>
                </div>
              </label>
              <input
                type="number"
                name="groupPriority"
                id="groupPriority"
                className="block w-24 h-10 px-3 py-2 border border-neutral-300 rounded-sm placeholder-neutral-500 focus:outline-none focus:ring-neutral-500 focus:border-neutral-500 sm:text-sm"
                placeholder=""
                defaultValue={groupSettings.priority || 0}
                onChange={(e) => {
                  if (e.target.value === "" || Number.isNaN(e.target.value)) {
                    setGroupSettings({
                      ...groupSettings,
                      priority: 0,
                    });
                  } else {
                    setGroupSettings({
                      ...groupSettings,
                      priority: Number.parseInt(e.target.value),
                    });
                  }
                }}
              />
            </div>
            <div className="space-x-4 border-t py-8 pb-4 sticky bottom-0 z-50 bg-white">
              <button
                onClick={() => {
                  setTab("Row Activation");
                  setConditionSettings({
                    ...conditionSettings,
                    groupId: null,
                  });
                }}
                className="-mt-4 inline-flex items-center bg-amber-600/20 hover:bg-amber-600/50 text-amber-800 font-medium py-2 pl-3 pr-4 rounded"
              >
                <MinusCircleIcon className="h-5 w-5 mr-2" aria-hidden="true" />
                Ungroup Row
              </button>
              <button
                onClick={() => {
                  setTab("Row Activation");
                  sendAction("ungroupAllRowsInGroup", {
                    groupId: conditionSettings?.groupId,
                  });
                  setConditionSettings({
                    ...conditionSettings,
                    groupId: null,
                  });
                }}
                className="-mt-4 inline-flex items-center bg-red-600/20 hover:bg-red-600/50 text-red-800 font-medium py-2 pl-3 pr-4 rounded"
              >
                <IconCircleDashedX
                  className="h-5 w-5 mr-2"
                  aria-hidden="true"
                />
                Delete Group (Preserves Rows)
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
