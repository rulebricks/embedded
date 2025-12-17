/**
 * Splits a column key into section and column parts.
 * @param {string} columnKey - The column key (e.g., "request.amount").
 * @returns {{section: string, column: string}|null} An object with section and column, or null if invalid.
 */
export function splitKey(columnKey) {
  if (columnKey.startsWith("request.")) {
    return {
      section: "request",
      column: columnKey.split("request.").splice(1).join(""),
    };
  }
  if (columnKey.startsWith("response.")) {
    return {
      section: "response",
      column: columnKey.split("response.").splice(1).join(""),
    };
  }
  return null;
}

