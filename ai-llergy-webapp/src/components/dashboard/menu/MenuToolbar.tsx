"use client";

import { Search, Download, Upload, Plus } from "lucide-react";
import { Input, Select, Button } from "@/components/ui";
import { ALL_FILTERS } from "@/lib/allergens";

export type StatusFilter = "all" | "active" | "inactive" | "incomplete";
export type SortKey =
  | "name-asc"
  | "name-desc"
  | "price-asc"
  | "price-desc"
  | "incomplete-first";

interface MenuToolbarProps {
  venueId: string;
  search: string;
  onSearch: (v: string) => void;
  status: StatusFilter;
  onStatus: (v: StatusFilter) => void;
  allergen: string;
  onAllergen: (v: string) => void;
  sort: SortKey;
  onSort: (v: SortKey) => void;
  onExport: () => void;
  onAddRow: () => void;
}

export function MenuToolbar({
  venueId,
  search,
  onSearch,
  status,
  onStatus,
  allergen,
  onAllergen,
  sort,
  onSort,
  onExport,
  onAddRow,
}: MenuToolbarProps) {
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-1 flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <Input
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Search dishes..."
            className="pl-9"
          />
        </div>

        <Select
          value={status}
          onChange={(e) => onStatus(e.target.value as StatusFilter)}
          className="w-auto"
          aria-label="Filter by status"
        >
          <option value="all">All items</option>
          <option value="active">Active only</option>
          <option value="inactive">Inactive only</option>
          <option value="incomplete">Incomplete only</option>
        </Select>

        <Select
          value={allergen}
          onChange={(e) => onAllergen(e.target.value)}
          className="w-auto"
          aria-label="Filter by free-from allergen"
        >
          <option value="">Any allergen</option>
          {ALL_FILTERS.map((a) => (
            <option key={a.id} value={a.id}>
              {a.label} free
            </option>
          ))}
        </Select>

        <Select
          value={sort}
          onChange={(e) => onSort(e.target.value as SortKey)}
          className="w-auto"
          aria-label="Sort"
        >
          <option value="name-asc">Name A–Z</option>
          <option value="name-desc">Name Z–A</option>
          <option value="price-asc">Price low–high</option>
          <option value="price-desc">Price high–low</option>
          <option value="incomplete-first">Incomplete first</option>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={onExport}
          icon={<Download className="w-4 h-4" />}
        >
          Export
        </Button>
        <Button
          variant="secondary"
          size="sm"
          href={`/dashboard/venues/${venueId}/import`}
          icon={<Upload className="w-4 h-4" />}
        >
          Import
        </Button>
        <Button size="sm" onClick={onAddRow} icon={<Plus className="w-4 h-4" />}>
          Add dish
        </Button>
      </div>
    </div>
  );
}
