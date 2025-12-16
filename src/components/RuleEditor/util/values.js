// This file contains functions to validate global values in a rule

import { processValue } from "../TypeEditor";

export function useGlobalValues(globalValues = []) {
  const isGlobalValue = (cellValue, type = "object") => {
    return processValue(type, cellValue)?.value?.$rb === "globalValue";
  };
  const getGlobalValue = (id) => {
    return globalValues.find((v) => v.id === id);
  };
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
