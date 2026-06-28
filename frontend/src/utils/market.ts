// US Market Holidays (NYSE) for 2024-2026 (simplified MMDD format)
const HOLIDAYS = [
  '0101', // New Year's Day
  '0115', // MLK Day (approx)
  '0219', // Presidents' Day (approx)
  '0329', // Good Friday (varies)
  '0527', // Memorial Day (approx)
  '0619', // Juneteenth
  '0704', // Independence Day
  '0902', // Labor Day (approx)
  '1128', // Thanksgiving (approx)
  '1225', // Christmas
];

export const isMarketOpen = (): boolean => {
  // Simple check for NY Market Hours: Mon-Fri, 09:30 - 16:00 EST.
  const now = new Date();
  
  // Check holidays first (simplified)
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const dayStr = now.getDate().toString().padStart(2, '0');
  if (HOLIDAYS.includes(`${month}${dayStr}`)) {
    return false;
  }
  
  // Get time in EST/EDT
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    weekday: 'short',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  });
  
  const parts = formatter.formatToParts(now);
  const weekday = parts.find(p => p.type === 'weekday')?.value;
  const hourStr = parts.find(p => p.type === 'hour')?.value;
  const minStr = parts.find(p => p.type === 'minute')?.value;
  
  if (!weekday || !hourStr || !minStr) return false;
  
  if (weekday === 'Sat' || weekday === 'Sun') return false;
  
  const hour = parseInt(hourStr, 10);
  const min = parseInt(minStr, 10);
  
  const timeInMinutes = hour * 60 + min;
  const openTime = 9 * 60 + 30; // 09:30
  const closeTime = 16 * 60;    // 16:00
  
  return timeInMinutes >= openTime && timeInMinutes < closeTime;
};

