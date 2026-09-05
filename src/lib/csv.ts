import 'server-only';

/**
 * A cell starting with =, +, -, or @ is interpreted as a formula by
 * Excel/Sheets when the file is opened — these exports go straight to admins
 * who open them in a spreadsheet app, so every cell is neutralized against
 * formula injection (see docs/plan.md).
 */
function sanitizeCell(value: string): string {
  return /^[=+\-@]/.test(value) ? `'${value}` : value;
}

function escapeCsvField(value: string): string {
  const sanitized = sanitizeCell(value);
  return /[",\r\n]/.test(sanitized) ? `"${sanitized.replace(/"/g, '""')}"` : sanitized;
}

export function toCsv(headers: string[], rows: string[][]): string {
  return [headers, ...rows].map((row) => row.map(escapeCsvField).join(',')).join('\r\n');
}
