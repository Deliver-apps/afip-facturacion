export function cronToTime(cron: string): string | null {
  // Split the cron string by whitespace
  const parts = cron.trim().split(/\s+/);

  // Cron expressions should have at least 2 parts (minute, hour)
  if (parts.length < 2) {
    console.error('Invalid cron expression: Less than 2 fields provided.');
    return null;
  }

  const minutePart = parts[0];
  const hourPart = parts[1];
  const dayPart = parts[2];
  const thisMonth = new Date().getMonth() + 1;
  const thisYear = new Date().getFullYear();

  // Handle wildcards by setting to current minute/hour if needed
  // For simplicity, this function does not support ranges, lists, or step values
  if (minutePart === '*' || hourPart === '*' || dayPart === '*') {
    console.error(
      'Wildcard "*" is not supported for minute or hour fields in this function.'
    );
    return null;
  }

  // Parse minute and hour as integers
  const minute = parseInt(minutePart, 10);
  const hour = parseInt(hourPart, 10);
  const day = parseInt(dayPart, 10);

  // Validate parsed values
  if (isNaN(minute) || isNaN(hour)) {
    console.error(
      'Invalid cron expression: Minute and hour should be numeric.'
    );
    return null;
  }

  if (minute < 0 || minute > 59) {
    console.error(
      'Invalid minute value in cron expression. Must be between 0 and 59.'
    );
    return null;
  }

  if (hour < 0 || hour > 23) {
    console.error(
      'Invalid hour value in cron expression. Must be between 0 and 23.'
    );
    return null;
  }

  if (day < 1) {
    console.error('Invalid day value in cron expression. Must be between 1');
    return null;
  }

  if (day === thisMonth && dayPart === 'L') {
    console.error(
      'Invalid day value in cron expression. Must be between 1 and the current month.'
    );
    return null;
  }

  const parsedMinute = minute < 10 ? `0${minute}` : minute;
  const parsedHour = hour < 10 ? `0${hour}` : hour;

  // Format hour and minute as HH:mm
  const formattedTime = `Fecha: ${day}/${thisMonth}/${thisYear} Hora: ${parsedHour}:${parsedMinute}`;

  return formattedTime;
}
