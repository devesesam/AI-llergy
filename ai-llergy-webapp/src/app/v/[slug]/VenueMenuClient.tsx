'use client'

import { useState, useMemo } from 'react'
import Image from 'next/image'
import AllergenGrid from '@/components/AllergenGrid'
import MenuResults from '@/components/MenuResults'
import AutocompleteInput from '@/components/AutocompleteInput'
import { Allergen, SelectedAllergen, CustomTag, ALL_FILTERS } from '@/lib/allergens'
import type { MenuItem as DbMenuItem } from '@/lib/supabase/types'

interface Venue {
  id: string
  name: string
  slug: string
}

interface MenuItemData {
  name: string
  ingredients: string
  price: number
  warnings: string[]
}

interface ResultsData {
  safeItems: MenuItemData[]
  cautionItems: MenuItemData[]
  excludedCount: number
}

interface VenueMenuClientProps {
  venue: Venue
  menuItems: DbMenuItem[]
}

export default function VenueMenuClient({ venue, menuItems }: VenueMenuClientProps) {
  const [pendingAllergenIds, setPendingAllergenIds] = useState<string[]>([])
  const [customAllergenIds, setCustomAllergenIds] = useState<string[]>([])
  const [customTags, setCustomTags] = useState<CustomTag[]>([])
  const [hasInputText, setHasInputText] = useState(false)
  const [results, setResults] = useState<ResultsData | null>(null)

  // Handle allergen click - simple toggle
  const handleAllergenClick = (allergen: Allergen) => {
    setPendingAllergenIds(prev => {
      if (prev.includes(allergen.id)) {
        return prev.filter(id => id !== allergen.id)
      } else {
        return [...prev, allergen.id]
      }
    })
  }

  const handleAddCustomAllergen = (id: string) => {
    if (!customAllergenIds.includes(id)) {
      setCustomAllergenIds((prev) => [...prev, id])
    }
  }

  const handleRemoveCustomAllergen = (id: string) => {
    setCustomAllergenIds((prev) => prev.filter((i) => i !== id))
  }

  const handleAddCustomTag = (tag: CustomTag) => {
    if (!customTags.some(t => t.text.toLowerCase() === tag.text.toLowerCase())) {
      setCustomTags(prev => [...prev, tag])
    }
  }

  const handleRemoveCustomTag = (tagId: string) => {
    setCustomTags(prev => prev.filter(t => t.id !== tagId))
  }

  // Filter menu items locally based on selected allergens
  const filterMenuItems = useMemo(() => {
    if (pendingAllergenIds.length === 0 && customAllergenIds.length === 0 && customTags.length === 0) {
      return null
    }

    const allSelectedIds = [...pendingAllergenIds, ...customAllergenIds]
    const safeItems: MenuItemData[] = []
    const cautionItems: MenuItemData[] = []
    let excludedCount = 0

    for (const item of menuItems) {
      const profile = item.allergen_profile as Record<string, boolean> || {}
      const warnings: string[] = []
      let isSafe = true

      // Check each selected allergen
      for (const allergenId of allSelectedIds) {
        const allergenKey = `${allergenId}_free`
        const allergenInfo = ALL_FILTERS.find(a => a.id === allergenId)
        const allergenLabel = allergenInfo?.label || allergenId

        if (profile[allergenKey] === true) {
          // Item is safe for this allergen
        } else if (profile[allergenKey] === false) {
          // Item is NOT safe
          isSafe = false
          break
        } else {
          // Unknown - mark as caution
          warnings.push(`Check for ${allergenLabel}`)
        }
      }

      // Check custom tags against ingredients
      if (isSafe && customTags.length > 0 && item.ingredients) {
        const ingredientsLower = item.ingredients.toLowerCase()
        for (const tag of customTags) {
          if (ingredientsLower.includes(tag.text.toLowerCase())) {
            warnings.push(`May contain ${tag.displayLabel}`)
          }
        }
      }

      if (!isSafe) {
        excludedCount++
      } else if (warnings.length > 0) {
        cautionItems.push({
          name: item.name,
          ingredients: item.ingredients || '',
          price: item.price || 0,
          warnings,
        })
      } else {
        safeItems.push({
          name: item.name,
          ingredients: item.ingredients || '',
          price: item.price || 0,
          warnings: [],
        })
      }
    }

    return { safeItems, cautionItems, excludedCount }
  }, [menuItems, pendingAllergenIds, customAllergenIds, customTags])

  const handleSubmit = () => {
    if (filterMenuItems) {
      setResults(filterMenuItems)
    }
  }

  const handleReset = () => {
    setResults(null)
    setPendingAllergenIds([])
    setCustomAllergenIds([])
    setCustomTags([])
  }

  const hasSelections = pendingAllergenIds.length > 0 || customAllergenIds.length > 0 || customTags.length > 0

  // If showing results, render results view
  if (results) {
    return (
      <div className="app-container">
        <header>
          <Image src="/images/mosaic-mark.png" alt="Mosaic" width={60} height={60} className="logo" />
          <h1>{venue.name}</h1>
          <p className="subtitle">Your filtered menu</p>
        </header>

        <MenuResults
          safeItems={results.safeItems}
          cautionItems={results.cautionItems}
          excludedCount={results.excludedCount}
          selectedAllergens={pendingAllergenIds.map(id => ({ id, type: 'allergy' as const }))}
          customAllergenIds={customAllergenIds}
          customTags={customTags}
          onStartOver={handleReset}
        />
      </div>
    )
  }

  // Otherwise, render selection form
  return (
    <div className="app-container">
      <header>
        <Image src="/images/mosaic-mark.png" alt="Mosaic" width={60} height={60} className="logo" />
        <h1>{venue.name}</h1>
        <p className="subtitle">Select your dietary requirements</p>
      </header>

      <AllergenGrid
        pendingAllergenIds={pendingAllergenIds}
        selectedAllergens={[]}
        onAllergenClick={handleAllergenClick}
      />

      <div className="input-group" style={{ marginTop: 'var(--spacing-lg)' }}>
        <AutocompleteInput
          selectedAllergenIds={customAllergenIds}
          customTags={customTags}
          onAllergenAdd={handleAddCustomAllergen}
          onAllergenRemove={handleRemoveCustomAllergen}
          onCustomTagAdd={handleAddCustomTag}
          onCustomTagRemove={handleRemoveCustomTag}
          onInputChange={setHasInputText}
        />
      </div>

      <div className="action-area">
        <button
          className="btn primary-btn full-width"
          onClick={handleSubmit}
          disabled={!hasSelections}
        >
          Show Safe Options
        </button>
      </div>

      <p style={{
        fontSize: '0.8rem',
        textAlign: 'center',
        opacity: 0.5,
        marginTop: 'var(--spacing-lg)'
      }}>
        Powered by AI-llergy
      </p>
    </div>
  )
}
