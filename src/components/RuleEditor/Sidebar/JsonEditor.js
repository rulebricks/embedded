import { useState } from "react";
import json5 from "json5";

export function tryParseJSON(v) {
  let value;
  let error;
  try {
    const parsed = json5.parse(v);
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      Array.isArray(parsed)
    ) {
      value = null;
      error = "Value is not a JSON object.";
    } else {
      value = parsed;
      error = null;
    }
  } catch (e) {
    value = null;
    error = e.message;
  }
  return { value, error };
}

export function tryParseJSONArray(v) {
  let value;
  let error;
  try {
    const parsed = typeof v !== "object" ? json5.parse(v) : v;
    if (!Array.isArray(parsed)) {
      value = null;
      error = "Value is not a list.";
    } else {
      value = parsed;
      error = null;
    }
  } catch (e) {
    value = null;
    error = e.message;
  }
  return { value, error };
}

export function tryParsePrimitive(v) {
  let value;
  let error;
  try {
    const parsed = json5.parse(v);
    if (typeof parsed !== "object" || parsed === null) {
      value = parsed;
      error = null;
    } else {
      value = null;
      error = "Value is not a primitive.";
    }
  } catch (e) {
    value = null;
    error = e.message;
  }
  return { value, error };
}

export default function JsonEditor({ value, onChange, readOnly }) {
  const [code, setCode] = useState(
    typeof value === "string" ? value : JSON.stringify(value, null, 2)
  );

  const handleChange = (e) => {
    const newValue = e.target.value;
    setCode(newValue);
    try {
      const parsed = JSON.parse(newValue);
      onChange?.(parsed);
    } catch {
      // Invalid JSON, just update the text
    }
  };

  return (
    <textarea
      value={code}
      onChange={handleChange}
      disabled={readOnly}
      className="w-full h-32 p-2 font-mono text-sm bg-gray-50 border border-gray-200 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
      placeholder="{}"
    />
  );
}
