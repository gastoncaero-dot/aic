// Generates src/data/seedData.ts with the 48 World Cup 2026 teams and the
// 104-match schedule (72 group stage + 32 knockout placeholders).
//
// Group stage dates/times are best-effort placeholders based on the publicly
// announced windows (Matchday 1: Jun 11-13, Matchday 2: Jun 17-19,
// Matchday 3: Jun 24-27, simultaneous within each group). Re-run this script
// after editing the data below if the commissioner needs to correct dates
// against the official FIFA calendar -- or just edit them later from the
// admin panel.
import { writeFileSync } from 'fs'

const groups = {
  A: ['México', 'Sudáfrica', 'Corea del Sur', 'República Checa'],
  B: ['Canadá', 'Bosnia y Herzegovina', 'Qatar', 'Suiza'],
  C: ['Brasil', 'Marruecos', 'Haití', 'Escocia'],
  D: ['Estados Unidos', 'Paraguay', 'Australia', 'Turquía'],
  E: ['Alemania', 'Curazao', 'Costa de Marfil', 'Ecuador'],
  F: ['Países Bajos', 'Japón', 'Suecia', 'Túnez'],
  G: ['Bélgica', 'Egipto', 'Irán', 'Nueva Zelanda'],
  H: ['España', 'Cabo Verde', 'Arabia Saudita', 'Uruguay'],
  I: ['Francia', 'Senegal', 'Irak', 'Noruega'],
  J: ['Argentina', 'Argelia', 'Austria', 'Jordania'],
  K: ['Portugal', 'RD Congo', 'Uzbekistán', 'Colombia'],
  L: ['Inglaterra', 'Croacia', 'Ghana', 'Panamá'],
}

const flags = {
  'México': '🇲🇽', 'Sudáfrica': '🇿🇦', 'Corea del Sur': '🇰🇷', 'República Checa': '🇨🇿',
  'Canadá': '🇨🇦', 'Bosnia y Herzegovina': '🇧🇦', 'Qatar': '🇶🇦', 'Suiza': '🇨🇭',
  'Brasil': '🇧🇷', 'Marruecos': '🇲🇦', 'Haití': '🇭🇹', 'Escocia': '🏴',
  'Estados Unidos': '🇺🇸', 'Paraguay': '🇵🇾', 'Australia': '🇦🇺', 'Turquía': '🇹🇷',
  'Alemania': '🇩🇪', 'Curazao': '🇨🇼', 'Costa de Marfil': '🇨🇮', 'Ecuador': '🇪🇨',
  'Países Bajos': '🇳🇱', 'Japón': '🇯🇵', 'Suecia': '🇸🇪', 'Túnez': '🇹🇳',
  'Bélgica': '🇧🇪', 'Egipto': '🇪🇬', 'Irán': '🇮🇷', 'Nueva Zelanda': '🇳🇿',
  'España': '🇪🇸', 'Cabo Verde': '🇨🇻', 'Arabia Saudita': '🇸🇦', 'Uruguay': '🇺🇾',
  'Francia': '🇫🇷', 'Senegal': '🇸🇳', 'Irak': '🇮🇶', 'Noruega': '🇳🇴',
  'Argentina': '🇦🇷', 'Argelia': '🇩🇿', 'Austria': '🇦🇹', 'Jordania': '🇯🇴',
  'Portugal': '🇵🇹', 'RD Congo': '🇨🇩', 'Uzbekistán': '🇺🇿', 'Colombia': '🇨🇴',
  'Inglaterra': '🏴', 'Croacia': '🇭🇷', 'Ghana': '🇬🇭', 'Panamá': '🇵🇦',
}

