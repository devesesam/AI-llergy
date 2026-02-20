'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { ALL_FILTERS } from '@/lib/allergens'
import type { MenuItem, MenuItemInsert, MenuItemUpdate, AllergenProfile } from '@/lib/supabase/types'

interface MenuItemFormProps {
  venueId: string
  menuItem?: MenuItem
  mode: 'create' | 'edit'
}

export default function MenuItemForm({ venueId, menuItem, mode }: MenuItemFormProps) {
  const [name, setName] = useState(menuItem?.name || '')
  const [description, setDescription] = useState(menuItem?.description || '')
  const [price, setPrice] = useState(menuItem?.price?.toString() || '')
  const [ingredients, setIngredients] = useState(menuItem?.ingredients || '')
  const [isActive, setIsActive] = useState(menuItem?.is_active ?? true)
  const [allergenProfile, setAllergenProfile] = useState<AllergenProfile>(
    (menuItem?.allergen_profile as AllergenProfile) || {}
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const router = useRouter()
  const supabase = createClient()

  const toggleAllergen = (id: string) => {
    setAllergenProfile(prev => ({
      ...prev,
      [`${id}_free`]: !prev[`${id}_free`]
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const data: MenuItemInsert | MenuItemUpdate = {
        venue_id: venueId,
        name,
        description: description || null,
        price: price ? parseFloat(price) : null,
        ingredients: ingredients || null,
        allergen_profile: allergenProfile,
        is_active: isActive,
      }

      if (mode === 'create') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: createError } = await (supabase as any)
          .from('menu_items')
          .insert(data)

        if (createError) throw createError
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: updateError } = await (supabase as any)
          .from('menu_items')
          .update(data)
          .eq('id', menuItem!.id)

        if (updateError) throw updateError
      }

      router.push(`/dashboard/venues/${venueId}`)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save menu item')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this menu item?')) return

    setLoading(true)
    try {
      const { error: deleteError } = await supabase
        .from('menu_items')
        .delete()
        .eq('id', menuItem!.id)

      if (deleteError) throw deleteError

      router.push(`/dashboard/venues/${venueId}`)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete menu item')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="dashboard-form" style={{ maxWidth: 600 }}>
      <div className="dashboard-form__group">
        <label htmlFor="name" className="dashboard-form__label">
          Item Name *
        </label>
        <input
          type="text"
          id="name"
          className="dashboard-form__input"
          placeholder="e.g., Grilled Salmon"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          disabled={loading}
        />
      </div>

      <div className="dashboard-form__group">
        <label htmlFor="description" className="dashboard-form__label">
          Description
        </label>
        <textarea
          id="description"
          className="dashboard-form__input"
          placeholder="Brief description of the dish"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={loading}
          rows={2}
          style={{ resize: 'vertical' }}
        />
      </div>

      <div className="dashboard-form__group">
        <label htmlFor="price" className="dashboard-form__label">
          Price ($)
        </label>
        <input
          type="number"
          id="price"
          className="dashboard-form__input"
          placeholder="0.00"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          disabled={loading}
          step="0.01"
          min="0"
          style={{ maxWidth: 150 }}
        />
      </div>

      <div className="dashboard-form__group">
        <label htmlFor="ingredients" className="dashboard-form__label">
          Ingredients
        </label>
        <textarea
          id="ingredients"
          className="dashboard-form__input"
          placeholder="List of ingredients (comma-separated)"
          value={ingredients}
          onChange={(e) => setIngredients(e.target.value)}
          disabled={loading}
          rows={3}
          style={{ resize: 'vertical' }}
        />
        <p className="dashboard-form__help">
          Used for AI-powered allergen detection when columns aren&apos;t set
        </p>
      </div>

      <div className="dashboard-form__group">
        <label className="dashboard-form__label">
          Allergen Profile
        </label>
        <p className="dashboard-form__help" style={{ marginBottom: 'var(--spacing-sm)' }}>
          Select all allergens this item is FREE from
        </p>
        <div className="allergen-toggles">
          {ALL_FILTERS.map(allergen => (
            <label
              key={allergen.id}
              className={`allergen-toggle ${allergenProfile[`${allergen.id}_free`] ? 'allergen-toggle--active' : ''}`}
            >
              <input
                type="checkbox"
                className="allergen-toggle__checkbox"
                checked={allergenProfile[`${allergen.id}_free`] || false}
                onChange={() => toggleAllergen(allergen.id)}
                disabled={loading}
              />
              <span>{allergen.icon}</span>
              <span>{allergen.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="dashboard-form__group">
        <label className="allergen-toggle" style={{ maxWidth: 200 }}>
          <input
            type="checkbox"
            className="allergen-toggle__checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            disabled={loading}
          />
          <span>Active (visible on menu)</span>
        </label>
      </div>

      {error && (
        <div style={{
          padding: 'var(--spacing-sm)',
          background: 'rgba(220, 38, 38, 0.1)',
          border: '1px solid var(--color-severity-critical)',
          borderRadius: 'var(--radius-sm)',
          color: 'var(--color-severity-critical)',
          fontSize: '0.9rem',
          marginBottom: 'var(--spacing-md)'
        }}>
          {error}
        </div>
      )}

      <div className="dashboard-form__actions">
        {mode === 'edit' && (
          <button
            type="button"
            className="btn"
            onClick={handleDelete}
            disabled={loading}
            style={{
              background: 'transparent',
              color: 'var(--color-severity-critical)',
              border: '1px solid var(--color-severity-critical)',
              marginRight: 'auto'
            }}
          >
            Delete
          </button>
        )}
        <button
          type="button"
          className="btn secondary-btn"
          onClick={() => router.back()}
          disabled={loading}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="btn primary-btn"
          disabled={loading || !name}
        >
          {loading ? 'Saving...' : mode === 'create' ? 'Add Item' : 'Save Changes'}
        </button>
      </div>
    </form>
  )
}
