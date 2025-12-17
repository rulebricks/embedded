import { VariableIcon } from "@heroicons/react/20/solid";
import classNames from "classnames";
import { js_beautify } from "js-beautify";
import json5 from "json5";
import { useCallback, useEffect, useMemo, useState } from "react";
import ReactSelect from "react-select";
import Toggle from "../../ui/Toggle";
import TypeEditor, { processValue, unprocessValue } from "../TypeEditor";
import TypeFormatter from "../TypeFormatter";
import { useGlobalValues } from "../../../hooks/useGlobalValues";
import CellPopover from "./CellPopover";
import CellWrapper from "./CellWrapper";
import { useOperators } from "../../../context/OperatorsContext";

export function EditPopover({
  referenceElement,
  type,
  initValue,
  accept,
  reject,
  globalValues,
  sampleRequest,
  sampleResponse,
  responseSchema,
}) {
  const { operators: types } = useOperators();
  const {
    isGlobalValue,
    getGlobalValue,
    filterGlobalValues,
    defaultGlobalValue,
  } = useGlobalValues(globalValues);
  const isListType = type === "list";
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

  const availableGlobalValues = isListType
    ? globalValues
        .filter((gv) => gv.type !== "function")
        .filter((v) => v.name.startsWith(responseSchema?.valuesPrefix || ""))
        .map((v) => ({
          ...v,
          name: v.name.replace(responseSchema?.valuesPrefix || "", ""),
        }))
    : filterGlobalValues(type, responseSchema?.valuesPrefix || "");

  // Parse and prepare the initial value
  const prepareInitialValue = () => {
    if (initValue === null) return defaultTypes[type]?.() ?? "";
    // Handle array of values specially
    if (Array.isArray(initValue) && isListType) {
      // Check if all items are global values
      return initValue;
    }
    return initValue;
  };

  const [value, setValue] = useState(
    unprocessValue(type, prepareInitialValue())
  );
  const [isNull, setIsNull] = useState(initValue === null);
  const [selectValue, setSelectValue] = useState(null);

  // Initialize isGlobalMode based on whether the value is a global value or array of global values
  const isInitialGlobalMode = () => {
    if (initValue === null) return false;
    if (Array.isArray(initValue) && isListType) {
      return (
        initValue.length > 0 &&
        initValue.every((item) => isGlobalValue(item, type))
      );
    }
    return isGlobalValue(initValue, type);
  };

  const [isGlobalMode, setIsGlobalMode] = useState(isInitialGlobalMode());

  // Determine if the value is a global list (a single global value that represents a list)
  const isGlobalList = useMemo(() => {
    if (!isListType) return false;
    if (isGlobalValue(value, type)) {
      // Single global value - check if it's a list type
      return getGlobalValue(value?.id)?.type === "list";
    }
    return false;
  }, [isListType, value, isGlobalValue, getGlobalValue, type]);

  // Parse complex values that might be in string format
  const parseComplexValue = (val, valType) => {
    if (
      typeof val === "string" &&
      ["list", "generic", "any", "object"].includes(valType)
    ) {
      try {
        return json5.parse(val);
      } catch (_e) {
        return val;
      }
    }
    return val;
  };

  // Returns the appropriate select format for a value
  const getSelectValue = useCallback(
    (val) => {
      if (isListType) {
        // Parse the value if needed
        if (typeof val === "string") {
          try {
            val = json5.parse(val);
          } catch (_e) {
            // Continue with original value if parsing fails
          }
        }

        // Handle array of values
        if (Array.isArray(val)) {
          return val.map((item) => ({
            label: isGlobalValue(item, type)
              ? getGlobalValue(item.id)?.name || "Unknown"
              : String(item),
            value: item,
          }));
        }
        // Handle single global value that might be a list
        if (isGlobalValue(val, type)) {
          const globalValue = getGlobalValue(val.id);
          return globalValue
            ? {
                label: globalValue.name,
                value: val,
              }
            : null;
        }
      }
      // Handle non-list global value
      else if (isGlobalValue(val, type)) {
        const globalValue = getGlobalValue(val.id);
        return globalValue
          ? {
              label: globalValue.name,
              value: val,
            }
          : null;
      }
      return null;
    },
    [isListType, isGlobalValue, getGlobalValue, type]
  );

  // Initialize selectValue - simpler approach
  useEffect(() => {
    // Initialize selectValue only once on mount, not when value changes
    const initialSelectValue = getSelectValue(value);
    setSelectValue(initialSelectValue);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const processedValue = isNull ? null : processValue(type, value).value;
  const valid = isNull || processedValue !== null;

  useEffect(() => {
    setIsNull(false);
  }, []);

  const handleSelectChange = (v) => {
    if (isListType) {
      if (Array.isArray(v)) {
        if (v.length > 0) {
          // Check if any of the selected values is a global list
          const listTypeValue = v.find(
            (item) =>
              isGlobalValue(item.value, type) &&
              getGlobalValue(item.value.id)?.type === "list"
          );

          if (listTypeValue) {
            // If a list type is found, use only that value
            setValue(listTypeValue.value);
            setSelectValue(listTypeValue);
            setIsGlobalMode(true);
          } else {
            // Otherwise, use all selected values
            const processedValues = v.map((item) =>
              parseComplexValue(item.value, type)
            );
            setValue(processedValues);
            setSelectValue(v);
            // Set isGlobalMode true if all values are global values
            setIsGlobalMode(v.every((item) => isGlobalValue(item.value, type)));
          }
        } else {
          // Empty selection
          setValue(
            isGlobalValue(value, type) ? [] : defaultTypes[type]?.() ?? ""
          );
          setSelectValue([]);
          // Keep global mode unchanged on empty selection
        }
      } else if (v?.value && isGlobalValue(v.value, type)) {
        // Single global value selected
        const globalValue = getGlobalValue(v.value.id);
        if (globalValue?.type === "list") {
          // Use the global list directly
          setValue(parseComplexValue(v.value, type));
          setSelectValue(v);
          setIsGlobalMode(true);
        } else {
          // Create a list with one global value
          setValue([parseComplexValue(v.value, type)]);
          setSelectValue([v]);
          setIsGlobalMode(true);
        }
      } else {
        // Single non-global value or empty selection
        setValue(
          v ? [parseComplexValue(v.value, type)] : defaultTypes[type]?.() ?? ""
        );
        setSelectValue(v ? [v] : null);
        setIsGlobalMode(false);
      }
    } else {
      // Non-list type, always single select
      setValue(
        v ? parseComplexValue(v.value, type) : defaultTypes[type]?.() ?? ""
      );
      setSelectValue(v);
      // Set global mode based on whether value is a global value
      setIsGlobalMode(v && isGlobalValue(v.value, type));
    }
  };

  return (
    <CellPopover
      referenceElement={referenceElement}
      valid={valid}
      accept={() => accept({ value: processedValue })}
      reject={reject}
    >
      <div className="flex flex-col min-w-[20rem]">
        <div
          className="w-full inline-flex"
          onClick={() => {
            if (isNull) {
              setIsNull(false);
            }
          }}
        >
          <div className="flex-grow items-center">
            {!isGlobalMode && !responseSchema?.valuesOnly ? (
              <TypeEditor
                type={type}
                value={value}
                disabled={isNull}
                setValue={(v) => {
                  if (isNull) {
                    setIsNull(false);
                  }
                  setValue(v);
                }}
                valid={valid}
                sampleRequest={sampleRequest}
                sampleResponse={sampleResponse}
                globalValues={availableGlobalValues}
              />
            ) : (
              <ReactSelect
                classNames={{
                  control: () => "min-h-10 rounded-sm",
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
                autoFocus={true}
                isMulti={
                  isListType &&
                  !isGlobalList &&
                  !(
                    selectValue &&
                    !Array.isArray(selectValue) &&
                    getGlobalValue(selectValue?.value?.id)?.type === "list"
                  )
                }
                closeMenuOnSelect={
                  !(
                    isListType &&
                    !isGlobalList &&
                    !(
                      selectValue &&
                      !Array.isArray(selectValue) &&
                      getGlobalValue(selectValue?.value?.id)?.type === "list"
                    )
                  )
                }
                formatOptionLabel={(optionData) => (
                  <div className="flex items-center " title={optionData.label}>
                    <span className="text-xs truncate font-mono">
                      {responseSchema?.valuesPrefix
                        ? optionData.label.replace(
                            responseSchema?.valuesPrefix,
                            ""
                          )
                        : optionData.label}
                    </span>
                  </div>
                )}
                className={`leading-3 tf-operator w-full my-[0.16rem] ${
                  isNull ? "opacity-50 pointer-events-none" : ""
                }`}
                options={availableGlobalValues.map((v) => ({
                  label: v.name,
                  value: {
                    $rb: "globalValue",
                    id: v.id,
                    name: v.name,
                  },
                }))}
                value={selectValue}
                onChange={handleSelectChange}
              />
            )}
          </div>
          {availableGlobalValues.length > 0 &&
            type !== "function" &&
            !responseSchema?.valuesOnly && (
              <button
                className={`text-xs text-neutral-500 hover:shadow-md aspect-square p-2 h-full focus:outline-none border rounded-sm self-center ml-2 ${
                  isGlobalMode
                    ? "bg-orange-100 text-orange-900 hover:bg-orange-200 border border-orange-600"
                    : "bg-white hover:bg-neutral-100 border border-neutral-100 hover:border-neutral-200"
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (isGlobalMode) {
                    // Switch to manual mode
                    setValue(
                      unprocessValue(type, defaultTypes[type]?.() ?? "")
                    );
                    setSelectValue(null);
                    setIsGlobalMode(false);
                  } else {
                    // Switch to global mode
                    const defaultValue = defaultGlobalValue(type, "response");
                    if (defaultValue) {
                      setValue(defaultValue);
                      setSelectValue({
                        label:
                          getGlobalValue(defaultValue.id)?.name || "Unknown",
                        value: defaultValue,
                      });
                      setIsGlobalMode(true);
                    }
                  }
                }}
              >
                <VariableIcon className="inline-block w-5 h-5" />
              </button>
            )}
        </div>
        <div className="flex px-1 border-t mt-3 pt-2 items-center">
          <div
            className={classNames(
              "flex-1 font-mono",
              isNull ? "text-black" : "text-neutral-400"
            )}
          >
            null
          </div>
          <Toggle checked={isNull} onChange={setIsNull} />
        </div>
      </div>
    </CellPopover>
  );
}

export default function ResponseCell({
  type,
  selected,
  deactivated,
  cellData,
  updateCellData,
  showTest,
  testSuccess,
  globalValues,
  responseSchema,
  sampleRequest,
  sampleResponse,
  readOnly,
}) {
  const cellValue = cellData ? cellData.value : null;

  return (
    <CellWrapper
      selected={selected}
      className={classNames(
        "transition-all duration-300",
        showTest && testSuccess && "bg-amber-100",
        deactivated && "opacity-30 pointer-events-none",
        readOnly && "opacity-95 pointer-events-none"
      )}
    >
      {({ referenceElement, setEditing, showPopover }) => (
        <>
          <TypeFormatter type={type}>{cellValue}</TypeFormatter>
          {showPopover && (
            <EditPopover
              key={type}
              referenceElement={referenceElement}
              type={type}
              accept={(data) => {
                if (type === "function") {
                  data.value = js_beautify(data.value, { indent_size: 2 });
                }
                updateCellData(data);
                setEditing(false);
              }}
              reject={() => setEditing(false)}
              initValue={cellValue}
              globalValues={globalValues}
              responseSchema={responseSchema}
              sampleRequest={sampleRequest}
              sampleResponse={sampleResponse}
            />
          )}
        </>
      )}
    </CellWrapper>
  );
}
