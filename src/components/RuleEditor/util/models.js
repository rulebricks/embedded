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

