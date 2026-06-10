// Probabilidades estimadas de cada partido a partir del campo `rating` de
// cada selección (un valor tipo ranking FIFA cargado en src/data/seedData.ts).
// Es solo una estimación informativa para ayudarte a pronosticar, no se usa
// para calcular puntos ni nada del prode.

export interface MatchProbabilities {
  home: number
  draw: number
  away: number
}

/** Reparte 100 puntos entre los valores dados, redondeando sin perder el total. */
function distributeHundred(values: number[]): number[] {
  const floors = values.map((v) => Math.floor(v))
  const remainder = 100 - floors.reduce((sum, v) => sum + v, 0)
  const order = values
    .map((v, i) => ({ i, frac: v - Math.floor(v) }))
    .sort((a, b) => b.frac - a.frac)
  const result = [...floors]
  for (let k = 0; k < remainder; k++) {
    result[order[k % order.length].i]++
  }
  return result
}

/** Calcula probabilidades de victoria local / empate / victoria visitante a partir del rating de cada selección. */
export function calculateProbabilities(homeRating: number, awayRating: number): MatchProbabilities {
  const diff = homeRating - awayRating
  const expectedHome = 1 / (1 + 10 ** (-diff / 400))
  const drawProb = Math.max(0.18, 0.3 - Math.abs(diff) / 1000)
  const homeProb = expectedHome * (1 - drawProb)
  const awayProb = (1 - expectedHome) * (1 - drawProb)

  const [home, draw, away] = distributeHundred([homeProb * 100, drawProb * 100, awayProb * 100])
  return { home, draw, away }
}
