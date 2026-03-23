/**
 * Parse a cron expression and return a human-readable description
 * Format: minute hour day month weekday
 * Examples:
 * - "0 * * * *" -> "Every hour"
 * - "star/5 * * * *" -> "Every 5 minutes" (replace star with *)
 * - "0 0 * * *" -> "Daily at midnight"
 * - "0 0 * * 0" -> "Weekly on Sunday at midnight"
 */
export function parseCronExpression(cronExpr: string): string {
  if (!cronExpr || cronExpr.trim() === '') {
    return 'Invalid cron expression';
  }

  const parts = cronExpr.trim().split(/\s+/);

  if (parts.length < 5) {
    return 'Invalid cron expression (expected 5 fields: minute hour day month weekday)';
  }

  const [minute, hour, day, month, weekday] = parts;

  // Helper to check if field is "all" (*)
  const isAll = (field: string) => field === '*';

  // Helper to check if field is a step value (*/n)
  const isStep = (field: string) => field.startsWith('*/');

  // Helper to get step value
  const getStepValue = (field: string) => parseInt(field.substring(2));

  // Every N minutes
  if (isStep(minute) && isAll(hour) && isAll(day) && isAll(month) && isAll(weekday)) {
    const mins = getStepValue(minute);
    return mins === 1 ? 'Every minute' : `Every ${mins} minutes`;
  }

  // Every N hours
  if (isAll(minute) && isStep(hour) && isAll(day) && isAll(month) && isAll(weekday)) {
    const hrs = getStepValue(hour);
    return hrs === 1 ? 'Every hour' : `Every ${hrs} hours`;
  }

  // Hourly at specific minute
  if (!isAll(minute) && isAll(hour) && isAll(day) && isAll(month) && isAll(weekday)) {
    return `Every hour at minute ${minute}`;
  }

  // Daily at specific time
  if (!isAll(minute) && !isAll(hour) && isAll(day) && isAll(month) && isAll(weekday)) {
    const hourNum = parseInt(hour);
    const minNum = parseInt(minute);
    return `Daily at ${hourNum.toString().padStart(2, '0')}:${minNum.toString().padStart(2, '0')}`;
  }

  // Weekly on specific day
  if (!isAll(minute) && !isAll(hour) && isAll(day) && isAll(month) && !isAll(weekday)) {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayName = days[parseInt(weekday)] || weekday;
    const hourNum = parseInt(hour);
    const minNum = parseInt(minute);
    return `Weekly on ${dayName} at ${hourNum.toString().padStart(2, '0')}:${minNum
      .toString()
      .padStart(2, '0')}`;
  }

  // Monthly on specific day
  if (!isAll(minute) && !isAll(hour) && !isAll(day) && isAll(month) && isAll(weekday)) {
    const hourNum = parseInt(hour);
    const minNum = parseInt(minute);
    return `Monthly on day ${day} at ${hourNum.toString().padStart(2, '0')}:${minNum
      .toString()
      .padStart(2, '0')}`;
  }

  // Specific day of month
  if (!isAll(minute) && !isAll(hour) && !isAll(day) && !isAll(month) && isAll(weekday)) {
    const months = [
      '',
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];
    const monthName = months[parseInt(month)] || month;
    const hourNum = parseInt(hour);
    const minNum = parseInt(minute);
    return `Yearly on ${monthName} ${day} at ${hourNum.toString().padStart(2, '0')}:${minNum
      .toString()
      .padStart(2, '0')}`;
  }

  // Midnight daily
  if (minute === '0' && hour === '0' && isAll(day) && isAll(month) && isAll(weekday)) {
    return 'Daily at midnight';
  }

  // Noon daily
  if (minute === '0' && hour === '12' && isAll(day) && isAll(month) && isAll(weekday)) {
    return 'Daily at noon';
  }

  // Complex expression - just show the raw format
  return `Cron: ${cronExpr}`;
}

/**
 * Common cron expression presets
 */
export const CRON_PRESETS = [
  { label: 'Every 5 minutes', value: '*/5 * * * *' },
  { label: 'Every 10 minutes', value: '*/10 * * * *' },
  { label: 'Every 15 minutes', value: '*/15 * * * *' },
  { label: 'Every 30 minutes', value: '*/30 * * * *' },
  { label: 'Every hour', value: '0 * * * *' },
  { label: 'Every 6 hours', value: '0 */6 * * *' },
  { label: 'Every 12 hours', value: '0 */12 * * *' },
  { label: 'Daily at midnight', value: '0 0 * * *' },
  { label: 'Daily at 6 AM', value: '0 6 * * *' },
  { label: 'Daily at noon', value: '0 12 * * *' },
  { label: 'Weekly on Sunday', value: '0 0 * * 0' },
  { label: 'Weekly on Monday', value: '0 0 * * 1' },
  { label: 'Monthly on 1st', value: '0 0 1 * *' },
];
