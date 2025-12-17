/**
 * Hook for row manipulation utilities (reordering).
 * @param {Function} setRows - State setter for rows.
 * @param {Set} selectedRows - Set of selected row indices.
 * @param {Function} setSelectedRows - State setter for selected rows.
 * @param {Object} updateRule - Mutation object for updating the rule.
 * @param {Object} user - The current user object.
 * @returns {Object} An object containing onRowReorder and onRowsReorder functions.
 */
export function useRowUtils(
  setRows,
  selectedRows,
  setSelectedRows,
  updateRule,
  user
) {
  const onRowReorder = (fromIndex, toIndex) => {
    setRows((rows) => {
      const newRows = [...rows];
      newRows.splice(toIndex, 0, newRows.splice(fromIndex, 1)[0]);
      updateRule.mutate({
        conditions: newRows.map((r) => r.data),
        updatedAt: new Date().toISOString(),
        updatedBy: user?.name || user?.email || "Embedded User",
      });
      if (selectedRows?.has(fromIndex)) {
        const newSelectedRows = new Set(selectedRows);
        newSelectedRows.delete(fromIndex);
        newSelectedRows.add(toIndex);
        setSelectedRows(newSelectedRows);
      }
      return newRows;
    });
  };

  const onRowsReorder = (fromIndexes, toIndex) => {
    setRows((rows) => {
      const selectedRowsToMove = fromIndexes.map((i) => rows[i]);
      let rowsBeforeDropIndex = rows
        .slice(0, toIndex)
        .filter((r) => !selectedRows.has(r.id));
      let rowsAfterDropIndex = rows
        .slice(toIndex)
        .filter((r) => !selectedRows.has(r.id));
      const newRows = [
        ...rowsBeforeDropIndex,
        ...selectedRowsToMove,
        ...rowsAfterDropIndex,
      ];
      updateRule.mutate({
        conditions: newRows.map((r) => r.data),
        updatedAt: new Date().toISOString(),
        updatedBy: user?.name || user?.email || "Embedded User",
      });
      setSelectedRows(new Set());
      return newRows;
    });
  };

  return { onRowReorder, onRowsReorder };
}

