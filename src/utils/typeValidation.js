/**
 * Determines the type of a value for the JSON editor.
 * @param {*} value - The value to check.
 * @returns {string} The type string ("string", "list", "date", "object", "number", "boolean").
 */
export function getValueType(value) {
  if (value === null || value === undefined) return "string";
  if (Array.isArray(value)) return "list";
  if (value instanceof Date) return "date";
  const type = typeof value;
  if (type === "object") return "object";
  if (type === "number") return "number";
  if (type === "boolean") return "boolean";
  return "string";
}

