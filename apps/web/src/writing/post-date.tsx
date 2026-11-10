import { formatDate } from "./date";

export function PostDate({ day }: { day: string }) {
  return <time dateTime={day}>{formatDate(day)}</time>;
}
