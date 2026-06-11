const ARGENTINA_TZ = 'America/Argentina/Buenos_Aires'

const dateFormatter = new Intl.DateTimeFormat('es-AR', {
  timeZone: ARGENTINA_TZ,
  weekday: 'short',
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
})

const dayFormatter = new Intl.DateTimeFormat('es-AR', {
  timeZone: ARGENTINA_TZ,
  weekday: 'long',
  day: '2-digit',
  month: 'long',
})

const timeFormatter = new Intl.DateTimeFormat('es-AR', {
  timeZone: ARGENTINA_TZ,
  hour: '2-digit',
  minute: '2-digit',
})

const partsFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: ARGENTINA_TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

const chipWeekdayFormatter = new Intl.DateTimeFormat('es-AR', { timeZone: ARGENTINA_TZ, weekday: 'short' })
const chipDayFormatter = new Intl.DateTimeFormat('es-AR', { timeZone: ARGENTINA_TZ, day: '2-digit' })
const chipMonthFormatter = new Intl.DateTimeFormat('es-AR', { timeZone: ARGENTINA_TZ, month: 'short' })

function capitalize(label: string): string {
  return label.charAt(0).toUpperCase() + label.slice(1)
}

export function formatKickoff(iso: string): string {
  return dateFormatter.format(new Date(iso))
}

export function formatDay(iso: string): string {
  return capitalize(dayFormatter.format(new Date(iso)))
}

/** Devuelve { weekday, day, month } en hora de Argentina, para mostrar en un selector de fechas. */
export function formatDateChip(iso: string): { weekday: string; day: string; month: string } {
  const date = new Date(iso)
  return {
    weekday: capitalize(chipWeekdayFormatter.format(date).replace('.', '')),
    day: chipDayFormatter.format(date),
    month: capitalize(chipMonthFormatter.format(date).replace('.', '')),
  }
}

/** Fecha de hoy ("YYYY-MM-DD") en hora de Argentina. */
export function getArgentinaToday(): string {
  return toDateTimeLocal(new Date().toISOString()).slice(0, 10)
}

export function formatTime(iso: string): string {
  return timeFormatter.format(new Date(iso))
}

/** Convierte un ISO string a "YYYY-MM-DDTHH:mm" en hora de Argentina, para <input type="datetime-local">. */
export function toDateTimeLocal(iso: string): string {
  const parts = partsFormatter.formatToParts(new Date(iso))
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '00'
  const hour = get('hour') === '24' ? '00' : get('hour')
  return `${get('year')}-${get('month')}-${get('day')}T${hour}:${get('minute')}`
}

/** Convierte un valor "YYYY-MM-DDTHH:mm" interpretado en hora de Argentina (UTC-3) a un ISO string en UTC. */
export function fromArgentinaDateTimeLocal(value: string): string {
  return new Date(`${value}:00-03:00`).toISOString()
}

export function formatCountdown(targetIso: string): string {
  const diff = new Date(targetIso).getTime() - Date.now()
  if (diff <= 0) return '¡Ya arrancó!'
  const totalSeconds = Math.floor(diff / 1000)
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  if (days > 0) return `${days}d ${hours}h ${minutes}m`
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`
  return `${minutes}m ${seconds}s`
}
