import { nanoid } from "nanoid";
import randomColorLib from "random-color";
import { processValue } from "./TypeEditor";
import { getColumnSchema, mergeSchemas } from "./util/models";
import { setPath } from "./util/util";

const randomColor = () => randomColorLib().hexString();
const structuredClone = (obj) => JSON.parse(JSON.stringify(obj));

function safeUpdatedBy(user) {
  return user?.name || user?.email || "Embedded User";
}

const ruleUndoStack = [];
let ruleRedoStack = [];

function pushToRuleUndoStack(data) {
  if (ruleUndoStack.length > 0) {
    const lastEdit = ruleUndoStack[ruleUndoStack.length - 1];
    let isDifferent = false;
    for (const key in data) {
      if (JSON.stringify(data[key]) !== JSON.stringify(lastEdit[key])) {
        isDifferent = true;
        break;
      }
    }
    if (!isDifferent) return;
  }
  if (ruleRedoStack.length > 0) ruleRedoStack = [];
  if (ruleUndoStack.length > 50) ruleUndoStack.shift();
  ruleUndoStack.push({ ...data });
  ruleRedoStack = [];
}

function isUndoAvailable() {
  return ruleUndoStack.length > 0;
}

function isRedoAvailable() {
  return ruleRedoStack.length > 0;
}

function undoRuleUpdate({ rule, updateRule }) {
  const lastEdit = ruleUndoStack.pop();
  ruleRedoStack.push(rule);
  if (lastEdit) {
    const lastEditCopy = { ...lastEdit };
    lastEditCopy.history = undefined;
    updateRule.mutate(lastEditCopy);
  }
}

function redoRuleUpdate({ rule, updateRule }) {
  const lastEdit = ruleRedoStack.pop();
  ruleUndoStack.push(rule);
  if (lastEdit) {
    const lastEditCopy = { ...lastEdit };
    lastEditCopy.history = undefined;
    updateRule.mutate(lastEditCopy);
  }
}

function updateConditionSettings(
  { rule: { conditions }, updateRule, user },
  { rowIdx, conditionSettings }
) {
  const updatedBy = safeUpdatedBy(user);
  const newConditions = [
    ...conditions.slice(0, rowIdx),
    {
      ...conditions[rowIdx],
      settings: { ...conditions[rowIdx].settings, ...conditionSettings },
    },
    ...conditions.slice(rowIdx + 1),
  ];
  updateRule.mutate({
    conditions: newConditions,
    no_conditions: newConditions?.length || 0,
    updatedAt: new Date().toISOString(),
    updatedBy,
  });
}

function bulkUpdateConditionSettings(
  { rule: { conditions }, updateRule, user },
  { rowIdxs, conditionSettings }
) {
  const updatedBy = safeUpdatedBy(user);
  const { _groupId, ...conditionSettingsWithoutGroupId } = conditionSettings;
  updateRule.mutate({
    conditions: conditions.map((condition, idx) =>
      rowIdxs.has(idx)
        ? {
            ...condition,
            settings: {
              ...condition.settings,
              ...conditionSettingsWithoutGroupId,
            },
          }
        : condition
    ),
    updatedAt: new Date().toISOString(),
    updatedBy,
  });
}

function updateGroupSettings(
  { rule, updateRule, user },
  { groupId, groupSettings }
) {
  const updatedBy = safeUpdatedBy(user);
  if (groupId && rule.groups?.[groupId]) {
    updateRule.mutate({
      groups: {
        ...rule.groups,
        [groupId]: { ...rule.groups[groupId], ...groupSettings },
      },
      updatedAt: new Date().toISOString(),
      updatedBy,
    });
  }
}

function addRow({ rule: { conditions }, updateRule, setTestState, user }) {
  const updatedBy = safeUpdatedBy(user);
  const blankCondition = {
    request: {},
    response: {},
    settings: { enabled: true, schedule: [], priority: 0, groupId: null },
  };
  setTestState(null);
  updateRule.mutate({
    conditions: [...conditions, blankCondition],
    no_conditions: conditions?.length || 0,
    updatedAt: new Date().toISOString(),
    updatedBy,
  });
}

