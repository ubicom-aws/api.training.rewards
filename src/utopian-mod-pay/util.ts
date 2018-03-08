export const RUNTIME_NOW = getRoundedDate(new Date());

export function formatCat(cat: string): string {
  return cat.replace('-', ' ').replace(/\w\S*/g, (str) => {
    return str.charAt(0).toUpperCase() + str.substring(1);
  });
}

export function getRoundedDate(d: Date): Date {
  const date = new Date(d);
  date.setUTCHours(0);
  date.setUTCMinutes(0);
  date.setUTCSeconds(0);
  date.setUTCMilliseconds(0);
  const day = date.getUTCDay(); // 0 = sunday, 4 = thursday
  if (day !== 4) {
    const d = date.getUTCDate();
    const diff = day > 4 ? d - (day - 4) : (d - 7) + (4 - day);
    date.setUTCDate(diff);
  }

  return date;
}
