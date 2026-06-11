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

export function formatKickoff(iso: string): string {
  return dateFormatter.format(new Date(iso))
}

export function formatDay(iso: string): string {
  const label = dayFormatter.format(new Date(iso))
  return label.charAt(0).toUpperCase() + label.slice(1)
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
