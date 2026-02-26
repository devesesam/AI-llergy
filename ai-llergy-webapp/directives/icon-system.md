# Icon System (Lucide React)

## Overview

The webapp uses **Lucide React** for icons throughout the dashboard and UI components. This replaces any legacy emoji-based icons.

## Installation

```bash
npm install lucide-react
```

Already installed in this project as of February 2026.

## Basic Usage

```tsx
import { Building2, Plus, LogOut } from 'lucide-react'

// In JSX:
<Building2 className="w-6 h-6 text-primary" />
<Plus className="w-4 h-4" />
<LogOut className="w-5 h-5" />
```

## Size Convention

| Context | Size Class | Pixels |
|---------|------------|--------|
| Stat card icons | `w-6 h-6` | 24px |
| Empty state icons | `w-8 h-8` | 32px |
| Navigation icons | `w-5 h-5` | 20px |
| Button icons | `w-4 h-4` | 16px |
| Inline text icons | `w-4 h-4` | 16px |

## Color Convention

- **Primary/brand context**: `text-primary` (gold/amber)
- **Neutral/muted**: `text-gray-500` or `text-text-muted`
- **On buttons**: inherits from parent (usually white)
- **Danger/destructive**: `text-red-500` or `text-severity-critical`

## Icons Currently Used

| Icon | Import | Usage |
|------|--------|-------|
| `LayoutDashboard` | `lucide-react` | Overview nav item |
| `Building2` | `lucide-react` | Venues nav/stats |
| `UtensilsCrossed` | `lucide-react` | Menu items stat |
| `Store` | `lucide-react` | Empty venue state |
| `Plus` | `lucide-react` | Add/create buttons |
| `LogOut` | `lucide-react` | Sign out button |

## Typing Pattern for Dynamic Icons

When icons are stored in data structures (like nav items):

```tsx
import { type LucideIcon } from 'lucide-react'

interface NavItem {
  href: string
  label: string
  icon: LucideIcon  // Type for icon component
}

const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
]

// Render dynamically:
{navItems.map(item => (
  <item.icon className="w-5 h-5" />
))}
```

## Icon Backgrounds

For icons in circular/rounded containers (common in stats cards, empty states):

```tsx
// Rounded square (stats cards)
<div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
  <Building2 className="w-6 h-6 text-primary" />
</div>

// Circle (empty states)
<div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
  <Store className="w-8 h-8 text-primary" />
</div>
```

Key styles:
- `bg-primary/10` - 10% opacity brand color
- `flex items-center justify-center` - Center the icon
- `flex-shrink-0` - Prevent container from shrinking in flex layouts

## Finding Icons

Browse available icons at: https://lucide.dev/icons

Common categories:
- **Navigation**: `LayoutDashboard`, `Home`, `Settings`, `User`
- **Actions**: `Plus`, `Pencil`, `Trash2`, `Check`, `X`
- **Objects**: `Building2`, `Store`, `UtensilsCrossed`, `Menu`
- **Arrows**: `ChevronRight`, `ChevronDown`, `ArrowLeft`
- **Status**: `AlertCircle`, `CheckCircle`, `XCircle`

## DO NOT Use

- Emoji icons (📊, 🏢, 🚪) - inconsistent across platforms
- Icon fonts (Font Awesome, etc.) - heavier, less tree-shakeable
- Inline SVGs for common icons - use Lucide for consistency

## Migration Notes

If you encounter emoji icons in legacy code, replace with Lucide equivalents:

| Emoji | Lucide Replacement |
|-------|-------------------|
| 📊 | `LayoutDashboard` or `BarChart3` |
| 🏢 | `Building2` |
| 🚪 | `LogOut` or `DoorOpen` |
| ➕ | `Plus` |
| ✏️ | `Pencil` |
| 🗑️ | `Trash2` |
| ⚙️ | `Settings` |
