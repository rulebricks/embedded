import { VariableIcon } from "@heroicons/react/20/solid";
import classNames from "classnames";
import json5 from "json5";
import { useEffect, useState } from "react";
import ReactSelect from "react-select";
import TypeEditor, { processValue, unprocessValue } from "../TypeEditor";
import TypeFormatter from "../TypeFormatter";
import { capitalize } from "../util/util";
import { useGlobalValues } from "../util/values";
import CellPopover from "./CellPopover";
import CellWrapper from "./CellWrapper";
import { useOperators } from "../../../context/OperatorsContext";

function EditPopover({
  referenceElement,
  type,
  accept,
  reject,
  initOp,
  initArgs,
  globalValues,
  requestSchema,
  isPinned,
}) {
  const { operators: types } = useOperators();
  const {
    isGlobalValue,
    getGlobalValue,
    filterGlobalValues,
    defaultGlobalValue,
  } = useGlobalValues(globalValues);

  const [selectedValue, setSelectedValue] = useState(initOp);
  const allOps = types[type]?.operators || {};
  const selectedOpDef = allOps[selectedValue] || { args: [] };
  const isListType = (argType) => argType === "list";

  const defaultTypes = {
    boolean: () => true,
    generic: () => null,
    number: () => 0,
    string: () => "",
    date: () => moment().format(),
    function: () => "",
    object: () => {},
    list: () => [],
    any: null,
  };

  const [args, setArgs] = useState(() => {
    const arr =
      initArgs || selectedOpDef.args.map((x) => defaultTypes[x.type]?.() ?? "");
    return arr.map((x, idx) => unprocessValue(selectedOpDef.args[idx].type, x));
  });

  const [selectValues, setSelectValues] = useState([]);

  const [isGlobalMode, setIsGlobalMode] = useState(() =>
    args.map((arg, idx) => {
      const argDef = selectedOpDef.args[idx];
      if (isListType(argDef.type)) {
        try {
          arg = json5.parse(arg);
        } catch (_e) {}
        return (
          (Array.isArray(arg) &&
            arg.length > 0 &&
            arg.every((item) => isGlobalValue(item, argDef.type))) ||
          (typeof arg === "object" && isGlobalValue(arg, argDef.type))
        );
      }
      if (
        argDef.type === "any" ||
        argDef.type === "generic" ||
        argDef.type === "object"
      ) {
        try {
          arg = json5.parse(arg);
        } catch (_e) {}
      }

      return isGlobalValue(arg, argDef.type);
    })
  );

  useEffect(() => {
    const newSelectValues = args.map((arg, idx) => {
      const argDef = selectedOpDef.args[idx];
      if (!argDef) return null;

      if (
        ["list", "generic", "any"].includes(argDef.type) &&
        typeof arg === "string"
      ) {
        try {
          arg = json5.parse(arg);
        } catch (_e) {}
      }

      // Handle array of global values
      if (
        Array.isArray(arg) &&
        arg.length > 0 &&
        arg.every((item) => isGlobalValue(item, argDef.type))
      ) {
        return arg.map((item) => ({
          label: getGlobalValue(item.id)?.name || "Unknown",
          value: item,
        }));
      }

      return getSelectValue(arg, argDef);
    });

    setSelectValues(newSelectValues);
  }, [args, selectedOpDef]);

  const processedArgs = args.map(
    (x, idx) => processValue(selectedOpDef.args[idx].type, x).value
  );

  const argsValid = processedArgs.map(
    (x, idx) =>
      x !== null &&
      (!selectedOpDef.args[idx].validate ||
        selectedOpDef.args[idx].validate(x) ||
        x?.$rb)
  );
  const allArgsValid = argsValid.reduce((x, acc) => x && acc, true);

  const groupValid =
    allArgsValid &&
    (!selectedOpDef.validate ||
      selectedOpDef.validate(processedArgs) ||
      processedArgs.some((x) => x?.$rb));

  const isGlobalValueWrapper = (arg, argType) => {
    if (typeof arg === "string" && ["list"].includes(argType)) {
      try {
        arg = json5.parse(arg);
      } catch (_e) {}
    }
    if (Array.isArray(arg)) {
      return (
        arg.length > 0 && arg.every((item) => isGlobalValue(item, argType))
      );
    }
    return isGlobalValue(arg, argType);
  };

  const getSelectValue = (arg, argDef) => {
    if (isListType(argDef.type)) {
      if (Array.isArray(arg)) {
        return arg.map((item) => ({
          label: isGlobalValue(item, argDef.type)
            ? getGlobalValue(item.id)?.name || "Unknown"
            : String(item),
          value: item,
        }));
      }
      if (isGlobalValue(arg, argDef.type)) {
        const globalValue = getGlobalValue(arg.id);
        return globalValue
          ? {
              label: globalValue.name,
              value: arg,
            }
          : null;
      }
    } else if (isGlobalValue(arg, argDef.type)) {
      const globalValue = getGlobalValue(arg.id);
      return globalValue
        ? {
            label: globalValue.name,
            value: arg,
          }
        : null;
    }
    return null;
  };

  const handleSelectChange = (v, idx, argDef) => {
    const newArgs = [...args];
    const isArgListType = isListType(argDef.type);
    let newSelectValue;

    if (isArgListType) {
      if (Array.isArray(v)) {
        if (v.length > 0) {
          // Check if any of the selected values is a global list
          const listTypeValue = v.find(
            (item) =>
              isGlobalValue(item.value, argDef.type) &&
              getGlobalValue(item.value.id)?.type === "list"
          );

          if (listTypeValue) {
            // If a list type is found, use only that value
            newArgs[idx] = listTypeValue.value;
            newSelectValue = listTypeValue;
          } else {
            // Otherwise, use all selected values
            newArgs[idx] = v.map((item) => item.value);
            newSelectValue = v;
          }
        } else {
          // Empty selection, maintain global mode if it was in global mode
          newArgs[idx] = isGlobalMode[idx] ? [] : [];
          newSelectValue = [];
        }
        setIsGlobalMode((prev) => {
          const newMode = [...prev];
          newMode[idx] = v.every((item) =>
            isGlobalValue(item.value, argDef.type)
          );
          return newMode;
        });
      } else if (v?.value && isGlobalValue(v.value, argDef.type)) {
        // Single global value selected
        const globalValue = getGlobalValue(v.value.id);
        if (globalValue?.type === "list") {
          newArgs[idx] = v.value;
          newSelectValue = v;
        } else {
          newArgs[idx] = [v.value];
          newSelectValue = [v];
        }
        setIsGlobalMode((prev) => {
          const newMode = [...prev];
          newMode[idx] = true;
          return newMode;
        });
      } else {
        // Single non-global value or empty selection
        newArgs[idx] = v ? [v.value] : isGlobalMode[idx] ? [] : [];
        newSelectValue = v ? [v] : [];
        setIsGlobalMode((prev) => {
          const newMode = [...prev];
          newMode[idx] = false;
          return newMode;
        });
      }
    } else {
      // Non-list type, always single select
      newArgs[idx] = v ? v.value : null;
      newSelectValue = v;
      setIsGlobalMode((prev) => {
        const newMode = [...prev];
        newMode[idx] = v ? isGlobalValue(v.value, argDef.type) : prev[idx];
        return newMode;
      });
    }

    setArgs(newArgs);

    // Update selectValues immediately
    const newSelectValues = [...selectValues];
    newSelectValues[idx] = newSelectValue;
    setSelectValues(newSelectValues);
  };

  return (
    <CellPopover
      referenceElement={referenceElement}
      valid={groupValid}
      accept={() =>
        accept({
          op: selectedValue,
          args: processedArgs,
        })
      }
      reject={reject}
      isPinned={isPinned}
    >
      <div
        className={`flex flex-col ${
          selectedOpDef.args && selectedOpDef.args.length > 0 ? "mb-1" : ""
        }`}
      >
        <ReactSelect
          classNames={{
            control: (_base) => "min-h-10 rounded-sm",
            singleValue: (_base) => "text-sm",
          }}
          styles={{
            menuList: (baseStyles) => ({
              ...baseStyles,
              maxHeight: "230px",
            }),
          }}
          autoFocus={selectedValue === "any"}
          defaultMenuIsOpen={selectedValue === "any"}
          className="leading-3 tf-operator mb-3"
          options={Object.keys(allOps).map((opName) => ({
            label: capitalize(opName),
            value: opName,
          }))}
          value={{
            label: capitalize(selectedValue),
            value: selectedValue,
          }}
          filterOption={(option, rawInput) => {
            const words = rawInput.toLowerCase().split(" ");
            return words.every((word) =>
              option.label.toLowerCase().includes(word)
            );
          }}
          onChange={(v) => {
            setSelectedValue(v.value);
            const newArgs = allOps[v.value].args.map((x) =>
              unprocessValue(x.type, defaultTypes[x.type]?.() ?? "")
            );
            setArgs(newArgs);
            setTimeout(() => {
              document?.querySelector(".tf-input")?.focus();
            }, 20);
          }}
        />
      </div>
      {selectedOpDef.args.length > 0 && (
        <div className="cell-popover-arguments bg-neutral-100 rounded-sm m-0 pt-3 px-3 mb-0.5 border pb-px">
          {selectedOpDef.args.map((argDef, idx) => {
            const isArgListType = isListType(argDef.type);
            const isGlobalList =
              isGlobalValueWrapper(args[idx], argDef.type) &&
              (Array.isArray(args[idx])
                ? args[idx].some(
                    (item) => getGlobalValue(item.id)?.type === "list"
                  )
                : getGlobalValue(args[idx]?.id)?.type === "list");
            const availableGlobalValues =
              argDef.type === "list"
                ? globalValues
                    .filter((gv) => gv.type !== "function")
                    .filter((v) =>
                      v.name.startsWith(requestSchema?.valuesPrefix || "")
                    )
                    .map((v) => ({
                      ...v,
                      name: v.name.replace(
                        requestSchema?.valuesPrefix || "",
                        ""
                      ),
                    }))
                : filterGlobalValues(
                    argDef.type,
                    requestSchema?.valuesPrefix || ""
                  );

            return (
              <div key={idx} className="mb-3 flex flex-col">
                <div className="flex flex-col">
                  <div className="text-sm text-gray-600 mb-px">
                    {argDef.name
                      ? argDef.name.charAt(0).toUpperCase() +
                        argDef.name.slice(1)
                      : "Argument"}
                  </div>
                  {argDef.desc && (
                    <div className="whitespace-pre-wrap text-xs text-gray-500 mb-1.5">
                      {argDef.desc}
                    </div>
                  )}
                </div>
                <div className="flex flex-col mt-1">
                  <div className="w-full inline-flex">
                    <div className="flex-grow items-center">
                      {!isGlobalMode[idx] && !requestSchema?.valuesOnly ? (
                        <TypeEditor
                          className="tf-input"
                          key={`${selectedOpDef.type}_${selectedValue}_${idx}`}
                          type={argDef.type}
                          valid={argsValid[idx] && groupValid}
                          value={args[idx]}
                          placeholder={argDef.placeholder || ""}
                          setValue={(v) => {
                            const newArgs = [...args];
                            newArgs[idx] = v;
                            setArgs(newArgs);
                          }}
                          globalValues={availableGlobalValues}
                        />
                      ) : (
                        <ReactSelect
                          key={isArgListType && !isGlobalList}
                          classNames={{
                            control: (_base) => "min-h-10 rounded-sm",
                          }}
                          styles={{
                            menuList: (baseStyles) => ({
                              ...baseStyles,
                              maxHeight: "230px",
                            }),
                            control: (baseStyles) => ({
                              ...baseStyles,
                              minWidth: "300px",
                            }),
                          }}
                          isMulti={
                            isArgListType &&
                            !isGlobalList &&
                            !(
                              typeof selectValues[idx]?.type !== "object" &&
                              globalValues.find(
                                (v) => v.id === selectValues[idx]?.value?.id
                              )?.type === "list"
                            )
                          }
                          formatOptionLabel={(optionData) => (
                            <div
                              className="flex items-center "
                              title={optionData.label}
                            >
                              <span className="text-xs truncate font-mono">
                                {requestSchema?.valuesPrefix
                                  ? optionData.label.replace(
                                      requestSchema?.valuesPrefix,
                                      ""
                                    )
                                  : optionData.label}
                              </span>
                            </div>
                          )}
                          className="leading-3 tf-operator w-full my-[0.16rem]"
                          options={
                            argDef.type === "list"
                              ? availableGlobalValues
                                  .filter((v) => {
                                    if (Array.isArray(selectValues[idx])) {
                                      return !selectValues[idx].some(
                                        (item) => item.value.id === v.id
                                      );
                                    }
                                    return true;
                                  })
                                  .map((v) => ({
                                    label: v.name,
                                    value: {
                                      $rb: "globalValue",
                                      id: v.id,
                                      name: v.name,
                                    },
                                  }))
                              : filterGlobalValues(
                                  argDef.type,
                                  requestSchema?.valuesPrefix || ""
                                ).map((v) => ({
                                  label: v.name,
                                  value: {
                                    $rb: "globalValue",
                                    id: v.id,
                                    name: v.name,
                                  },
                                }))
                          }
                          closeMenuOnSelect={!(isArgListType && !isGlobalList)}
                          value={selectValues[idx]}
                          onChange={(v) => handleSelectChange(v, idx, argDef)}
                        />
                      )}
                    </div>
                    {availableGlobalValues.length > 0 &&
                      !requestSchema?.valuesOnly && (
                        <button
                          className={classNames(
                            "text-xs text-neutral-500 hover:shadow-md aspect-square p-2 h-full focus:outline-none border rounded-sm self-center ml-2",
                            isGlobalMode[idx]
                              ? "bg-orange-100 text-orange-900 hover:bg-orange-200 border border-orange-600"
                              : "bg-white hover:bg-neutral-100 border border-neutral-200 hover:border-neutral-300"
                          )}
                          onClick={(e) => {
                            e.stopPropagation();
                            const newArgs = [...args];
                            const newIsGlobalMode = [...isGlobalMode];
                            if (isGlobalMode[idx]) {
                              newArgs[idx] = unprocessValue(
                                argDef.type,
                                defaultTypes[argDef.type]?.() ?? ""
                              );
                              newIsGlobalMode[idx] = false;
                            } else {
                              newArgs[idx] = defaultGlobalValue(argDef.type);
                              newIsGlobalMode[idx] = true;
                            }
                            setArgs(newArgs);
                            setIsGlobalMode(newIsGlobalMode);
                          }}
                        >
                          <VariableIcon className="inline-block w-5 h-5" />
                        </button>
                      )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </CellPopover>
  );
}

export default function RequestCell({
  type,
  cellData,
  rowSettings,
  updateCellData,
  selected,
  deactivated,
  showTest,
  testState,
  globalValues,
  requestSchema,
  readOnly = false,
  isPinned,
}) {
  const { operators: types } = useOperators();
  const displayedOp = cellData ? cellData.op : "any";
  const displayedArgs = cellData ? cellData.args : [];
  const opDef = types[type]?.operators?.[displayedOp];

  return (
    <CellWrapper
      selected={selected}
      className={classNames(
        "transition-all duration-100",
        showTest &&
          (testState?.result || displayedOp === "any") &&
          "bg-green-400 bg-opacity-20",
        deactivated && "opacity-30 pointer-events-none",
        showTest && testState && !testState.result && "bg-red-200",
        rowSettings?.or && "border-r-4 border-orange-300 border-dashed",
        readOnly && "opacity-95 duration-1000 pointer-events-none"
      )}
    >
      {({ referenceElement, editing, setEditing, showPopover }) => (
        <>
          <div
            className={classNames(
              "flex transition-all origin-left duration-150 gap-2",
              editing && "scale-[.96]"
            )}
          >
            <button
              className={classNames(
                "px-1.5 outline-none focus:outline-none duration-0",
                displayedOp === "any"
                  ? "text-neutral-300 group-hover:text-neutral-800"
                  : "text-editorGray font-medium hover:shadow-none hover:bg-white shadow-sm h-8 my-auto border border-black border-opacity-10 rounded-sm",
                "text-sm font-medium"
              )}
              onClick={() => setEditing(true)}
            >
              {capitalize(displayedOp)}
            </button>
            {displayedArgs.map((x, idx) => (
              <div className="inline-flex items-center text-center" key={idx}>
                {opDef && (
                  <>
                    <TypeFormatter type={opDef.args[idx].type} key={idx}>
                      {x}
                    </TypeFormatter>
                    {displayedArgs.length > 1 &&
                      idx < displayedArgs.length - 1 && (
                        <span className="text-neutral-900 text-opacity-30 ml-2">
                          {" "}
                          and{" "}
                        </span>
                      )}
                  </>
                )}
              </div>
            ))}
          </div>
          {showPopover && (
            <EditPopover
              // type is the only prop that requires the state to be recreated
              // so use it as a key
              key={type}
              referenceElement={referenceElement}
              type={type}
              accept={(value) => {
                updateCellData(value);
                setEditing(false);
              }}
              reject={() => setEditing(false)}
              initOp={displayedOp}
              initArgs={displayedArgs}
              globalValues={globalValues}
              requestSchema={requestSchema}
              isPinned={isPinned}
            />
          )}
        </>
      )}
    </CellWrapper>
  );
}
