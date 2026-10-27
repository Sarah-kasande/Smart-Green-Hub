// "Good morning" / "Good afternoon" / "Good evening" (text key), from the time on this device
export function greetingKey(date = new Date()) {
  const hour = date.getHours()
  if (hour < 12) return 'dashboard.greetMorning'
  if (hour < 18) return 'dashboard.greetAfternoon'
  return 'dashboard.greetEvening'
}
