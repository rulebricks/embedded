/**
 * Gets the column schema for a given key.
 * @param {Array} schema - The schema array.
 * @param {string} key - The key to look for.
 * @returns {Object|null} The column schema object or null if not found.
 */
export function getColumnSchema(schema, key) {
  if (!schema || !Array.isArray(schema)) return null;
  return schema.find((col) => col.key === key) || null;
}

/**
 * Merges two schema arrays.
 * @param {Array} schema1 - The first schema array.
 * @param {Array} schema2 - The second schema array.
 * @returns {Array} The merged schema array.
 */
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

