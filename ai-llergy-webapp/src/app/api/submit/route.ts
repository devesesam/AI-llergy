import { NextRequest, NextResponse } from "next/server";
import type { SelectedAllergen, CustomTag, SeverityType } from "@/lib/allergens";
import { ALLERGEN_TO_COLUMN, getAllergenById } from "@/lib/allergens";
import { getMenu, getCacheStatus, getAvailableColumns } from "@/lib/menu-service";
import {
  filterMenu,
  filterMenuWithConfidence,
  hasConfidenceScores,
  formatWarnings,
  FilteredItem,
} from "@/lib/filter-menu";
import { filterMenuWithAI } from "@/lib/ai-filter";
import type { AllergenWithSeverity } from "@/lib/confidence";

interface SubmissionBody {
  allergens: SelectedAllergen[];
  customAllergenIds?: string[];
  customTags?: CustomTag[];
}

export interface MenuResponse {
  success: boolean;
  safeItems: Array<{
    name: string;
    ingredients: string;
    price: number;
    warnings: string[];
  }>;
  cautionItems: Array<{
    name: string;
    ingredients: string;
    price: number;
    warnings: string[];
  }>;
  excludedCount: number;
  meta: {
    totalItems: number;
    allergenFilters: string[];
    cacheStatus: { cached: boolean; age: number };
  };
}

function formatItem(item: FilteredItem, useAIWarnings: boolean = false) {
  return {
    name: item.item.name,
    ingredients: item.item.ingredients,
    price: item.item.price,
    // AI warnings are already formatted strings; standard warnings need formatting
    warnings: useAIWarnings ? item.warnings : formatWarnings(item.warnings),
  };
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const body: SubmissionBody = await request.json();
    const { allergens, customAllergenIds, customTags } = body;

    // Validate input
    if (!Array.isArray(allergens)) {
      return NextResponse.json(
        { error: "allergens must be an array" },
        { status: 400 }
      );
    }

    // Extract allergen IDs and preserve severity for confidence-based filtering
    const allergenIds = allergens.map((a: SelectedAllergen) => a.id);

    // Preserve allergens with severity for confidence-based filtering
    const allergensWithSeverity: AllergenWithSeverity[] = allergens.map((a) => ({
      id: a.id,
      type: a.type || "preference", // Default to preference if not specified
    }));

    // Combine button selections with custom allergen IDs (already validated tags)
    const allAllergens = [...allergenIds];

    // Add custom allergen IDs (these were validated client-side via autocomplete/AI)
    if (customAllergenIds && Array.isArray(customAllergenIds)) {
      for (const id of customAllergenIds) {
        if (!allAllergens.includes(id)) {
          allAllergens.push(id);
        }
      }
    }

    // Get menu (from cache or fresh)
    const menu = await getMenu();
    const cacheStatus = getCacheStatus();

    // Get available columns to determine which allergens need AI filtering
    const availableColumns = getAvailableColumns();

    // Split allergens into those with columns vs those needing AI
    const columnAllergens: string[] = [];
    const aiAllergens: string[] = [];

    for (const id of allAllergens) {
      const columnName = ALLERGEN_TO_COLUMN[id];
      if (columnName && availableColumns.has(columnName)) {
        columnAllergens.push(id);
      } else {
        aiAllergens.push(id);
      }
    }

    // Check if we have custom tags
    const hasCustomTags = customTags && Array.isArray(customTags) && customTags.length > 0;

    // Check if we need AI filtering (missing columns OR custom tags)
    const needsAI = aiAllergens.length > 0 || hasCustomTags;

    // Check if menu has pre-computed confidence scores (Supabase venues)
    const useConfidenceFiltering = hasConfidenceScores(menu);

    let result;

    if (useConfidenceFiltering && !needsAI) {
      // CONFIDENCE PATH: Use pre-computed confidence scores with severity thresholds
      // This is for Supabase venues with allergen_confidence data
      console.log(`[route] Using confidence-based filtering with severity thresholds`);
      result = filterMenuWithConfidence(menu, allergensWithSeverity);
    } else if (!needsAI) {
      // FAST PATH: All allergens have columns, use column-based filtering only
      // This is for Google Sheets venues
      result = filterMenu(menu, columnAllergens);
    } else {
      // HYBRID PATH: Some allergens missing columns OR we have custom tags

      // Step 1: Column-based filtering FIRST (reduces item count)
      let reducedMenu = menu;
      let columnExcludedCount = 0;

      if (columnAllergens.length > 0) {
        const columnResult = filterMenu(menu, columnAllergens);
        columnExcludedCount = columnResult.excludedCount;
        // Get items that passed column filtering (safe + caution)
        reducedMenu = [
          ...columnResult.safeItems.map(f => f.item),
          ...columnResult.cautionItems.map(f => f.item)
        ];
        console.log(`[route] Column filtering: ${menu.length} → ${reducedMenu.length} items (excluded ${columnExcludedCount})`);
      }

      // Step 2: Build AI tags from missing-column allergens + custom tags
      const allAITags: CustomTag[] = [];

      // Convert missing-column allergens to CustomTag format
      for (const id of aiAllergens) {
        const allergen = getAllergenById(id);
        allAITags.push({
          id: `pending_${id}`,
          text: allergen?.label || id,
          displayLabel: allergen?.label || id
        });
      }

      // Add user's custom tags
      if (hasCustomTags) {
        allAITags.push(...customTags!);
      }

      console.log(`[route] AI filtering ${reducedMenu.length} items for:`, allAITags.map(t => t.displayLabel));

      // Step 3: AI filtering on the reduced list
      const aiResult = await filterMenuWithAI(reducedMenu, [], allAITags);

      // Combine excluded counts
      result = {
        safeItems: aiResult.safeItems,
        cautionItems: aiResult.cautionItems,
        excludedCount: columnExcludedCount + aiResult.excludedCount
      };
    }

    const response: MenuResponse = {
      success: true,
      safeItems: result.safeItems.map(item => formatItem(item, needsAI)),
      cautionItems: result.cautionItems.map(item => formatItem(item, needsAI)),
      excludedCount: result.excludedCount,
      meta: {
        totalItems: menu.length,
        allergenFilters: allAllergens,
        cacheStatus: {
          cached: cacheStatus.cached,
          age: cacheStatus.age,
        },
      },
    };

    console.log(`Menu filtered in ${Date.now() - startTime}ms:`, {
      allergens: allAllergens,
      columnAllergens,
      aiAllergens,
      customTags: customTags?.map(t => t.text) || [],
      usedAI: needsAI,
      usedConfidenceFiltering: useConfidenceFiltering,
      safeCount: result.safeItems.length,
      cautionCount: result.cautionItems.length,
      excludedCount: result.excludedCount,
    });

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error processing allergen submission:", error);
    return NextResponse.json(
      { error: "Failed to process submission" },
      { status: 500 }
    );
  }
}
