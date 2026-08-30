export function slugify(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")   // strip anything not alphanumeric/space/hyphen
    .replace(/\s+/g, "-")           // spaces → hyphens
    .replace(/-+/g, "-");           // collapse repeated hyphens
}


export const USERNAME_MIN_LENGTH = 4;
export const USERNAME_MAX_LENGTH = 50;

export function isValidUsername(username: string): boolean {
  return (
    username.length >= USERNAME_MIN_LENGTH &&
    username.length <= USERNAME_MAX_LENGTH
  );
}

export function isValidDuration(durationMins: number): boolean {
  return durationMins > 0;
}

export function isValidDayOfWeek(dayOfWeek: number): boolean {
  return dayOfWeek >= 0 && dayOfWeek <= 6;
}

export function isValidTimeRange(startTime: string, endTime: string): boolean {
  // expects "HH:MM" or "HH:MM:SS" — string comparison works for zero-padded 24h times
  return startTime < endTime;
}

export function isValidBookingRange(startsAt: Date, endsAt: Date): boolean {
  return startsAt < endsAt;
}