/**
 * Creates a debounced function that batches calls.
 * @param {Function} func - The function to debounce and batch.
 * @param {number} wait - The wait time in milliseconds.
 * @returns {Function} The debounced function.
 */
export function batchDebounce(func, wait) {
  let timerId = null;
  const calls = new Map();

  return ({ columnKey, sourceRow, targetRow }) => {
    const key = JSON.stringify({ columnKey, sourceRow: sourceRow.id });
    if (!calls.has(key)) {
      calls.set(key, { columnKey, sourceRow, targetRows: [] });
    }
    calls.get(key).targetRows.push(targetRow);

    clearTimeout(timerId);
    timerId = setTimeout(() => {
      calls.forEach((call) => func(call));
      calls.clear();
    }, wait);
  };
}
