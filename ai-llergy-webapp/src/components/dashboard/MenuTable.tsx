'use client'

import { useState, useEffect, useCallback } from 'react'
import { Save, Plus, Trash2, UtensilsCrossed, Loader2 } from 'lucide-react'
import { ALL_FILTERS } from '@/lib/allergens'

interface MenuItem {
    id: string
    name: string
    ingredients: string | null
    allergens: string[] | null
    price: number | null
    is_active: boolean
    isNew?: boolean  // Track if this is a new unsaved row
}

interface MenuTableProps {
    venueId: string
    menuItems: MenuItem[]
}

export default function MenuTable({ venueId, menuItems }: MenuTableProps) {
    const [items, setItems] = useState<MenuItem[]>(menuItems)
    const [originalItems, setOriginalItems] = useState<MenuItem[]>(menuItems)
    const [isSaving, setIsSaving] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

    // Check if there are unsaved changes
    const hasChanges = useCallback(() => {
        if (items.length !== originalItems.length) return true
        return items.some((item, index) => {
            const original = originalItems.find(o => o.id === item.id)
            if (!original) return true // New item
            if (item.name !== original.name) return true
            if (item.ingredients !== original.ingredients) return true
            const itemAllergens = (item.allergens || []).sort().join(',')
            const originalAllergens = (original.allergens || []).sort().join(',')
            if (itemAllergens !== originalAllergens) return true
            return false
        })
    }, [items, originalItems])

    // Warn before leaving with unsaved changes
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (hasChanges()) {
                e.preventDefault()
                e.returnValue = ''
                return ''
            }
        }

        window.addEventListener('beforeunload', handleBeforeUnload)
        return () => window.removeEventListener('beforeunload', handleBeforeUnload)
    }, [hasChanges])

    // Update item field
    const updateItem = (id: string, field: keyof MenuItem, value: string | string[] | null) => {
        setItems(prev => prev.map(item =>
            item.id === id ? { ...item, [field]: value } : item
        ))
    }

    // Toggle allergen for an item
    const toggleAllergen = (itemId: string, allergenId: string) => {
        setItems(prev => prev.map(item => {
            if (item.id !== itemId) return item
            const currentAllergens = item.allergens || []
            const hasAllergen = currentAllergens.includes(allergenId)
            return {
                ...item,
                allergens: hasAllergen
                    ? currentAllergens.filter(a => a !== allergenId)
                    : [...currentAllergens, allergenId]
            }
        }))
    }

    // Add new row
    const addRow = () => {
        const newItem: MenuItem = {
            id: `new_${Date.now()}`,
            name: '',
            ingredients: null,
            allergens: [],
            price: null,
            is_active: true,
            isNew: true
        }
        setItems(prev => [...prev, newItem])
    }

    // Delete row
    const deleteRow = (id: string) => {
        setItems(prev => prev.filter(item => item.id !== id))
    }

    // Save all changes
    const handleSave = async () => {
        setIsSaving(true)
        setMessage(null)

        try {
            const response = await fetch(`/api/venues/${venueId}/menu`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ items }),
            })

            if (!response.ok) {
                const data = await response.json()
                throw new Error(data.error || 'Failed to save menu')
            }

            const data = await response.json()
            // Update items with server-assigned IDs for new items
            setItems(data.items)
            setOriginalItems(data.items)
            setMessage({ type: 'success', text: 'Menu saved successfully!' })

            // Clear message after 3 seconds
            setTimeout(() => setMessage(null), 3000)
        } catch (error) {
            setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Failed to save' })
        } finally {
            setIsSaving(false)
        }
    }

    const isDirty = hasChanges()

    return (
        <div className="bg-white rounded-2xl shadow-card overflow-hidden">
            {/* Header */}
            <div className="px-6 py-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h2 className="text-xl font-heading text-gray-900">Menu & Ingredients</h2>
                    <p className="text-sm text-gray-500 mt-1">Click any cell to edit. Toggle allergens for each dish.</p>
                </div>
                <div className="flex items-center gap-3">
                    {message && (
                        <span className={`text-sm font-medium ${message.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                            {message.text}
                        </span>
                    )}
                    {isDirty && (
                        <span className="text-sm text-amber-600 font-medium">Unsaved changes</span>
                    )}
                    <button
                        onClick={handleSave}
                        disabled={!isDirty || isSaving}
                        className="btn-base btn-md bg-primary text-white hover:bg-primary/90 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSaving ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <Save className="w-5 h-5" />
                        )}
                        {isSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                    <thead className="bg-gray-50/80 sticky top-0">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap min-w-[180px] border-b border-gray-200">
                                Dish Name
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap min-w-[200px] border-b border-gray-200">
                                Ingredients
                            </th>
                            {ALL_FILTERS.map(allergen => (
                                <th
                                    key={allergen.id}
                                    className="px-2 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap min-w-[60px] border-b border-gray-200"
                                    title={allergen.label}
                                >
                                    <span className="text-base">{allergen.icon}</span>
                                    <span className="block text-[10px] mt-0.5 normal-case">{allergen.label}</span>
                                </th>
                            ))}
                            <th className="px-3 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200 sticky right-0 bg-gray-50/80 min-w-[50px]">

                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {items.map((item) => (
                            <tr key={item.id} className="hover:bg-gray-50/50 transition-colors group">
                                {/* Dish Name - Editable */}
                                <td className="px-4 py-2 border-r border-gray-100">
                                    <input
                                        type="text"
                                        value={item.name}
                                        onChange={(e) => updateItem(item.id, 'name', e.target.value)}
                                        placeholder="Dish name..."
                                        className="w-full px-2 py-2 text-sm font-medium text-gray-900 bg-transparent border border-transparent rounded hover:border-gray-200 focus:border-primary focus:ring-1 focus:ring-primary/20 focus:outline-none transition-colors"
                                    />
                                </td>

                                {/* Ingredients - Editable */}
                                <td className="px-4 py-2 border-r border-gray-100">
                                    <input
                                        type="text"
                                        value={item.ingredients || ''}
                                        onChange={(e) => updateItem(item.id, 'ingredients', e.target.value || null)}
                                        placeholder="Ingredients..."
                                        className="w-full px-2 py-2 text-sm text-gray-600 bg-transparent border border-transparent rounded hover:border-gray-200 focus:border-primary focus:ring-1 focus:ring-primary/20 focus:outline-none transition-colors"
                                    />
                                </td>

                                {/* Allergen Toggles */}
                                {ALL_FILTERS.map(allergen => {
                                    const isActive = (item.allergens || []).includes(allergen.id)
                                    return (
                                        <td key={allergen.id} className="px-2 py-2 text-center border-r border-gray-50">
                                            <button
                                                onClick={() => toggleAllergen(item.id, allergen.id)}
                                                className={`w-8 h-8 rounded-lg transition-all ${
                                                    isActive
                                                        ? 'bg-amber-100 text-amber-700 ring-2 ring-amber-300'
                                                        : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                                                }`}
                                                title={`${isActive ? 'Contains' : 'Does not contain'} ${allergen.label}`}
                                            >
                                                {isActive ? '✓' : ''}
                                            </button>
                                        </td>
                                    )
                                })}

                                {/* Delete Button */}
                                <td className="px-3 py-2 text-center sticky right-0 bg-white group-hover:bg-gray-50/50">
                                    <button
                                        onClick={() => deleteRow(item.id)}
                                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors opacity-0 group-hover:opacity-100"
                                        title="Delete row"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </td>
                            </tr>
                        ))}

                        {/* Empty state */}
                        {items.length === 0 && (
                            <tr>
                                <td colSpan={ALL_FILTERS.length + 3} className="py-12 px-6">
                                    <div className="text-center">
                                        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-100 flex items-center justify-center">
                                            <UtensilsCrossed className="w-6 h-6 text-gray-400" />
                                        </div>
                                        <p className="text-gray-500 text-sm mb-4">No menu items yet. Click the + button below to add your first dish.</p>
                                    </div>
                                </td>
                            </tr>
                        )}

                        {/* Add Row Button */}
                        <tr className="border-t-2 border-dashed border-gray-200">
                            <td colSpan={ALL_FILTERS.length + 3} className="py-2 px-4">
                                <button
                                    onClick={addRow}
                                    className="w-full py-3 flex items-center justify-center gap-2 text-gray-500 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors group"
                                >
                                    <Plus className="w-5 h-5" />
                                    <span className="text-sm font-medium">Add new dish</span>
                                </button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* Footer hint */}
            <div className="px-6 py-3 bg-gray-50/50 border-t border-gray-100">
                <p className="text-xs text-gray-400">
                    Tip: Scroll horizontally to see all allergen columns. Changes are saved when you click &quot;Save Changes&quot;.
                </p>
            </div>
        </div>
    )
}
