import type { Concept, HazardRatingFields } from "../App"

type RatingSource = Partial<Pick<Concept, keyof HazardRatingFields>> | HazardRatingFields

/** A concept's hazard ratings as edit-form values; "" means not set. */
export function hazardRatingOf(concept: RatingSource): HazardRatingFields {
  return {
    haraSeverity: concept.haraSeverity || "",
    haraExposure: concept.haraExposure || "",
    haraControllability: concept.haraControllability || "",
    plrSeverity: concept.plrSeverity || "",
    plrFrequency: concept.plrFrequency || "",
    plrAvoidance: concept.plrAvoidance || "",
  }
}

/** A concept's hazard ratings as API values; null means not set (or cleared). */
export function hazardRatingFieldsOrNull(concept: RatingSource) {
  return {
    haraSeverity: concept.haraSeverity || null,
    haraExposure: concept.haraExposure || null,
    haraControllability: concept.haraControllability || null,
    plrSeverity: concept.plrSeverity || null,
    plrFrequency: concept.plrFrequency || null,
    plrAvoidance: concept.plrAvoidance || null,
  }
}
