import classNames from "classnames";
import json5 from "json5";
import moment from "moment-timezone";
import * as ReactDatetime from "react-datetime";
import Select from "react-select";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
const Datetime = ReactDatetime.default || ReactDatetime;
import CodeEditor from "./Inputs/CodeEditor";
import JsonEditor, {
  tryParseJSON,
  tryParseJSONArray,
  tryParsePrimitive,
} from "./Inputs/JsonEditor";
import ObjectEditor from "./Inputs/ObjectEditor";

export function StringEditor({
  value,
  setValue,
  placeholder,
  disabled,
  valid,
  name,
  className,
}) {
  return (
    <input
      type="text"
      name={name}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      className={classNames(
        "p-2 w-full text-sm border rounded-sm focus:ring-0",
        valid ? " border-neutral-300" : " border-red-300 focus:border-red-300",
        disabled && "bg-gray-100 text-gray-400",
        className
      )}
      placeholder={placeholder}
      disabled={disabled}
    />
  );
}

export function NumberEditor({
  value,
  setValue,
  placeholder,
  valid,
  disabled,
  className,
}) {
  return (
    <input
      type="number"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      className={classNames(
        "p-2 w-full text-sm border rounded-sm focus:ring-0",
        valid ? " border-neutral-300" : " border-red-300 focus:border-red-300",
        disabled && "bg-gray-100 text-gray-400",
        className
      )}
      placeholder={placeholder}
      disabled={disabled}
    />
  );
}

export function BooleanEditor({ value, setValue, disabled, target }) {
  return (
    <Select
      className="text-sm rounded-sm font-sans"
      menuPortalTarget={target}
      classNames={{
        control: (_base) => "min-h-10 rounded-sm",
      }}
      options={[
        { value: true, label: "True" },
        { value: false, label: "False" },
      ]}
      isDisabled={disabled}
      value={
        value
          ? { value: true, label: "True" }
          : { value: false, label: "False" }
      }
      onChange={(v) => setValue(v.value)}
    />
  );
}

