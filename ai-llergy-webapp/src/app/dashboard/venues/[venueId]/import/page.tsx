'use client'

import { useState, useCallback, use } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ALL_FILTERS } from '@/lib/allergens'

interface ParsedItem {
  name: string
  description?: string
  price?: number
  ingredients?: string
  allergenProfile: Record<string, boolean>
}

interface PageProps {
  params: Promise<{ venueId: string }>
}

export default function ImportPage({ params }: PageProps) {
  const { venueId } = use(params)
  const [csvText, setCsvText] = useState('')
  const [parsedItems, setParsedItems] = useState<ParsedItem[]>([])
  const [loading, setLoading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const router = useRouter()
  const supabase = createClient()

  const parseCSV = useCallback((text: string) => {
    const lines = text.trim().split('\n')
    if (lines.length < 2) {
      setError('CSV must have at least a header row and one data row')
      return
    }

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase())

    // Find column indices
    const nameCol = headers.findIndex(h => h === 'item' || h === 'name' || h === 'item name')
    const descCol = headers.findIndex(h => h === 'description' || h === 'desc')
    const priceCol = headers.findIndex(h => h === 'price')
    const ingredientsCol = headers.findIndex(h => h === 'ingredients' || h === 'ingredient')

    if (nameCol === -1) {
      setError('Could not find "Item" or "Name" column in CSV')
      return
    }

    // Map allergen columns
    const allergenColMap: Record<string, number> = {}
    ALL_FILTERS.forEach(allergen => {
      const colIndex = headers.findIndex(h =>
        h.includes(allergen.id) ||
        h.includes(allergen.label.toLowerCase()) ||
        h.toLowerCase() === allergen.columnName.toLowerCase()
      )
      if (colIndex !== -1) {
        allergenColMap[allergen.id] = colIndex
      }
    })

    const items: ParsedItem[] = []

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim())
      const name = values[nameCol]

      if (!name) continue

      const allergenProfile: Record<string, boolean> = {}
      Object.entries(allergenColMap).forEach(([allergentId, colIndex]) => {
        const value = values[colIndex]?.toLowerCase()
        if (value === 'yes' || value === 'true' || value === '1') {
          allergenProfile[`${allergentId}_free`] = true
        }
      })

      items.push({
        name,
        description: descCol !== -1 ? values[descCol] : undefined,
        price: priceCol !== -1 ? parseFloat(values[priceCol].replace('$', '')) || undefined : undefined,
        ingredients: ingredientsCol !== -1 ? values[ingredientsCol] : undefined,
        allergenProfile,
      })
    }

    if (items.length === 0) {
      setError('No valid items found in CSV')
      return
    }

    setError(null)
    setParsedItems(items)
  }, [])

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      setCsvText(text)
      parseCSV(text)
    }
    reader.readAsText(file)
  }

  const handleTextChange = (text: string) => {
    setCsvText(text)
    if (text.trim()) {
      parseCSV(text)
    } else {
      setParsedItems([])
    }
  }

  const handleImport = async () => {
    if (parsedItems.length === 0) return

    setImporting(true)
    setError(null)

    try {
      const itemsToInsert = parsedItems.map((item, index) => ({
        venue_id: venueId,
        name: item.name,
        description: item.description || null,
        price: item.price || null,
        ingredients: item.ingredients || null,
        allergen_profile: item.allergenProfile,
        is_active: true,
        sort_order: index,
      }))

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: insertError } = await supabase
        .from('menu_items')
        .insert(itemsToInsert as any)

      if (insertError) throw insertError

      setSuccess(`Successfully imported ${parsedItems.length} menu items!`)
      setTimeout(() => {
        router.push(`/dashboard/venues/${venueId}`)
        router.refresh()
      }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import items')
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="dashboard-content">
      <Link href={`/dashboard/venues/${venueId}`} className="dashboard-back">
        &larr; Back to Venue
      </Link>

      <div className="dashboard-content__header">
        <h1>Import Menu Items</h1>
        <p className="dashboard-content__subtitle">
          Import items from a CSV file or Google Sheets export
        </p>
      </div>

      <div className="dashboard-form" style={{ maxWidth: 700 }}>
        <div className="dashboard-form__group">
          <label className="dashboard-form__label">
            Upload CSV File
          </label>
          <input
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            disabled={loading || importing}
            style={{ marginBottom: 'var(--spacing-sm)' }}
          />
          <p className="dashboard-form__help">
            Or paste CSV content directly below
          </p>
        </div>

        <div className="dashboard-form__group">
          <label htmlFor="csvText" className="dashboard-form__label">
            CSV Content
          </label>
          <textarea
            id="csvText"
            className="dashboard-form__input"
            placeholder="Item,Price,Ingredients,DAIRY FREE,GLUTEN FREE,...&#10;Burger,$15.00,&quot;beef, bun, lettuce&quot;,NO,NO&#10;Salad,$12.00,&quot;greens, tomato&quot;,YES,YES"
            value={csvText}
            onChange={(e) => handleTextChange(e.target.value)}
            disabled={loading || importing}
            rows={8}
            style={{ resize: 'vertical', fontFamily: 'monospace', fontSize: '0.85rem' }}
          />
          <p className="dashboard-form__help">
            Expected columns: Item (required), Price, Ingredients, and allergen columns (e.g., &quot;DAIRY FREE&quot;, &quot;GLUTEN FREE&quot;)
          </p>
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

        {success && (
          <div style={{
            padding: 'var(--spacing-sm)',
            background: 'rgba(34, 197, 94, 0.1)',
            border: '1px solid var(--color-severity-preference)',
            borderRadius: 'var(--radius-sm)',
            color: '#16a34a',
            fontSize: '0.9rem',
            marginBottom: 'var(--spacing-md)'
          }}>
            {success}
          </div>
        )}

        {parsedItems.length > 0 && (
          <div style={{ marginBottom: 'var(--spacing-lg)' }}>
            <h3 style={{ marginBottom: 'var(--spacing-sm)' }}>
              Preview ({parsedItems.length} items)
            </h3>
            <div style={{ maxHeight: 300, overflowY: 'auto', border: '1px solid rgba(30,30,30,0.1)', borderRadius: 'var(--radius-sm)' }}>
              <table className="dashboard-table" style={{ margin: 0 }}>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Price</th>
                    <th>Allergen Flags</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedItems.slice(0, 10).map((item, i) => (
                    <tr key={i}>
                      <td>{item.name}</td>
                      <td>{item.price ? `$${item.price.toFixed(2)}` : '—'}</td>
                      <td style={{ fontSize: '0.8rem' }}>
                        {Object.keys(item.allergenProfile).filter(k => item.allergenProfile[k]).length > 0
                          ? Object.keys(item.allergenProfile)
                              .filter(k => item.allergenProfile[k])
                              .map(k => k.replace('_free', ''))
                              .join(', ')
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {parsedItems.length > 10 && (
              <p style={{ fontSize: '0.85rem', opacity: 0.6, marginTop: 'var(--spacing-xs)' }}>
                Showing 10 of {parsedItems.length} items
              </p>
            )}
          </div>
        )}

        <div className="dashboard-form__actions">
          <button
            type="button"
            className="btn secondary-btn"
            onClick={() => router.back()}
            disabled={importing}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn primary-btn"
            onClick={handleImport}
            disabled={importing || parsedItems.length === 0}
          >
            {importing ? 'Importing...' : `Import ${parsedItems.length} Items`}
          </button>
        </div>
      </div>
    </div>
  )
}
