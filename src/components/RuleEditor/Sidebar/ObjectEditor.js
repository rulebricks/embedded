import { useState } from "react";

export default function ObjectEditor({ value, onChange, readOnly, schema }) {
  const [code, setCode] = useState(
    typeof value === "string" ? value : JSON.stringify(value || {}, null, 2)
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
