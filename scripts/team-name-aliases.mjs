/**
 * Mapeo entre los nombres de selecciones usados en este proyecto (campo
 * `name` de la colección `teams`, en español) y los nombres que devuelve
 * la API de football-data.org para el Mundial 2026. Si un equipo no aparece
 * acá se usa su propio nombre como único alias.
 *
 * Si en los logs del workflow ves "no matchea ningún equipo de la API" para
 * una selección, agregá o corregí el alias correspondiente acá (podés ver
 * los nombres exactos que devuelve la API consultando
 * https://api.football-data.org/v4/competitions/WC/matches con tu API key
 * en el header X-Auth-Token).
 */
export const TEAM_NAME_ALIASES = {
  'México': ['Mexico'],
  'Sudáfrica': ['South Africa'],
  'Corea del Sur': ['South Korea', 'Korea Republic', 'Korea Rep.'],
  'República Checa': ['Czech Republic', 'Czechia'],
  'Canadá': ['Canada'],
  'Bosnia y Herzegovina': ['Bosnia and Herzegovina', 'Bosnia & Herzegovina', 'Bosnia-Herzegovina'],
  'Qatar': ['Qatar'],
  'Suiza': ['Switzerland'],
  'Brasil': ['Brazil'],
  'Marruecos': ['Morocco'],
  'Haití': ['Haiti'],
  'Escocia': ['Scotland'],
  'Estados Unidos': ['USA', 'United States', 'United States of America'],
  'Paraguay': ['Paraguay'],
  'Australia': ['Australia'],
  'Turquía': ['Turkey', 'Türkiye'],
  'Alemania': ['Germany'],
  'Curazao': ['Curacao', 'Curaçao'],
  'Costa de Marfil': ['Ivory Coast', "Côte d'Ivoire", "Cote d'Ivoire"],
  'Ecuador': ['Ecuador'],
  'Países Bajos': ['Netherlands', 'Holland'],
  'Japón': ['Japan'],
  'Suecia': ['Sweden'],
  'Túnez': ['Tunisia'],
  'Bélgica': ['Belgium'],
  'Egipto': ['Egypt'],
  'Irán': ['IR Iran', 'Iran'],
  'Nueva Zelanda': ['New Zealand'],
  'España': ['Spain'],
  'Cabo Verde': ['Cape Verde', 'Cape Verde Islands'],
  'Arabia Saudita': ['Saudi Arabia'],
  'Uruguay': ['Uruguay'],
  'Francia': ['France'],
  'Senegal': ['Senegal'],
  'Irak': ['Iraq'],
  'Noruega': ['Norway'],
  'Argentina': ['Argentina'],
  'Argelia': ['Algeria'],
  'Austria': ['Austria'],
  'Jordania': ['Jordan'],
  'Portugal': ['Portugal'],
  'RD Congo': ['DR Congo', 'Congo DR', 'Democratic Republic of the Congo'],
  'Uzbekistán': ['Uzbekistan'],
  'Colombia': ['Colombia'],
  'Inglaterra': ['England'],
  'Croacia': ['Croatia'],
  'Ghana': ['Ghana'],
  'Panamá': ['Panama'],
}

/** Normaliza un nombre para comparar sin acentos, mayúsculas ni espacios/puntuación. */
export function normalizeTeamName(name) {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}

/** Devuelve true si `apiName` (nombre devuelto por la API) corresponde a `ourName` (nuestro equipo). */
export function isSameTeam(ourName, apiName) {
  const candidates = TEAM_NAME_ALIASES[ourName] ?? [ourName]
  const normalizedApiName = normalizeTeamName(apiName)
  return candidates.some((candidate) => normalizeTeamName(candidate) === normalizedApiName)
}
