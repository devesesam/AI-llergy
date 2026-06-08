'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import { ALL_FILTERS } from '@/lib/allergens'
import type { MenuItem, MenuItemInsert, MenuItemUpdate, AllergenProfile } from '@/lib/supabase/types'
import {
  Card,
  CardBody,
  Field,
  Input,
  Textarea,
  Button,
  ConfirmDialog,
  useToast,
} from '@/components/ui'
import { cn } from '@/lib/cn'

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
  const [showDelete, setShowDelete] = useState(false)

  const router = useRouter()
  const supabase = createClient()
  const toast = useToast()
  const backUrl = `/dashboard/venues/${venueId}/menu`

  const toggleAllergen = (id: string) => {
    setAllergenProfile((prev) => ({
      ...prev,
      [`${id}_free`]: !prev[`${id}_free`],
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

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
        const { error: createError } = await (supabase as any).from('menu_items').insert(data)
        if (createError) throw createError
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: updateError } = await (supabase as any)
          .from('menu_items')
          .update(data)
          .eq('id', menuItem!.id)
        if (updateError) throw updateError
      }

      toast.success(mode === 'create' ? 'Menu item added' : 'Menu item saved')
      router.push(backUrl)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save menu item')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    setLoading(true)
    try {
      const { error: deleteError } = await supabase
        .from('menu_items')
        .delete()
        .eq('id', menuItem!.id)
      if (deleteError) throw deleteError
      toast.success('Menu item deleted')
      router.push(backUrl)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete menu item')
      setLoading(false)
      setShowDelete(false)
    }
  }

  return (
    <Card className="max-w-2xl">
      <CardBody>
        <form onSubmit={handleSubmit} className="space-y-5">
          <Field label="Item name" required>
            <Input
              placeholder="e.g. Grilled Salmon"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={loading}
            />
          </Field>

          <Field label="Description">
            <Textarea
              placeholder="Brief description of the dish"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={loading}
              rows={2}
            />
          </Field>

          <Field label="Price ($)">
            <Input
              type="number"
              placeholder="0.00"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              disabled={loading}
              step="0.01"
              min="0"
              className="max-w-[150px]"
            />
          </Field>

          <Field
            label="Ingredients"
            help="Comma-separated. Used for allergen detection when columns aren't set."
          >
            <Textarea
              placeholder="flour, butter, eggs, milk"
              value={ingredients}
              onChange={(e) => setIngredients(e.target.value)}
              disabled={loading}
              rows={3}
            />
          </Field>

          <Field
            label="Free-from profile"
            help="Select every allergen this item is FREE from."
          >
            <div className="flex flex-wrap gap-2">
              {ALL_FILTERS.map((allergen) => {
                const active = allergenProfile[`${allergen.id}_free`] || false
                return (
                  <button
                    key={allergen.id}
                    type="button"
                    onClick={() => toggleAllergen(allergen.id)}
                    disabled={loading}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors',
                      active
                        ? 'bg-success-bg border-success/40 text-success'
                        : 'bg-surface border-border text-text-muted hover:border-text-muted/50'
                    )}
                  >
                    <span>{allergen.icon}</span>
                    <span>{allergen.label}</span>
                  </button>
                )
              })}
            </div>
          </Field>

          <Field label="Visibility">
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                disabled={loading}
                className="w-4 h-4 rounded border-border accent-[#f4c025]"
              />
              <span className="text-sm text-text">Active (visible on public menu)</span>
            </label>
          </Field>

          <div className="flex items-center gap-3 pt-2">
            {mode === 'edit' && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowDelete(true)}
                disabled={loading}
                icon={<Trash2 className="w-4 h-4" />}
                className="mr-auto text-danger hover:bg-danger-bg"
              >
                Delete
              </Button>
            )}
            <Button
              type="button"
              variant="secondary"
              onClick={() => router.push(backUrl)}
              disabled={loading}
              className={mode === 'edit' ? '' : 'ml-auto'}
            >
              Cancel
            </Button>
            <Button type="submit" loading={loading} disabled={!name}>
              {mode === 'create' ? 'Add item' : 'Save changes'}
            </Button>
          </div>
        </form>
      </CardBody>

      <ConfirmDialog
        open={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={handleDelete}
        title="Delete menu item"
        destructive
        confirmLabel="Delete"
        loading={loading}
        description={
          <>
            Delete <strong>{name || 'this item'}</strong> from the menu? This
            cannot be undone.
          </>
        }
      />
    </Card>
  )
}
