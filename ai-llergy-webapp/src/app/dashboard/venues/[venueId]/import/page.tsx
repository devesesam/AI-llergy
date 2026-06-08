'use client'

import { useState, useCallback, use } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { ALL_FILTERS } from '@/lib/allergens'
import {
  Card,
  CardBody,
  Field,
  Textarea,
  Button,
  PageHeader,
  Table,
  THead,
  TH,
  TR,
  TD,
  useToast,
} from '@/components/ui'

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
  const [importing, setImporting] = useState(false)
  const toast = useToast()

  const router = useRouter()
  const supabase = createClient()

  const parseCSV = useCallback((text: string) => {
    const lines = text.trim().split('\n')
    if (lines.length < 2) {
      toast.error('CSV must have a header row and at least one data row')
      return
    }

    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase())

    const nameCol = headers.findIndex((h) => h === 'item' || h === 'name' || h === 'item name')
    const descCol = headers.findIndex((h) => h === 'description' || h === 'desc')
    const priceCol = headers.findIndex((h) => h === 'price')
    const ingredientsCol = headers.findIndex((h) => h === 'ingredients' || h === 'ingredient')

    if (nameCol === -1) {
      toast.error('Could not find an "Item" or "Name" column in the CSV')
      return
    }

    const allergenColMap: Record<string, number> = {}
    ALL_FILTERS.forEach((allergen) => {
      const colIndex = headers.findIndex(
        (h) =>
          h.includes(allergen.id) ||
          h.includes(allergen.label.toLowerCase()) ||
          h.toLowerCase() === allergen.columnName.toLowerCase()
      )
      if (colIndex !== -1) allergenColMap[allergen.id] = colIndex
    })

    const items: ParsedItem[] = []
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map((v) => v.trim())
      const name = values[nameCol]
      if (!name) continue

      const allergenProfile: Record<string, boolean> = {}
      Object.entries(allergenColMap).forEach(([allergenId, colIndex]) => {
        const value = values[colIndex]?.toLowerCase()
        if (value === 'yes' || value === 'true' || value === '1') {
          allergenProfile[`${allergenId}_free`] = true
        }
      })

      items.push({
        name,
        description: descCol !== -1 ? values[descCol] : undefined,
        price: priceCol !== -1 ? parseFloat(values[priceCol]?.replace('$', '')) || undefined : undefined,
        ingredients: ingredientsCol !== -1 ? values[ingredientsCol] : undefined,
        allergenProfile,
      })
    }

    if (items.length === 0) {
      toast.error('No valid items found in the CSV')
      return
    }

    setParsedItems(items)
  }, [toast])

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
    if (text.trim()) parseCSV(text)
    else setParsedItems([])
  }

  const handleImport = async () => {
    if (parsedItems.length === 0) return
    setImporting(true)
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

      toast.success(`Imported ${parsedItems.length} menu items`)
      router.push(`/dashboard/venues/${venueId}/menu`)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to import items')
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      <PageHeader
        title="Import menu items"
        subtitle="Import from a CSV file or Google Sheets export."
        backHref={`/dashboard/venues/${venueId}/menu`}
        backLabel="Back to menu"
      />

      <Card>
        <CardBody className="space-y-5">
          <Field label="Upload CSV file" help="Or paste CSV content directly below.">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              disabled={importing}
              className="block w-full text-sm text-text-muted file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-medium file:bg-primary file:text-text hover:file:bg-primary-hover file:cursor-pointer"
            />
          </Field>

          <Field
            label="CSV content"
            help={'Expected columns: Item (required), Price, Ingredients, and allergen columns (e.g. "DAIRY FREE", "GLUTEN FREE").'}
          >
            <Textarea
              value={csvText}
              onChange={(e) => handleTextChange(e.target.value)}
              disabled={importing}
              rows={8}
              className="font-mono text-xs"
              placeholder={'Item,Price,Ingredients,DAIRY FREE,GLUTEN FREE\nBurger,$15.00,"beef, bun, lettuce",NO,NO\nSalad,$12.00,"greens, tomato",YES,YES'}
            />
          </Field>

          {parsedItems.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-text mb-2">
                Preview ({parsedItems.length} items)
              </h3>
              <div className="max-h-72 overflow-y-auto border border-border/60 rounded-xl">
                <Table>
                  <THead>
                    <tr>
                      <TH>Name</TH>
                      <TH>Price</TH>
                      <TH>Free-from flags</TH>
                    </tr>
                  </THead>
                  <tbody>
                    {parsedItems.slice(0, 10).map((item, i) => (
                      <TR key={i}>
                        <TD className="font-medium text-text">{item.name}</TD>
                        <TD className="text-text-muted">
                          {item.price ? `$${item.price.toFixed(2)}` : '—'}
                        </TD>
                        <TD className="text-xs text-text-muted">
                          {Object.keys(item.allergenProfile).filter((k) => item.allergenProfile[k]).length > 0
                            ? Object.keys(item.allergenProfile)
                                .filter((k) => item.allergenProfile[k])
                                .map((k) => k.replace('_free', ''))
                                .join(', ')
                            : '—'}
                        </TD>
                      </TR>
                    ))}
                  </tbody>
                </Table>
              </div>
              {parsedItems.length > 10 && (
                <p className="text-xs text-text-muted mt-1">
                  Showing 10 of {parsedItems.length} items
                </p>
              )}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-1">
            <Button
              variant="secondary"
              onClick={() => router.back()}
              disabled={importing}
            >
              Cancel
            </Button>
            <Button
              onClick={handleImport}
              loading={importing}
              disabled={parsedItems.length === 0}
            >
              Import {parsedItems.length || ''} items
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  )
}
