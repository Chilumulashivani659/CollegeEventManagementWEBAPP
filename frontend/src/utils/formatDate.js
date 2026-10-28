/**
 * Format a 'YYYY-MM-DD' database date for display, e.g. 15 Nov 2026.
 */
export const formatDate = (value) => {
  if (!value) return '—';
  const [year, month, day] = String(value).slice(0, 10).split('-').map(Number);
  if (!year || !month || !day) return String(value);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

/**
 * Convert a database date value to the 'YYYY-MM-DD' format required by <input type="date">.
 */
export const toDateInputValue = (value) => (value ? String(value).slice(0, 10) : '');