function clearSelectedRows({
  rule: { conditions },
  selectedRows,
  setTestState,
  updateRule,
  user,
}) {
  const updatedBy = safeUpdatedBy(user);
  setTestState(null);
  const newConditions = conditions.map((x, idx) =>
    selectedRows.has(idx)
      ? {
          request: {},
          response: {},
          settings: { enabled: true, schedule: [], priority: 0, groupId: null },
        }
      : x
  );
  updateRule.mutate({
    conditions: newConditions,
    no_conditions: conditions?.length || 0,
    updatedAt: new Date().toISOString(),
    updatedBy,
  });
}

function deleteSelectedRows({
  rule: { conditions },
  selectedRows,
  setSelectedRows,
  setTestState,
  updateRule,
  user,
}) {
  const updatedBy = safeUpdatedBy(user);
  setTestState(null);
  const newConditions = conditions.filter((_x, idx) => !selectedRows.has(idx));
  setSelectedRows(new Set());
  updateRule.mutate({
    conditions: newConditions,
    no_conditions: newConditions?.length || 0,
    updatedAt: new Date().toISOString(),
    updatedBy,
  });
}

function duplicateSelectedRows({
  rule: { conditions },
  selectedRows,
  setSelectedRows,
  setTestState,
  updateRule,
  user,
}) {
  const updatedBy = safeUpdatedBy(user);
  setTestState(null);
  const newConditions = conditions.filter((_x, idx) => selectedRows.has(idx));
  setSelectedRows(new Set());
  updateRule.mutate({
    conditions: [...conditions, ...newConditions],
    no_conditions: conditions?.length || 0,
    updatedAt: new Date().toISOString(),
    updatedBy,
  });
}

function moveSelectedRowsToTop({
  rule: { conditions },
  selectedRows,
  setSelectedRows,
  setTestState,
  updateRule,
  user,
}) {
  const updatedBy = safeUpdatedBy(user);
  setTestState(null);
  const selectedConditions = conditions.filter((_x, idx) =>
    selectedRows.has(idx)
  );
  const remainingConditions = conditions.filter(
    (_x, idx) => !selectedRows.has(idx)
  );
  setSelectedRows(new Set());
  updateRule.mutate({
    conditions: [...selectedConditions, ...remainingConditions],
    no_conditions: conditions?.length || 0,
    updatedAt: new Date().toISOString(),
    updatedBy,
  });
}

function moveSelectedRowsToBottom({
  rule: { conditions },
  selectedRows,
  setSelectedRows,
  setTestState,
  updateRule,
  user,
}) {
  const updatedBy = safeUpdatedBy(user);
  setTestState(null);
  const selectedConditions = conditions.filter((_x, idx) =>
    selectedRows.has(idx)
  );
  const remainingConditions = conditions.filter(
    (_x, idx) => !selectedRows.has(idx)
  );
  setSelectedRows(new Set());
  updateRule.mutate({
    conditions: [...remainingConditions, ...selectedConditions],
    no_conditions: conditions?.length || 0,
    updatedAt: new Date().toISOString(),
    updatedBy,
  });
}

function toggleSidebar() {
  // Sidebar disabled in embed mode
}

function openSidebarToColumn() {
  // Sidebar disabled in embed mode
}

function updateRuleName({ updateRule, user }, { name }) {
  updateRule.mutate({
    name,
    updatedAt: new Date().toISOString(),
    updatedBy: safeUpdatedBy(user),
  });
}

