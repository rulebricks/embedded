import classNames from "classnames";
import json5 from "json5";
import moment from "moment-timezone";
import * as ReactDatetime from "react-datetime";
import Select from "react-select";

const Datetime = ReactDatetime.default || ReactDatetime;
import CodeEditor from "./Sidebar/CodeEditor";
import JsonEditor, {
  tryParseJSON,
  tryParseJSONArray,
  tryParsePrimitive,
} from "./Sidebar/JsonEditor";
import ObjectEditor from "./Sidebar/ObjectEditor";

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
  if (typeof value === "number") {
    if (value.toString().length <= 10) {
      value = moment.unix(value).toISOString();
    } else {
      value = moment(value).toISOString();
    }
  }
  // set dateformat to accomodate 2025-04-25T00:00:00-07:00
  return (
    <Datetime
      dateFormat={"YYYY-MM-DD"}
      timeFormat={"HH:mm:ss.000 z"}
      value={moment(value).utc()}
      displayTimeZone={moment.tz.guess()}
      onChange={(newValue) => setValue(moment(newValue).utc())}
      className={`${
        disabled && "pointer-events-none text-gray-400 bg-gray-100"
      } rounded-sm date-input`}
    />
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
