import { formatDateChip } from '../lib/format'
import type { Match } from '../types'

interface Props {
  groupedByDate: [string, Match[]][]
  today: string
  activeKey: string | null
  onSelect: (key: string) => void
}

export default function DateChipSelector({ groupedByDate, today, activeKey, onSelect }: Props) {
  return (
    <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2">
      {groupedByDate.map(([key, dayMatches]) => {
        const { weekday, day, month } = formatDateChip(dayMatches[0].kickoff_at)
        const isToday = key === today
        const isActive = key === activeKey
        return (
          <button
            key={key}
            onClick={() => onSelect(key)}
            className={`flex shrink-0 flex-col items-center gap-0.5 rounded-xl border px-3 py-2 transition-all ${
              isActive
                ? 'border-primary bg-gradient-to-b from-primary to-primary-dark text-white shadow-sm'
                : 'border-slate-200 bg-white text-slate-600 hover:border-primary/40 hover:bg-emerald-50'
            }`}
          >
            <span className={`text-[10px] font-semibold uppercase tracking-wide ${isActive ? 'text-emerald-100' : 'text-slate-400'}`}>
              {weekday}
            </span>
            <span className="text-lg font-bold leading-tight">{day}</span>
            <span className={`text-[10px] uppercase ${isActive ? 'text-emerald-100' : 'text-slate-400'}`}>{month}</span>
            <span
              className={`mt-0.5 h-1.5 w-1.5 rounded-full ${
                isToday ? (isActive ? 'bg-accent' : 'bg-accent-dark') : 'bg-transparent'
              }`}
              aria-hidden
            />
          </button>
        )
      })}
    </div>
  )
}
