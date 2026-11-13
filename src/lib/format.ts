export function formatDutchDate(isoDate: string): string {
  // isoDate formaat: YYYY-MM-DD
  const parts = isoDate.split('-').map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) {
    return isoDate;
  }
  const date = new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0);
  return new Intl.DateTimeFormat('nl-NL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

export function formatDutchShortDate(isoDate: string): string {
  const parts = isoDate.split('-').map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) {
    return isoDate;
  }
  const date = new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0);
  return new Intl.DateTimeFormat('nl-NL', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(date);
}

export function formatRelativeDays(isoDate: string): string {
  const parts = isoDate.split('-').map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) {
    return '';
  }
  const target = new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0);
  const now = new Date();
  now.setHours(12, 0, 0, 0);
  const diffDays = Math.round(
    (target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays === 0) return 'Vandaag';
  if (diffDays === 1) return 'Morgen';
  if (diffDays > 1 && diffDays <= 14) return `Over ${diffDays} dagen`;
  if (diffDays < 0) return 'Geweest';
  return '';
}
