import type { Team } from '../types'

export default function TeamLabel({
  team,
  placeholder,
  align = 'left',
}: {
  team?: Team | null
  placeholder?: string | null
  align?: 'left' | 'right'
}) {
  const content = team ? (
    <>
      <span className="text-xl leading-none" aria-hidden>
        {team.flag}
      </span>
      <span className="truncate font-medium text-slate-800">{team.name}</span>
    </>
  ) : (
    <span className="truncate text-sm italic text-slate-400">{placeholder ?? 'Por definir'}</span>
  )

  return (
    <div className={`flex min-w-0 flex-1 items-center gap-2 ${align === 'right' ? 'flex-row-reverse text-right' : ''}`}>
      {content}
    </div>
  )
}