// Rating aproximado de cada selección (basado en el ranking FIFA ~2025).
// Se usa solo para estimar las probabilidades informativas de cada partido
// (src/lib/probability.ts), no afecta el puntaje del prode.
const ratings = {
  'México': 1672, 'Sudáfrica': 1330, 'Corea del Sur': 1530, 'República Checa': 1530,
  'Canadá': 1564, 'Bosnia y Herzegovina': 1480, 'Qatar': 1427, 'Suiza': 1623,
  'Brasil': 1776, 'Marruecos': 1694, 'Haití': 1230, 'Escocia': 1556,
  'Estados Unidos': 1652, 'Paraguay': 1545, 'Australia': 1495, 'Turquía': 1560,
  'Alemania': 1716, 'Curazao': 1190, 'Costa de Marfil': 1530, 'Ecuador': 1641,
  'Países Bajos': 1746, 'Japón': 1652, 'Suecia': 1470, 'Túnez': 1500,
  'Bélgica': 1735, 'Egipto': 1517, 'Irán': 1637, 'Nueva Zelanda': 1200,
  'España': 1881, 'Cabo Verde': 1340, 'Arabia Saudita': 1428, 'Uruguay': 1729,
  'Francia': 1862, 'Senegal': 1670, 'Irak': 1310, 'Noruega': 1500,
  'Argentina': 1873, 'Argelia': 1571, 'Austria': 1580, 'Jordania': 1400,
  'Portugal': 1751, 'RD Congo': 1380, 'Uzbekistán': 1300, 'Colombia': 1679,
  'Inglaterra': 1819, 'Croacia': 1698, 'Ghana': 1430, 'Panamá': 1530,
}

const groupLetters = Object.keys(groups) // A..L
const PREDICTION_LOCK_MINUTES = 60

function lockAt(kickoffIso) {
  return new Date(new Date(kickoffIso).getTime() - PREDICTION_LOCK_MINUTES * 60 * 1000).toISOString()
}

// --- Teams ---
const teams = []
const teamId = {} // "A1".."L4" -> numeric id
let id = 1
for (const letter of groupLetters) {
  groups[letter].forEach((name, idx) => {
    teamId[`${letter}${idx + 1}`] = id
    teams.push({ id, name, flag: flags[name], group_letter: letter, rating: ratings[name] })
    id++
  })
}

// --- Group stage matches (72) ---
// Round-robin pattern using positions 1-4 within each group:
// MD1: 1v2, 3v4 | MD2: 1v3, 4v2 | MD3: 4v1, 2v3 (MD3 simultaneous within group)
const pattern = [
  [[1, 2], [3, 4]],
  [[1, 3], [4, 2]],
  [[4, 1], [2, 3]],
]

function dateUTC(y, m, d, h) {
  return new Date(Date.UTC(y, m - 1, d, h, 0, 0)).toISOString()
}

const matches = []
let matchId = 1

function pushMatch(fields) {
  const kickoff_at = fields.kickoff_at
  matches.push({
    id: matchId,
    phase: fields.phase,
    group_letter: fields.group_letter ?? null,
    matchday: fields.matchday ?? null,
    home_team_id: fields.home_team_id ?? null,
    away_team_id: fields.away_team_id ?? null,
    home_placeholder: fields.home_placeholder ?? null,
    away_placeholder: fields.away_placeholder ?? null,
    venue: null,
    kickoff_at,
    lock_at: lockAt(kickoff_at),
    home_score: null,
    away_score: null,
    status: 'scheduled',
  })
  matchId++
}

for (let md = 0; md < 3; md++) {
  for (let g = 0; g < groupLetters.length; g++) {
    const letter = groupLetters[g]
    const [pairA, pairB] = pattern[md]
    const homeA = teamId[`${letter}${pairA[0]}`]
    const awayA = teamId[`${letter}${pairA[1]}`]
    const homeB = teamId[`${letter}${pairB[0]}`]
    const awayB = teamId[`${letter}${pairB[1]}`]

    let kickoffA, kickoffB
    if (md === 0) {
      // Matchday 1: Jun 11 (groups A-D), Jun 12 (E-H), Jun 13 (I-L)
      const day = 11 + Math.floor(g / 4)
      const slot = g % 4
      kickoffA = dateUTC(2026, 6, day, 19 + slot * 3)
      kickoffB = dateUTC(2026, 6, day, 19 + slot * 3)
    } else if (md === 1) {
      // Matchday 2: Jun 17 (A-D), Jun 18 (E-H), Jun 19 (I-L)
      const day = 17 + Math.floor(g / 4)
      const slot = g % 4
      kickoffA = dateUTC(2026, 6, day, 19 + slot * 3)
      kickoffB = dateUTC(2026, 6, day, 19 + slot * 3)
    } else {
      // Matchday 3: Jun 24 (A-C), Jun 25 (D-F), Jun 26 (G-I), Jun 27 (J-L)
      // Both matches of the same group kick off simultaneously.
      const day = 24 + Math.floor(g / 3)
      const slot = g % 3
      const ko = dateUTC(2026, 6, day, 20 + slot * 3)
      kickoffA = ko
      kickoffB = ko
    }

    pushMatch({ phase: 'group', group_letter: letter, matchday: md + 1, home_team_id: homeA, away_team_id: awayA, kickoff_at: kickoffA })
    pushMatch({ phase: 'group', group_letter: letter, matchday: md + 1, home_team_id: homeB, away_team_id: awayB, kickoff_at: kickoffB })
  }
}

