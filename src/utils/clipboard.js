import json5 from "json5";

/**
 * Parse clipboard data to detect if it's from an external source
 * and extract column data
 */
export function parseExternalClipboardData(clipboardText) {
  if (!clipboardText) return null;

  // Strip a single trailing newline (clipboard text typically ends with one)
  // so we do not introduce a spurious final blank row, but preserve any
  // interior blank rows so callers can treat them as "any".
  const text = clipboardText.replace(/\r?\n$/, "");
  const rows = text.split(/\r?\n/);

  if (rows.length === 0) return null;

  // Parse each row - assuming tab-separated values from Excel.
  // Single-column paste: take the first cell of each row.
  const parsedRows = rows.map((row) => {
    const cells = row.split("\t");
    return cells[0] ?? "";
  });

  return parsedRows;
}

/**
 * Check if the clipboard data is from an external source
 * by checking for the presence of internal metadata
 */
export function isExternalPaste(event) {
  // Check if the paste event has our internal format marker
  const internalData = event.clipboardData?.getData(
    "application/x-rule-editor"
  );

  // If we have internal data marker, it's an internal paste
  if (internalData) {
    return false;
  }

  // Otherwise, it's an external paste
  return true;
}

/**
 * Convert external data value to match the target column type
 */
export function convertValueForType(value, targetType) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  switch (targetType) {
    case "number": {
      // Handle currency values like $1,234.56
      const cleanedValue = value
        .toString()
        .replace(/[$,]/g, "")
        .replace(/\s+/g, "");
      const numValue = parseFloat(cleanedValue);
      return isNaN(numValue) ? null : numValue;
    }

    case "boolean": {
      const lowerValue = value.toString().toLowerCase().trim();
      if (["true", "1", "yes", "y"].includes(lowerValue)) return true;
      if (["false", "0", "no", "n"].includes(lowerValue)) return false;
      return null;
    }

    case "date":
      // Dates are treated as strings
      return value.toString();

    case "string":
      return value.toString();

    case "list":
      // For lists, we'll handle this specially in the paste handler
      return value;

    case "function":
      // Functions are treated as strings
      return value.toString();

    case "object":
    case "generic":
    case "any":
      // Try to parse as JSON, otherwise treat as string
      try {
        return json5.parse(value);
      } catch (_e) {
        return value.toString();
      }

    default:
      return value.toString();
  }
}

/**
 * Validate if a value can be pasted into a column of specific type
 */
export function canPasteValueIntoType(value, targetType) {
  const converted = convertValueForType(value, targetType);

  if (converted === null && value !== null && value !== "") {
    // Conversion failed
    return false;
  }

  return true;
}

/**
 * Handle pasting external data into request columns
 * @param {Array} values - Values to paste
 * @param {string} column - Column key
 * @param {number} startRow - Starting row index
 * @param {Array} conditions - Current conditions
 * @param {Array} requestSchema - Request schema
 * @param {Object} operators - Operators from OperatorsContext
 */
