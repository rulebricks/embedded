import { useState } from "react";

export default function CodeEditor({ value, onChange, language, readOnly }) {
  const [code, setCode] = useState(value || "");

  const handleChange = (e) => {
    const newValue = e.target.value;
    setCode(newValue);
    onChange?.(newValue);
  };

  return (
    <textarea
      value={code}
      onChange={handleChange}
      disabled={readOnly}
      className="w-full h-48 p-2 font-mono text-sm bg-gray-50 border border-gray-200 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
      placeholder="Enter code..."
    />
  );
}