function updateSectionSchema(
  {
    rule: { conditions, requestSchema, responseSchema },
    setTestState,
    updateRule,
    focusedColumnKey,
    setFocusedColumnKey,
    user,
  },
  { sectionKey, newSampleJSON }
) {
  setTestState(null);

  let columnSchemaKey, columnSchema, sampleJSONKey;
  if (sectionKey === "request") {
    sampleJSONKey = "sampleRequest";
    columnSchemaKey = "requestSchema";
    columnSchema = requestSchema;
  } else {
    sampleJSONKey = "sampleResponse";
    columnSchemaKey = "responseSchema";
    columnSchema = responseSchema;
  }

  const newSchema = getColumnSchema(newSampleJSON);
  const mergedSchema = mergeSchemas(columnSchema, newSchema);

  for (const col of mergedSchema) {
    col.show = true;
  }

  const colsToClear = new Set();
  for (const oldCol of columnSchema) {
    const newCol = newSchema.find((x) => x.key === oldCol.key);
    if (!newCol || newCol.type !== oldCol.type) {
      colsToClear.add(oldCol.key);
    }
  }

  const newConditions = structuredClone(conditions);
  for (const condition of newConditions) {
    for (const colKey of colsToClear) {
      delete condition[sectionKey][colKey];
    }
  }

  if (
    focusedColumnKey !== null &&
    !mergedSchema?.find((x) => x.key === focusedColumnKey)
  ) {
    setFocusedColumnKey(mergedSchema[0] ? mergedSchema[0].key : null);
  }

  updateRule.mutate({
    [sampleJSONKey]: newSampleJSON,
    [columnSchemaKey]: mergedSchema,
    conditions: newConditions,
    updatedAt: new Date().toISOString(),
    updatedBy: safeUpdatedBy(user),
  });
}

function updateColumnSchema(
  {
    rule: {
      conditions,
      sampleRequest,
      sampleResponse,
      requestSchema,
      responseSchema,
    },
    setTestState,
    updateRule,
    user,
  },
  {
    key,
    sectionKey,
    nameValue,
    descriptionValue,
    typeValue,
    defaultValue,
    show,
    valuesOnly,
    valuesPrefix,
  }
) {
  setTestState(null);

  let columnSchemaKey, columnSchema, sampleJSONKey, sampleJSON;
  if (sectionKey === "request") {
    sampleJSON = sampleRequest;
    sampleJSONKey = "sampleRequest";
    columnSchemaKey = "requestSchema";
    columnSchema = requestSchema;
  } else {
    sampleJSON = sampleResponse;
    sampleJSONKey = "sampleResponse";
    columnSchemaKey = "responseSchema";
    columnSchema = responseSchema;
  }

  const updatedValues = {};
  const newSchema = structuredClone(columnSchema);
  const col = newSchema.find((x) => x.key === key);

  if (nameValue !== undefined) col.name = nameValue;
  if (descriptionValue !== undefined) col.description = descriptionValue;

  if (typeValue !== undefined && typeValue !== col.type) {
    col.type = typeValue;
    const newConditions = structuredClone(conditions);
    for (const condition of newConditions) {
      delete condition[sectionKey][key];
    }
    updatedValues.conditions = newConditions;
  }

  if (defaultValue !== undefined) {
    col.defaultValue = processValue(typeValue, defaultValue).value;
    const newJSON = structuredClone(sampleJSON);
    setPath(newJSON, col.key.split("."), col.defaultValue);
    updatedValues[sampleJSONKey] = newJSON;
  }

  if (show !== undefined) col.show = show;
  if (valuesPrefix !== undefined) col.valuesPrefix = valuesPrefix;
  if (valuesOnly !== undefined) col.valuesOnly = valuesOnly;

  updatedValues[columnSchemaKey] = newSchema;

  updateRule.mutate({
    ...updatedValues,
    updatedAt: new Date().toISOString(),
    updatedBy: safeUpdatedBy(user),
  });
}

function updateCellData(
  { rule: { conditions }, setTestState, updateRule, user },
  { newData, key, sectionKey, rowIdx }
) {
  const updatedBy = safeUpdatedBy(user);
  setTestState(null);

  const newRow = structuredClone(conditions[rowIdx]);
  newRow[sectionKey][key] = newData;

  const newConditions = [...conditions];
  newConditions[rowIdx] = newRow;

  updateRule.mutate({
    conditions: newConditions,
    updatedAt: new Date().toISOString(),
    updatedBy,
  });
}

function batchUpdateCellData(
  { rule: { conditions }, setTestState, updateRule, user },
  { newData, sectionKey, key, rowIdxs }
) {
  const updatedBy = safeUpdatedBy(user);
  setTestState(null);

  const newConditions = structuredClone(conditions).map((condition, idx) =>
    rowIdxs.has(idx)
      ? {
          ...condition,
          [sectionKey]: { ...condition[sectionKey], [key]: newData },
        }
      : condition
  );

  updateRule.mutate({
    conditions: newConditions,
    updatedAt: new Date().toISOString(),
    updatedBy,
  });
}