// --- Knockout stage placeholders (32) ---
// Self-consistent single-elimination bracket (R32 -> R16 -> QF -> Final),
// independent of the final FIFA cross-group bracket assignment. Update teams
// via the admin panel once group standings (and FIFA's official bracket) are known.

// Round of 32: matches 73-88 (16), Jun 28 - Jul 3
for (let n = 1; n <= 16; n++) {
  const dayOffset = Math.floor(((n - 1) * 6) / 16) // 0..5 -> Jun 28..Jul 3
  const day = 28 + dayOffset
  const month = day <= 30 ? 6 : 7
  const realDay = day <= 30 ? day : day - 30
  const slot = (n - 1) % 4
  const ko = dateUTC(2026, month, realDay, 18 + slot * 3)
  pushMatch({ phase: 'r32', kickoff_at: ko, home_placeholder: 'Por definir', away_placeholder: 'Por definir' })
}

// Round of 16: matches 89-96 (8), Jul 4-7, two per day
for (let n = 1; n <= 8; n++) {
  const day = 4 + Math.floor((n - 1) / 2)
  const slot = (n - 1) % 2
  const ko = dateUTC(2026, 7, day, 21 + slot * 4)
  const r32a = 73 + (n - 1) * 2
  const r32b = r32a + 1
  pushMatch({ phase: 'r16', kickoff_at: ko, home_placeholder: `Ganador Partido ${r32a}`, away_placeholder: `Ganador Partido ${r32b}` })
}

// Quarterfinals: matches 97-100 (4), Jul 9-10, two per day
for (let n = 1; n <= 4; n++) {
  const day = 9 + Math.floor((n - 1) / 2)
  const slot = (n - 1) % 2
  const ko = dateUTC(2026, 7, day, 21 + slot * 4)
  const r16a = 89 + (n - 1) * 2
  const r16b = r16a + 1
  pushMatch({ phase: 'qf', kickoff_at: ko, home_placeholder: `Ganador Partido ${r16a}`, away_placeholder: `Ganador Partido ${r16b}` })
}

// Semifinals: matches 101-102, Jul 14 and Jul 15
for (let n = 1; n <= 2; n++) {
  const day = 14 + (n - 1)
  const ko = dateUTC(2026, 7, day, 25)
  const qfa = 97 + (n - 1) * 2
  const qfb = qfa + 1
  pushMatch({ phase: 'sf', kickoff_at: ko, home_placeholder: `Ganador Partido ${qfa}`, away_placeholder: `Ganador Partido ${qfb}` })
}

// Third place: match 103, Jul 18
pushMatch({ phase: '3rd', kickoff_at: dateUTC(2026, 7, 18, 22), home_placeholder: 'Perdedor Partido 101', away_placeholder: 'Perdedor Partido 102' })

// Final: match 104, Jul 19
pushMatch({ phase: 'final', kickoff_at: dateUTC(2026, 7, 19, 22), home_placeholder: 'Ganador Partido 101', away_placeholder: 'Ganador Partido 102' })

const ts = `// Datos iniciales (48 equipos + 104 partidos) del Prode Mundial 2026.
// Generado por scripts/generate-seed.mjs - se carga una sola vez desde el
// panel de Admin (botón "Cargar datos iniciales") y luego se edita desde ahí.
import type { Match, Team } from '../types'

export const seedTeams: Team[] = ${JSON.stringify(teams, null, 2)}

export const seedMatches: Match[] = ${JSON.stringify(matches, null, 2)}
`

writeFileSync(new URL('../src/data/seedData.ts', import.meta.url), ts)
console.log(`Generated ${teams.length} teams and ${matches.length} matches.`)
