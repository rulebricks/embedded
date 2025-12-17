/**
 * Sets a value in an object at a specific path.
 * @param {Object} obj - The object to modify.
 * @param {string[]} path - The path to the property to set.
 * @param {*} value - The value to set.
 */
export function setPath(obj, path, value) {
  const branches = path;
  branches.slice(0, -1).forEach((branch) => {
    obj = obj[branch];
  });
  obj[branches[branches.length - 1]] = value;
}

