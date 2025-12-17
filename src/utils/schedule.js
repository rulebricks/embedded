/**
 * Checks if the current time is within a given schedule.
 * @param {Array<{day: string, from: string, to: string}>} schedule - The schedule to check against.
 * @returns {boolean} True if the current time is within the schedule, false otherwise.
 */
export function withinSchedule(schedule) {
  // where `schedule` is an array like [ { day: "Monday", from: "10:02", to: "23:00" }, ... ]
  // in 24h format, GMT
  const now = new Date();
  const days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];
  // Note: days array had 8 elements in original code? No, 7. 0-6.
  // Original:
  // const days = [
  //   "Sunday",
  //   "Monday",
  //   "Tuesday",
  //   "Wednesday",
  //   "Thursday",
  //   "Friday",
  //   "Saturday",
  // ];
  // now.getUTCDay() returns 0 (Sunday) to 6 (Saturday).
  
  const day = days[now.getUTCDay()];
  const hours = now.getUTCHours().toString().padStart(2, "0");
  const minutes = now.getUTCMinutes().toString().padStart(2, "0");
  const time = `${hours}:${minutes}`;

  const currentSchedule = schedule.find((s) => s.day === day);
  if (!currentSchedule) return false;

  const { from, to } = currentSchedule;
  return time >= from && time <= to;
}

