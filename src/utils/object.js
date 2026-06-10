/**
 * Sets a value in an object at a specific path, creating missing
 * intermediate objects along the way.
 * @param {Object} obj - The object to modify.
 * @param {string[]} path - The path to the property to set.
 * @param {*} value - The value to set.
 */
export function setPath(obj, path, value) {
  if (!obj || !Array.isArray(path) || path.length === 0) return;

  const branches = path;
  let current = obj;
  branches.slice(0, -1).forEach((branch) => {
    if (current[branch] == null || typeof current[branch] !== "object") {
      current[branch] = {};
    }
    current = current[branch];
  });
  current[branches[branches.length - 1]] = value;
}

