/**
 * Confidence-based filtering system
 * Uses severity levels to set confidence thresholds for allergen filtering
 */

import type { SeverityType } from "./allergens";

/**
 * Confidence thresholds based on allergen severity
 * - preference: Low bar (>25%) - show most items, user just prefers to avoid
 * - allergy: High bar (>80%) - must be fairly certain the item is safe
 * - life_threatening: Near certainty (>95%) - only show explicitly safe items
 */
export const SEVERITY_THRESHOLDS: Record<SeverityType, number> = {
  preference: 0.25,
  allergy: 0.80,
  life_threatening: 0.95,
} as const;

/**
 * Default confidence when no allergen data is available
 * 30% means:
 * - Preference (>25%): Items show as safe
 * - Allergy (>80%): Items are excluded
 * - Life-threatening (>95%): Items are excluded
 */
export const DEFAULT_NO_DATA_CONFIDENCE = 0.30;

/**
 * Cross-contamination risk level adjustments
 * Applied to base confidence scores
 */
export const CROSS_CONTAMINATION_ADJUSTMENTS: Record<string, number> = {
  none: 0.20,    // Dedicated equipment - boost confidence
  low: 0.10,    // Separate prep areas - small boost
  medium: 0.00,  // Standard kitchen - no adjustment
  high: -0.20,   // Shared equipment - penalty
} as const;

export type CrossContaminationRisk = "none" | "low" | "medium" | "high";

/**
 * Allergen with severity for filtering
 */
export interface AllergenWithSeverity {
  id: string;
  type: SeverityType;
}

/**
 * Stored confidence scores per allergen for a menu item
 * Values are 0-1 representing probability item is FREE of that allergen
 */
export interface AllergenConfidenceMap {
  [allergenId: string]: number;
}

/**
 * Determine filter category based on confidence vs threshold
 */
export function getFilterCategory(
  confidence: number,
  threshold: number
): "safe" | "caution" | "excluded" {
  if (confidence >= threshold) {
    return "safe";
  } else if (confidence >= threshold * 0.8) {
    return "caution";
  } else {
    return "excluded";
  }
}

/**
 * Clamp confidence value between 0 and 1
 */
export function clampConfidence(value: number): number {
  return Math.max(0, Math.min(1, value));
}
