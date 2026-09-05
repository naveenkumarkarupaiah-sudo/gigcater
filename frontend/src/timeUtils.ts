// Parses "HH:MM" (24h, from <input type="time">) or legacy "H:MM AM/PM" strings.
export const parseTimeString = (timeStr?: string): { hours: number; minutes: number } | null => {
  if (!timeStr) return null;
  const trimmed = timeStr.trim();
  const ampmMatch = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (ampmMatch) {
    let hours = parseInt(ampmMatch[1], 10);
    const minutes = parseInt(ampmMatch[2], 10);
    const ampm = ampmMatch[3].toUpperCase();
    if (ampm === 'PM' && hours < 12) hours += 12;
    if (ampm === 'AM' && hours === 12) hours = 0;
    return { hours, minutes };
  }
  const h24Match = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (h24Match) {
    return { hours: parseInt(h24Match[1], 10), minutes: parseInt(h24Match[2], 10) };
  }
  return null;
};

// Formats a stored time string into a friendly 12h label for display, e.g. "6:00 PM".
export const formatTimeLabel = (timeStr?: string): string => {
  const parsed = parseTimeString(timeStr);
  if (!parsed) return timeStr || '';
  const { hours, minutes } = parsed;
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const h12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${h12}:${minutes.toString().padStart(2, '0')} ${ampm}`;
};