function groupRows({
  rule: { conditions, groups },
  selectedRows,
  setSelectedRows,
  updateRule,
  user,
}) {
  const updatedBy = safeUpdatedBy(user);

  const id = nanoid();
  const newGroup = {
    id,
    color: randomColor({ seed: id }),
    strategy: "object",
    priority: 0,
  };
  const newGroups = { ...groups, [newGroup.id]: newGroup };
  const newConditions = [...conditions];

  for (const rowIdx of selectedRows) {
    const newCondition = structuredClone(conditions[rowIdx]);
    if (!newCondition.settings) {
      newCondition.settings = {
        enabled: true,
        schedule: [],
        priority: 0,
        groupId: null,
      };
    }
    newCondition.settings.groupId = newGroup.id;
    newConditions[rowIdx] = newCondition;
  }

  const newGroupsInUse = new Set();
  for (const condition of newConditions) {
    if (condition.settings?.groupId) {
      newGroupsInUse.add(condition.settings.groupId);
    }
  }

  const newGroupsToKeep = {};
  for (const groupId of newGroupsInUse) {
    newGroupsToKeep[groupId] = newGroups[groupId];
  }

  updateRule.mutate({
    conditions: newConditions,
    groups: newGroupsToKeep,
    updatedAt: new Date().toISOString(),
    updatedBy,
  });

  setSelectedRows(new Set());
}

function ungroupAllRowsInGroup(
  { rule: { conditions, groups }, updateRule, user },
  { groupId }
) {
  const updatedBy = safeUpdatedBy(user);
  const newConditions = structuredClone(conditions).map((condition) => {
    if (condition.settings?.groupId === groupId) {
      return {
        ...condition,
        settings: { ...condition.settings, groupId: null },
      };
    }
    return condition;
  });

  const newGroups = { ...groups };
  delete newGroups[groupId];

  updateRule.mutate({
    conditions: newConditions,
    groups: newGroups,
    updatedAt: new Date().toISOString(),
    updatedBy,
  });
}

function ejectRule({ rule }) {
  const data = JSON.stringify(rule, null, 2);
  const version = rule.published
    ? rule?.history?.filter((h) => h.action === "publish").length.toString()
    : "0";
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download =
    version === "0"
      ? `${rule.name}-Draft-${new Date().toISOString().split("T")[0]}.rbx`
      : `${rule.name}-v${version}-${
          new Date().toISOString().split("T")[0]
        }.rbx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function clearSelectedCell(
  { rule: { conditions }, updateRule },
  { rowIdx, sectionKey, key }
) {
  const newConditions = [...conditions];
  try {
    if (sectionKey === "request") {
      newConditions[rowIdx][sectionKey][key] = { op: "any", args: [] };
    } else if (sectionKey === "response") {
      newConditions[rowIdx][sectionKey][key] = { value: null };
    }
    updateRule.mutate({
      conditions: newConditions,
      updatedAt: new Date().toISOString(),
    });
  } catch (_e) {}
}

function toggleColumnPin(
  { pinnedColumns, setPinnedColumns },
  { key, isPinned }
) {
  const newPinnedColumns = new Set(pinnedColumns);
  if (!isPinned) {
    newPinnedColumns.delete(key);
  } else {
    newPinnedColumns.add(key);
  }
  setPinnedColumns(newPinnedColumns);
}

export default {
  pushToRuleUndoStack,
  isUndoAvailable,
  isRedoAvailable,
  undoRuleUpdate,
  redoRuleUpdate,
  addRow,
  groupRows,
  updateConditionSettings,
  updateGroupSettings,
  clearSelectedRows,
  deleteSelectedRows,
  duplicateSelectedRows,
  moveSelectedRowsToTop,
  moveSelectedRowsToBottom,
  toggleSidebar,
  openSidebarToColumn,
  updateRuleName,
  updateColumnSchema,
  updateSectionSchema,
  updateCellData,
  batchUpdateCellData,
  ungroupAllRowsInGroup,
  bulkUpdateConditionSettings,
  ejectRule,
  clearSelectedCell,
  toggleColumnPin,
};
