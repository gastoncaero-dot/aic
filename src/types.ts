export type MatchPhase = 'group' | 'r32' | 'r16' | 'qf' | 'sf' | '3rd' | 'final'
export type MatchStatus = 'scheduled' | 'finished'

export const PHASE_LABELS: Record<MatchPhase, string> = {
  group: 'Fase de grupos',
  r32: 'Dieciseisavos de final',
  r16: 'Octavos de final',
  qf: 'Cuartos de final',
  sf: 'Semifinal',
  '3rd': 'Tercer puesto',
  final: 'Final',
}

export interface Team {
  id: number
  name: string
  flag: string
  group_letter: string | null
  rating: number
}

export interface Match {
  id: number
  phase: MatchPhase
  group_letter: string | null
  matchday: number | null
  home_team_id: number | null
  away_team_id: number | null
  home_placeholder: string | null
  away_placeholder: string | null
  venue: string | null
  kickoff_at: string
  lock_at: string
  home_score: number | null
  away_score: number | null
  status: MatchStatus
}

export interface Profile {
  id: string
  username: string
  is_admin: boolean
  created_at: string
}

export interface League {
  id: string
  name: string
  code: string
  owner_id: string
  member_ids: string[]
  created_at: string
}

export interface Prediction {
  user_id: string
  match_id: number
  home_score: number
  away_score: number
  updated_at: string
}

export interface SpecialPrediction {
  user_id: string
  champion_team_id: number | null
  runner_up_team_id: number | null
  top_scorer: string | null
  updated_at: string
}

export interface AppSettings {
  special_predictions_lock_at: string
  champion_team_id: number | null
  runner_up_team_id: number | null
  top_scorer: string | null
  prediction_lock_minutes?: number
}

export interface UserTotals {
  user_id: string
  username: string
  match_points: number
  exact_count: number
  hit_count: number
  special_points: number
  champion_hit: boolean
  total_points: number
}