export function prepareRequestCellPasteData(
  values,
  column,
  startRow,
  conditions,
  requestSchema,
  operators = {}
) {
  const updates = [];
  const columnSchema = requestSchema.find((s) => s.key === column);
  if (!columnSchema) return updates;

  // Get the operator and arguments from the starting cell
  const startCellData = conditions[startRow]?.request?.[column];
  if (!startCellData) return updates;

  // Boolean columns have only zero-arg operators ("is true", "is false", etc.),
  // so pasted values must map to an operator rather than flow through args.
  if (columnSchema.type === "boolean") {
    values.forEach((value, index) => {
      const rowIdx = startRow + index;
      if (rowIdx >= conditions.length) return; // Don't create new rows

      const isBlank =
        value === null || value === undefined || value.toString().trim() === "";
      if (isBlank) {
        updates.push({
          rowIdx,
          column,
          section: "request",
          data: { op: "any", args: [] },
        });
        return;
      }

      const converted = convertValueForType(value, "boolean");
      if (converted === true) {
        updates.push({
          rowIdx,
          column,
          section: "request",
          data: { op: "is true", args: [] },
        });
      } else if (converted === false) {
        updates.push({
          rowIdx,
          column,
          section: "request",
          data: { op: "is false", args: [] },
        });
      }
    });
    return updates;
  }

  const operator = startCellData.op;
  const operatorDef = operators[columnSchema.type]?.operators?.[operator];

  if (!operatorDef || !operatorDef.args || operatorDef.args.length !== 1) {
    // Only handle single-argument operators
    return updates;
  }

  const argType = operatorDef.args[0].type;

  // Process each value for pasting
  values.forEach((value, index) => {
    const rowIdx = startRow + index;
    if (rowIdx >= conditions.length) return; // Don't create new rows

    // Blank cells in the pasted column should clear the cell to "any"
    // rather than being silently dropped (which would collapse values upward).
    const isBlank =
      value === null || value === undefined || value.toString().trim() === "";
    if (isBlank) {
      updates.push({
        rowIdx,
        column,
        section: "request",
        data: {
          op: "any",
          args: [],
        },
      });
      return;
    }

    const convertedValue = convertValueForType(value, argType);
    if (convertedValue !== null) {
      // Don't use processValue here - just pass the raw converted value
      // The request cell expects raw values in the args array
      updates.push({
        rowIdx,
        column,
        section: "request",
        data: {
          op: operator,
          args: [convertedValue],
        },
      });
    }
  });

  return updates;
}

/**
 * Handle pasting external data into response columns
 */
export function prepareResponseCellPasteData(
  values,
  column,
  startRow,
  conditions,
  responseSchema
) {
  const updates = [];
  const columnSchema = responseSchema.find((s) => s.key === column);
  if (!columnSchema) return updates;

  const columnType = columnSchema.type;

  // Handle list type specially
  if (columnType === "list") {
    // For list columns, paste all values into the single selected cell
    const listValues = values
      .map((v) => convertValueForType(v, "string"))
      .filter((v) => v !== null);

    if (listValues.length > 0) {
      updates.push({
        rowIdx: startRow,
        column,
        section: "response",
        data: {
          value: listValues,
        },
      });
    }
    return updates;
  }

  // Process each value for pasting into separate rows
  values.forEach((value, index) => {
    const rowIdx = startRow + index;
    if (rowIdx >= conditions.length) return; // Don't create new rows

    // Blank cells in the pasted column should clear the response cell
    // rather than being silently dropped (which would collapse values upward).
    const isBlank =
      value === null || value === undefined || value.toString().trim() === "";
    if (isBlank) {
      updates.push({
        rowIdx,
        column,
        section: "response",
        data: {
          value: null,
        },
      });
      return;
    }

    const convertedValue = convertValueForType(value, columnType);
    if (convertedValue !== null) {
      // For response columns, the value should be stored directly
      // without processValue wrapper since response cells expect raw values
      updates.push({
        rowIdx,
        column,
        section: "response",
        data: {
          value: convertedValue,
        },
      });
    }
  });

  return updates;
}

/**
 * Apply batch updates from external paste
 */
export function applyExternalPasteUpdates(
  updates,
  conditions,
  updateRule,
  user,
  rule,
  pushToUndoStack
) {
  if (updates.length === 0) return;

  // Push current state to undo stack before making changes
  if (pushToUndoStack && rule) {
    pushToUndoStack({
      conditions: rule.conditions,
      requestSchema: rule.requestSchema,
      responseSchema: rule.responseSchema,
      sampleRequest: rule.sampleRequest,
      sampleResponse: rule.sampleResponse,
      groups: rule.groups,
    });
  }

  // Clone conditions for updating
  const newConditions = structuredClone(conditions);

  // Apply all updates
  updates.forEach((update) => {
    const { rowIdx, column, section, data } = update;
    if (newConditions[rowIdx]) {
      newConditions[rowIdx][section][column] = data;
    }
  });

  // Send the batch update
  updateRule.mutate({
    conditions: newConditions,
    updatedAt: new Date().toISOString(),
    updatedBy: user?.name || user?.email || "Embedded User",
  });
}

/**
 * Mark the clipboard data as internal when copying within the grid
 */
export function markInternalCopy(event) {
  // Add a marker to indicate this is an internal copy
  event.clipboardData?.setData("application/x-rule-editor", "internal");
}
