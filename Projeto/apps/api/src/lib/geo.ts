/**
 * Geo proximity helpers for search ranking.
 *
 * Regions in our platform correspond to Brazilian state capitals / major cities.
 * We score proximity in 3 tiers:
 *   SAME_CITY   = 100  (exact city match within same region)
 *   SAME_REGION = 50   (same state/metro area)
 *   SAME_MACRO  = 20   (same macro-region: Sul, Sudeste, Nordeste, etc.)
 *   DIFFERENT   = 0
 */
import { sql, type SQL } from "drizzle-orm"

export const PROXIMITY_SCORES = {
  SAME_CITY: 100,
  SAME_REGION: 50,
  SAME_MACRO: 20,
  DIFFERENT: 0,
} as const

/**
 * Maps each platform "region" (state capital / major metro) to its Brazilian macro-region.
 * Intentionally exhaustive for the regions used in the platform.
 */
export const REGION_TO_MACRO: Record<string, string> = {
  // Sudeste
  "São Paulo":      "Sudeste",
  "Rio de Janeiro": "Sudeste",
  "Belo Horizonte": "Sudeste",
  "Vitória":        "Sudeste",
  // Sul
  "Curitiba":       "Sul",
  "Porto Alegre":   "Sul",
  "Florianópolis":  "Sul",
  // Nordeste
  "Salvador":       "Nordeste",
  "Recife":         "Nordeste",
  "Fortaleza":      "Nordeste",
  "Natal":          "Nordeste",
  "João Pessoa":    "Nordeste",
  "Maceió":         "Nordeste",
  "Aracaju":        "Nordeste",
  "São Luís":       "Nordeste",
  "Teresina":       "Nordeste",
  // Norte
  "Manaus":         "Norte",
  "Belém":          "Norte",
  "Porto Velho":    "Norte",
  "Macapá":         "Norte",
  "Boa Vista":      "Norte",
  "Rio Branco":     "Norte",
  "Palmas":         "Norte",
  // Centro-Oeste
  "Brasília":       "Centro-Oeste",
  "Goiânia":        "Centro-Oeste",
  "Campo Grande":   "Centro-Oeste",
  "Cuiabá":         "Centro-Oeste",
}

export function getMacroRegion(region: string | null | undefined): string | null {
  if (!region) return null
  return REGION_TO_MACRO[region] ?? null
}

/**
 * Returns all platform regions that share the same macro-region as `region`.
 * Used to build SQL IN(...) clauses for proximity scoring.
 */
export function getRegionsInSameMacro(region: string | null | undefined): string[] {
  const macro = getMacroRegion(region)
  if (!macro) return []
  return Object.entries(REGION_TO_MACRO)
    .filter(([, m]) => m === macro)
    .map(([r]) => r)
}

/**
 * Builds a Drizzle SQL expression for proximity-based ranking score.
 *
 * Returns a SQL<number> used in ORDER BY (higher = closer to viewer).
 * Falls back to 0 (no boost) when viewer location is unknown.
 *
 * @param regionCol    - Drizzle column for the candidate's region
 * @param cityCol      - Drizzle column for the candidate's city
 * @param viewerRegion - The viewer's region (from their profile)
 * @param viewerCity   - The viewer's city (from their profile)
 * @param sameRegions  - All regions in same macro-region as viewer
 */
export function buildProximityScore(
  regionCol: SQL | { getSQL(): SQL } | unknown,
  cityCol: SQL | { getSQL(): SQL } | unknown,
  viewerRegion: string | null | undefined,
  viewerCity: string | null | undefined,
  sameRegions: string[]
): SQL<number> | null {
  if (!viewerRegion) return null

  const vRegion = viewerRegion
  const vCity   = viewerCity ?? null

  if (vCity && sameRegions.length > 0) {
    return sql<number>`CASE
      WHEN ${regionCol as SQL} = ${vRegion} AND ${cityCol as SQL} = ${vCity} THEN ${PROXIMITY_SCORES.SAME_CITY}
      WHEN ${regionCol as SQL} = ${vRegion}                                  THEN ${PROXIMITY_SCORES.SAME_REGION}
      WHEN ${regionCol as SQL} IN ${sql`(${sql.join(sameRegions.map((r) => sql`${r}`), sql`, `)})`}  THEN ${PROXIMITY_SCORES.SAME_MACRO}
      ELSE ${PROXIMITY_SCORES.DIFFERENT}
    END`
  }

  if (vCity) {
    return sql<number>`CASE
      WHEN ${regionCol as SQL} = ${vRegion} AND ${cityCol as SQL} = ${vCity} THEN ${PROXIMITY_SCORES.SAME_CITY}
      WHEN ${regionCol as SQL} = ${vRegion}                                  THEN ${PROXIMITY_SCORES.SAME_REGION}
      ELSE ${PROXIMITY_SCORES.DIFFERENT}
    END`
  }

  if (sameRegions.length > 0) {
    return sql<number>`CASE
      WHEN ${regionCol as SQL} = ${vRegion} THEN ${PROXIMITY_SCORES.SAME_REGION}
      WHEN ${regionCol as SQL} IN ${sql`(${sql.join(sameRegions.map((r) => sql`${r}`), sql`, `)})`} THEN ${PROXIMITY_SCORES.SAME_MACRO}
      ELSE ${PROXIMITY_SCORES.DIFFERENT}
    END`
  }

  return sql<number>`CASE
    WHEN ${regionCol as SQL} = ${vRegion} THEN ${PROXIMITY_SCORES.SAME_REGION}
    ELSE ${PROXIMITY_SCORES.DIFFERENT}
  END`
}
