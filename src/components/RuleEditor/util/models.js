/**
 * Models utility for embed package
 */

export function getColumnSchema(schema, key) {
  if (!schema || !Array.isArray(schema)) return null;
  return schema.find((col) => col.key === key) || null;
}

export function mergeSchemas(schema1, schema2) {
  if (!schema1 && !schema2) return [];
  if (!schema1) return schema2;
  if (!schema2) return schema1;
  
  const merged = [...schema1];
  schema2.forEach((col) => {
    if (!merged.find((c) => c.key === col.key)) {
      merged.push(col);
    }
  });
  return merged;
}

/**
 * Determines the type of a value for the JSON editor
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

