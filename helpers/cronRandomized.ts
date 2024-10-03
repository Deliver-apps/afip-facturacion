function getRandomMinute(): number {
  return Math.floor(Math.random() * 60);
}

function getRandomHour(startHour: number, endHour: number): number {
  return Math.floor(Math.random() * (endHour - startHour + 1)) + startHour;
}

function getRandomDay(startDay: number, endDay: number): number {
  return Math.floor(Math.random() * (endDay - startDay + 1)) + startDay;
}

export function generateRandomCronTimes(
  n: number,
  startHour: number,
  endHour: number,
  startDay: number,
  endDay: number
): string[] {
  const cronTimes: string[] = [];

  for (let i = 0; i < n; i++) {
    const minute = getRandomMinute();
    const hour = getRandomHour(startHour, endHour);
    const day = getRandomDay(startDay, endDay);
    const cronTime = `${minute} ${hour} ${day} * *`;
    cronTimes.push(cronTime);
  }

  return cronTimes;
}
