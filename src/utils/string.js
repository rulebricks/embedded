/**
 * Capitalizes the first letter of a string.
 * @param {string} str - The string to capitalize.
 * @returns {string} The capitalized string.
 */
export function capitalize(str) {
  return str ? `${str[0].toUpperCase()}${str.slice(1)}` : "";
}

