/**
 * Format minutes into a human-readable string (e.g., "3h 5m")
 */
export function formatMinutes(minutes: number): string {
  if (minutes === 0) return '0m'
  
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  
  if (hours === 0) {
    return `${mins}m`
  }
  if (mins === 0) {
    return `${hours}h`
  }
  return `${hours}h ${mins}m`
}






