// Generates supabase/seed.sql with the 48 World Cup 2026 teams and the
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

const groupLetters = Object.keys(groups) // A..L

// --- Teams ---
const teamRows = []
const teamId = {} // "A1".."L4" -> numeric id
let id = 1
for (const letter of groupLetters) {
  groups[letter].forEach((name, idx) => {
    teamId[`${letter}${idx + 1}`] = id
    const flag = flags[name].replace(/'/g, "''")
    const escName = name.replace(/'/g, "''")
    teamRows.push(`(${id}, '${escName}', '${flag}', '${letter}')`)
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

const matchRows = []
let matchId = 1

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
      kickoffA = dateUTC(2026, 6, day, 13 + slot * 3)
      kickoffB = dateUTC(2026, 6, day, 13 + slot * 3)
    } else if (md === 1) {
      // Matchday 2: Jun 17 (A-D), Jun 18 (E-H), Jun 19 (I-L)
      const day = 17 + Math.floor(g / 4)
      const slot = g % 4
      kickoffA = dateUTC(2026, 6, day, 13 + slot * 3)
      kickoffB = dateUTC(2026, 6, day, 13 + slot * 3)
    } else {
      // Matchday 3: Jun 24 (A-C), Jun 25 (D-F), Jun 26 (G-I), Jun 27 (J-L)
      // Both matches of the same group kick off simultaneously.
      const day = 24 + Math.floor(g / 3)
      const slot = g % 3
      const ko = dateUTC(2026, 6, day, 14 + slot * 3)
      kickoffA = ko
      kickoffB = ko
    }

    matchRows.push(
      `(${matchId}, 'group', '${letter}', ${md + 1}, ${homeA}, ${awayA}, null, null, null, '${kickoffA}', null, null, 'scheduled')`
    )
    matchId++
    matchRows.push(
      `(${matchId}, 'group', '${letter}', ${md + 1}, ${homeB}, ${awayB}, null, null, null, '${kickoffB}', null, null, 'scheduled')`
    )
    matchId++
  }
}

// --- Knockout stage placeholders (32) ---
// Self-consistent single-elimination bracket (R32 -> R16 -> QF -> SF -> Final),
// independent of the final FIFA cross-group bracket assignment. Update teams
// via the admin panel once group standings (and FIFA's official bracket) are known.
const koRows = []

// Round of 32: matches 73-88 (16), Jun 28 - Jul 3
for (let n = 1; n <= 16; n++) {
  const dayOffset = Math.floor(((n - 1) * 6) / 16) // 0..5 -> Jun 28..Jul 3
  const day = 28 + dayOffset
  const month = day <= 30 ? 6 : 7
  const realDay = day <= 30 ? day : day - 30
  const slot = (n - 1) % 4
  const ko = dateUTC(2026, month, realDay, 12 + slot * 3)
  koRows.push(
    `(${matchId}, 'r32', null, null, null, null, 'Por definir', 'Por definir', null, '${ko}', null, null, 'scheduled')`
  )
  matchId++
}

// Round of 16: matches 89-96 (8), Jul 4-7, two per day
for (let n = 1; n <= 8; n++) {
  const day = 4 + Math.floor((n - 1) / 2)
  const slot = (n - 1) % 2
  const ko = dateUTC(2026, 7, day, 15 + slot * 4)
  const r32a = 73 + (n - 1) * 2
  const r32b = r32a + 1
  koRows.push(
    `(${matchId}, 'r16', null, null, null, null, 'Ganador Partido ${r32a}', 'Ganador Partido ${r32b}', null, '${ko}', null, null, 'scheduled')`
  )
  matchId++
}

// Quarterfinals: matches 97-100 (4), Jul 9-10, two per day
for (let n = 1; n <= 4; n++) {
  const day = 9 + Math.floor((n - 1) / 2)
  const slot = (n - 1) % 2
  const ko = dateUTC(2026, 7, day, 15 + slot * 4)
  const r16a = 89 + (n - 1) * 2
  const r16b = r16a + 1
  koRows.push(
    `(${matchId}, 'qf', null, null, null, null, 'Ganador Partido ${r16a}', 'Ganador Partido ${r16b}', null, '${ko}', null, null, 'scheduled')`
  )
  matchId++
}

// Semifinals: matches 101-102, Jul 14 and Jul 15
for (let n = 1; n <= 2; n++) {
  const day = 14 + (n - 1)
  const ko = dateUTC(2026, 7, day, 19)
  const qfa = 97 + (n - 1) * 2
  const qfb = qfa + 1
  koRows.push(
    `(${matchId}, 'sf', null, null, null, null, 'Ganador Partido ${qfa}', 'Ganador Partido ${qfb}', null, '${ko}', null, null, 'scheduled')`
  )
  matchId++
}

// Third place: match 103, Jul 18
{
  const ko = dateUTC(2026, 7, 18, 16)
  koRows.push(
    `(${matchId}, '3rd', null, null, null, null, 'Perdedor Partido 101', 'Perdedor Partido 102', null, '${ko}', null, null, 'scheduled')`
  )
  matchId++
}

// Final: match 104, Jul 19
{
  const ko = dateUTC(2026, 7, 19, 16)
  koRows.push(
    `(${matchId}, 'final', null, null, null, null, 'Ganador Partido 101', 'Ganador Partido 102', null, '${ko}', null, null, 'scheduled')`
  )
  matchId++
}

const sql = `-- =========================================================
-- Prode Mundial 2026 - Datos iniciales (equipos + fixture)
-- Generado por scripts/generate-seed.mjs - editable desde /admin
-- =========================================================

insert into public.teams (id, name, flag, group_letter) values
${teamRows.join(',\n')}
on conflict (id) do nothing;

insert into public.matches (id, phase, group_letter, matchday, home_team_id, away_team_id, home_placeholder, away_placeholder, venue, kickoff_at, home_score, away_score, status) values
${[...matchRows, ...koRows].join(',\n')}
on conflict (id) do nothing;
`

writeFileSync(new URL('../supabase/seed.sql', import.meta.url), sql)
console.log(`Generated ${teamRows.length} teams and ${matchRows.length + koRows.length} matches.`)
