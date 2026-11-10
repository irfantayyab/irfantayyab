const months = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export function formatDate(day: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
  const month = match ? months[Number(match[2]) - 1] : undefined;
  if (!match || !month) {
    throw new Error(`Not a YYYY-MM-DD date: ${day}`);
  }
  return `${Number(match[3])} ${month} ${match[1]}`;
}
