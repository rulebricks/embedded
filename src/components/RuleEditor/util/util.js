export function setPath(obj, path, value) {
  const branches = path;
  branches.slice(0, -1).forEach((branch) => {
    obj = obj[branch];
  });
  obj[branches[branches.length - 1]] = value;
}

export function capitalize(str) {
  return str ? `${str[0].toUpperCase()}${str.slice(1)}` : "";
}

export function withinSchedule(schedule) {
  // where `schedule` is an array like [ { day: "Monday", from: "10:02", to: "23:00" }, ... ]
  // in 24h format, GMT
  const now = new Date();
  const days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const day = days[now.getUTCDay()];
  const hours = now.getUTCHours().toString().padStart(2, "0");
  const minutes = now.getUTCMinutes().toString().padStart(2, "0");
  const time = `${hours}:${minutes}`;

  const currentSchedule = schedule.find((s) => s.day === day);
  if (!currentSchedule) return false;

  const { from, to } = currentSchedule;
  return time >= from && time <= to;
}

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
