/**
 * Utility helpers for formatting snippet metadata.
 */

/**
 * Format a date value to `M/D` (e.g., 6/25).
 * Accepts Date or anything convertible by `new Date()`.
 */
export function formatDateToMD(date: Date | string | number): string {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

/**
 * Format a usage count as, e.g., "4×".
 */
export function formatCount(count: number): string {
  return `${count}×`;
}