export function DateEditor({ value, setValue, disabled }) {
  const containerRef = useRef(null);
  const portalRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });

  // Memoize the moment conversion to prevent new objects on every render
  const momentValue = useMemo(() => {
    if (typeof value === "number") {
      if (value.toString().length <= 10) {
        return moment.unix(value).utc();
      } else {
        return moment(value).utc();
      }
    }
    return moment(value).utc();
  }, [value]);

  const openPicker = useCallback(() => {
    if (disabled) return;
    const input = containerRef.current?.querySelector("input");
    if (!input) return;
    const rect = input.getBoundingClientRect();
    setPosition({ top: rect.bottom, left: rect.left, width: rect.width });
    setIsOpen(true);
  }, [disabled]);

  const closePicker = useCallback(() => {
    setIsOpen(false);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e) => {
      if (
        containerRef.current?.contains(e.target) ||
        portalRef.current?.contains(e.target)
      )
        return;
      setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Render the calendar in a fixed-position portal so it is not clipped by
  // the cell popover. Portal into the embed container (like ui/Modal) so
  // Tailwind scoping and branding CSS variables still apply.
  const portalTarget =
    typeof document !== "undefined"
      ? document.querySelector('[data-embed-container="true"]') ||
        document.body
      : null;

  return (
    <div ref={containerRef} className="flex flex-col gap-1">
      <Datetime
        dateFormat={"YYYY-MM-DD"}
        timeFormat={"HH:mm:ss.000 z"}
        value={momentValue}
        displayTimeZone={moment.tz.guess()}
        onChange={(newValue) => setValue(moment(newValue).utc())}
        open={false}
        inputProps={{
          onFocus: openPicker,
          onClick: openPicker,
        }}
        className={`${
          disabled && "pointer-events-none text-gray-400 bg-gray-100"
        } rounded-sm date-input max-w-xs`}
      />
      {isOpen &&
        portalTarget &&
        createPortal(
          <div
            ref={portalRef}
            className="rulebricks-embed"
            style={{
              position: "fixed",
              top: position.top,
              left: position.left,
              width: position.width,
              zIndex: 9999,
            }}
          >
            <div
              className="date-input font-sans"
              style={{ lineHeight: 2.6 }}
            >
              <Datetime
                dateFormat={"YYYY-MM-DD"}
                timeFormat={"HH:mm:ss.000 z"}
                value={momentValue}
                displayTimeZone={moment.tz.guess()}
                onChange={(newValue) => {
                  setValue(moment(newValue).utc());
                }}
                onClose={closePicker}
                input={false}
                open={true}
              />
            </div>
          </div>,
          portalTarget
        )}
      <button
        type="button"
        onClick={() => setValue(moment().startOf("day"))}
        disabled={disabled}
        className="text-xs max-w-xs w-full duration-75 transition-all bg-neutral-200 hover:bg-neutral-100 border py-2 text-neutral-900 hover:text-sky-600 disabled:text-gray-400 text-center"
      >
        Current Date
      </button>
    </div>
  );
}

export function FunctionEditor({
  value,
  setValue,
  placeholder,
  disabled,
  sampleRequest,
  globalValues,
  sampleResponse,
  maxWidth = "max-w-sm",
}) {
  return (
    <CodeEditor
      value={value}
      setValue={setValue}
      placeholder={placeholder}
      className={disabled && "opacity-50 pointer-events-none"}
      disabled={disabled}
      request={sampleRequest}
      response={sampleResponse}
      globalValues={globalValues}
      maxWidth={maxWidth}
    />
  );
}

const Editors = {
  string: StringEditor,
  boolean: BooleanEditor,
  number: NumberEditor,
  json: JsonEditor,
  list: JsonEditor,
  generic: JsonEditor,
  date: DateEditor,
  function: FunctionEditor,
  object: ObjectEditor,
};

// NOTE this function should be used on the result of any type editor before submitting
export function processValue(type, value) {
  try {
    if (typeof value === "object" && value?.$rb) {
      // this is a rulebricks object (global value, function, etc.)
      // just return it
      return { value, error: null };
    }
    const { value: rbValue, error: rbError } = tryParseJSON(value);
    if (rbValue?.$rb && !rbError) {
      return { value: rbValue, error: rbError };
    }
  } catch (_e) {}

  // because the number editor returns a string
  // and it does that because it's irritating to process
  // decimals otherwise
  if (type === "number" && value !== "" && !Number.isNaN(Number(value))) {
    // TODO this accepts Infinity as a string literal!!
    const result = Number(value);
    return { value: result, error: null };
  }
  if (type === "list") {
    return tryParseJSONArray(value);
  }
  if (type === "json") {
    return tryParseJSON(value);
  }
  if (type === "object") {
    return tryParseJSON(value);
  }
  if (type === "generic") {
    return tryParsePrimitive(value);
  }
  if (type === "date") {
    // date editor returns a moment.js object
    // convert to ISO 8601 string in UTC format
    if (typeof value === "number") {
      // Check if it's seconds (10 digits) or milliseconds (13 digits)
      const isSeconds = value.toString().length <= 10;
      return isSeconds
        ? {
            value: moment
              .unix(value)
              .utc()
              .format("YYYY-MM-DDTHH:mm:ss.SSS[Z]"),
            error: null,
          }
        : {
            value: moment(value).utc().format("YYYY-MM-DDTHH:mm:ss.SSS[Z]"),
            error: null,
          };
    }
    if (!moment.isMoment(value)) {
      return { value: null, error: "not a date" };
    }
    return {
      value: value.utc().format("YYYY-MM-DDTHH:mm:ss.SSS[Z]"),
      error: null,
    };
  }
  // Check if the value type matches the expected type
  const valueType = typeof value;
  if (valueType === type) {
    return { value, error: null };
  }
  if (type === "function") {
    return { value, error: null };
  }

  return { value: null, error: "could not parse" };
}

export function unprocessValue(type, value) {
  if (type === "list") {
    return json5.stringify(value, null, 2);
  }
  if (type === "generic") {
    return json5.stringify(value, null, 2);
  }
  if (type === "date") {
    // convert to moment.js object
    if (typeof value === "string") {
      return moment(value);
    }
    if (typeof value === "number") {
      // Check if it's seconds (10 digits) or milliseconds (13 digits)
      const isSeconds = value.toString().length <= 10;
      return isSeconds ? moment.unix(value) : moment(value);
    }

    // Handle other cases
    return moment(value);
  }
  if (type === "function") {
    return value?.toString();
  }
  if (type === "string" && (value === undefined || value === null)) {
    return "";
  }
  return value;
}

export default function TypeEditor({
  type,
  value,
  setValue,
  valid,
  disabled,
  placeholder,
  className,
  sampleRequest,
  sampleResponse,
  globalValues,
  maxWidth = "max-w-sm",
  showSimpleModeToggle = false,
  enableFunctions = false,
}) {
  const Editor = Editors[type];
  return (
    <Editor
      value={value}
      setValue={setValue}
      valid={!!valid}
      disabled={!!disabled}
      readOnly={!!disabled}
      placeholder={placeholder}
      className={className}
      sampleRequest={sampleRequest}
      sampleResponse={sampleResponse}
      globalValues={globalValues}
      maxWidth={maxWidth}
      showSimpleModeToggle={showSimpleModeToggle}
      enableFunctions={enableFunctions}
    />
  );
}
