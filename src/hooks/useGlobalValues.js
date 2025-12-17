import { processValue } from "../components/RuleEditor/TypeEditor";

/**
 * Hook to manage and validate global values.
 * @param {Array} globalValues - Array of global value objects.
 * @returns {Object} Object containing helper functions for global values.
 */
export function useGlobalValues(globalValues = []) {
  /**
   * Checks if a value is a global value.
   * @param {*} cellValue - The value to check.
   * @param {string} type - The type of the value.
   * @returns {boolean} True if it is a global value.
   */
  const isGlobalValue = (cellValue, type = "object") => {
    return processValue(type, cellValue)?.value?.$rb === "globalValue";
  };

  /**
   * Gets a global value by ID.
   * @param {string} id - The ID of the global value.
   * @returns {Object|undefined} The global value object.
   */
  const getGlobalValue = (id) => {
    return globalValues.find((v) => v.id === id);
  };

  /**
   * Filters global values by type and prefix.
   * @param {string} type - The type to filter by.
   * @param {string} prefix - The name prefix to filter by.
   * @returns {Array} Filtered array of global values.
   */
  const filterGlobalValues = (type, prefix = "") => {
    const rangedGlobalValues = globalValues
      .filter((v) => v.name.startsWith(prefix || ""))
      .map((v) => ({
        ...v,
        name: v.name.replace(prefix, ""),
      }));
    if (!type || type === "any" || type === "generic")
      return rangedGlobalValues.filter((v) => v.type !== "function");
    return rangedGlobalValues.filter((v) => v.type === type);
  };

  /**
   * Gets a default global value for a type.
   * @param {string} type - The type.
   * @param {string} col - The column section ('request' or 'response').
   * @param {boolean} _listMode - List mode flag (unused).
   * @returns {Object|null} The default global value or null.
   */
  const defaultGlobalValue = (type, col = "request", _listMode = false) => {
    let defaultValue = filterGlobalValues(type === "list" ? "any" : type)[0];
    if (col === "response") {
      defaultValue = filterGlobalValues(type)[0];
    }
    return defaultValue
      ? {
          $rb: "globalValue",
          id: defaultValue.id,
          name: defaultValue.name,
        }
      : null;
  };
  return {
    isGlobalValue,
    getGlobalValue,
    filterGlobalValues,
    defaultGlobalValue,
  };
}
