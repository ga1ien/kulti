# Kulti Design System

## Overview
This document defines the design standards and patterns for the Kulti platform. The design system ensures consistency across the application and provides clear guidelines for developers and designers.

## Color Palette

### Brand Colors
The Kulti platform uses a dark theme with distinct color schemes for user-facing and admin interfaces.

#### User-Facing Interface
- **Primary Accent**: `lime-400` (#a3e635) - Used for CTAs, highlights, and interactive elements
- **Primary Hover**: `lime-500` (#84cc16) - Hover state for lime-400 elements
- **Background**: `#0a0a0a` - Main page background
- **Surface**: `#1a1a1a` - Cards, modals, elevated surfaces
- **Surface Elevated**: `#2a2a2a` - Hover states, secondary surfaces
- **Border**: `#27272a` - Default border color

#### Admin Interface
- **Primary Accent**: `purple-600` (#9333ea) - Admin CTAs and interactive elements
- **Primary Hover**: `purple-500` (#a855f7) - Hover state for purple-600 elements
- **Secondary**: `purple-400` (#c084fc) - Links, code highlights, secondary accents
- **Background/Surface/Border**: Same as user-facing interface

> Note: Purple is intentionally used for admin interfaces to provide clear visual distinction from user-facing features.

#### Text Colors
- **Primary Text**: `white` (#ffffff) - Headings, primary content
- **Secondary Text**: `#a1a1aa` - Subheadings, descriptions
- **Muted Text**: `#71717a` - Disabled states, tertiary information

#### Semantic Colors
- **Success**: `green-500` (#22c55e)
- **Error/Destructive**: `red-500` (#ef4444)
- **Warning**: `orange-500` (#f97316)
- **Info**: `blue-500` (#3b82f6)

### Using Colors in Tailwind

```tsx
// User-facing button
<button className="bg-lime-400 hover:bg-lime-500 text-black">
  Create Session
</button>

// Admin button
<button className="bg-purple-600 hover:bg-purple-500 text-white">
  Create Code
</button>

// Surface/Card
<div className="bg-[#1a1a1a] border border-[#27272a] rounded-lg">
  Content
</div>
```

## Typography

### Font Families
- **Headings**: `JetBrains Mono` - monospace font for headers and brand elements
  - Apply with: `className="font-mono"`
- **Body Text**: `Inter` - sans-serif for body content and UI text
  - Apply with: `className="font-sans"` (default)

### Font Sizes & Weights

#### Headings
- `text-3xl font-bold` - Page titles (h1)
- `text-2xl font-semibold` - Section headers (h2)
- `text-xl font-semibold` - Subsections (h3)
- `text-lg font-medium` - Small headers (h4)

#### Body Text
- `text-base` - Default body text (16px)
- `text-sm` - Secondary text, labels (14px)
- `text-xs` - Captions, metadata (12px)

#### Font Weights
- `font-bold` - 700 - Primary CTAs, emphasis
- `font-semibold` - 600 - Headers, subheaders
- `font-medium` - 500 - Labels, UI elements
- `font-normal` - 400 - Body text (default)

### Typography Example

```tsx
<div>
  <h1 className="font-mono text-3xl font-bold text-white">
    Welcome to Kulti
  </h1>
  <p className="text-base text-[#a1a1aa] mt-2">
    Start your creative session today
  </p>
</div>
```

## Spacing System

Use Tailwind's spacing scale consistently:
- **Tight**: `gap-1` `p-1` (4px) - Icon spacing
- **Compact**: `gap-2` `p-2` (8px) - Button internals
- **Comfortable**: `gap-4` `p-4` (16px) - Card padding, sections
- **Spacious**: `gap-6` `p-6` (24px) - Page sections
- **Generous**: `gap-8` `p-8` (32px) - Major sections

### Layout Spacing
- **Container**: `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8`
- **Section Spacing**: `space-y-6` between major sections
- **Card Padding**: `p-6` for cards and modals

## Component Patterns

### Cards

Always use the shadcn Card component for consistency:

```tsx
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"

<Card className="bg-[#1a1a1a] border-[#27272a]">
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
    <CardDescription>Optional description</CardDescription>
  </CardHeader>
  <CardContent>
    Content goes here
  </CardContent>
</Card>
```

Alternative for simple cards:
```tsx
<div className="bg-[#1a1a1a] border border-[#27272a] rounded-lg p-6">
  Content
</div>
```

### Buttons

#### Accessibility Requirements
All buttons must have:
- Minimum height: `min-h-[44px]` for regular buttons
- Minimum height: `min-h-[56px]` for primary CTAs
- Icon-only buttons: `min-h-[44px] min-w-[44px] flex items-center justify-center`

#### Button Variants

**Primary (User-facing)**
```tsx
<button className="bg-lime-400 hover:bg-lime-500 text-black font-bold px-6 py-2.5 min-h-[44px] rounded-lg transition-colors">
  Primary Action
</button>
```

**Primary (Admin)**
```tsx
<button className="bg-purple-600 hover:bg-purple-500 text-white font-medium px-4 py-2 min-h-[44px] rounded-lg transition-colors">
  Admin Action
</button>
```

**Secondary**
```tsx
<button className="bg-[#1a1a1a] border border-[#27272a] hover:border-lime-400 text-white px-4 py-2 min-h-[44px] rounded-lg transition-colors">
  Secondary Action
</button>
```

**Ghost/Tertiary**
```tsx
<button className="text-[#a1a1aa] hover:text-white hover:bg-[#2a2a2a] px-4 py-2 min-h-[44px] rounded-lg transition-colors">
  Tertiary Action
</button>
```

**Icon Button**
```tsx
<button className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg hover:bg-[#2a2a2a] transition-colors">
  <Icon className="w-5 h-5" />
</button>
```

**Disabled State**
```tsx
<button disabled className="bg-lime-400 text-black px-6 py-2.5 min-h-[44px] rounded-lg opacity-50 cursor-not-allowed">
  Disabled
</button>
```

### Inputs & Forms

#### Text Input
```tsx
<input
  type="text"
  className="w-full bg-[#1a1a1a] border border-[#27272a] rounded-lg px-4 py-2.5 text-white placeholder:text-[#a1a1aa] focus:outline-none focus:border-lime-400 focus:ring-1 focus:ring-lime-400 transition-colors"
  placeholder="Enter text..."
/>
```

#### Label
```tsx
<label className="block text-sm font-medium text-[#a1a1aa] mb-2">
  Label Text
</label>
```

#### Form Layout
```tsx
<form className="space-y-4">
  <div>
    <label className="block text-sm font-medium text-[#a1a1aa] mb-2">
      Field Label
    </label>
    <input className="..." />
    <p className="mt-1 text-xs text-[#71717a]">
      Helper text
    </p>
  </div>
</form>
```

### Modals

```tsx
<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
  <div className="w-full max-w-md bg-[#1a1a1a] border border-[#27272a] rounded-lg p-6">
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-xl font-semibold text-white">Modal Title</h2>
      <button className="min-h-[44px] min-w-[44px] flex items-center justify-center text-[#a1a1aa] hover:text-white">
        <X className="w-5 h-5" />
      </button>
    </div>
    <div className="space-y-4">
      Modal content
    </div>
    <div className="flex justify-end gap-3 mt-6">
      <button className="...">Cancel</button>
      <button className="...">Confirm</button>
    </div>
  </div>
</div>
```

### Badges & Pills

```tsx
// Status badge - Success
<span className="inline-flex rounded-full bg-green-500/10 px-2 py-1 text-xs font-medium text-green-500">
  Active
</span>

// Status badge - Warning
<span className="inline-flex rounded-full bg-orange-500/10 px-2 py-1 text-xs font-medium text-orange-500">
  Pending
</span>

// Status badge - Error
<span className="inline-flex rounded-full bg-red-500/10 px-2 py-1 text-xs font-medium text-red-500">
  Inactive
</span>

// Info badge (User)
<span className="inline-flex rounded bg-lime-500/20 px-2 py-0.5 text-xs font-medium text-lime-400">
  Live
</span>

// Info badge (Admin)
<span className="inline-flex rounded bg-purple-500/20 px-2 py-0.5 text-xs font-medium text-purple-400">
  Admin
</span>
```

### Tables

```tsx
<div className="overflow-hidden rounded-lg border border-gray-800 bg-gray-900">
  <table className="w-full">
    <thead className="border-b border-gray-800 bg-gray-800/50">
      <tr>
        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
          Header
        </th>
      </tr>
    </thead>
    <tbody className="divide-y divide-gray-800">
      <tr className="hover:bg-gray-800/30">
        <td className="px-6 py-4 text-sm text-white">
          Data
        </td>
      </tr>
    </tbody>
  </table>
</div>
```

### Loading States

```tsx
// Spinner
<div className="w-8 h-8 border-4 border-lime-400 border-t-transparent rounded-full animate-spin" />

// Skeleton
<div className="animate-pulse space-y-3">
  <div className="h-4 w-24 rounded bg-gray-800" />
  <div className="h-8 w-32 rounded bg-gray-800" />
</div>
```

## Border Radius

- **Small**: `rounded` (4px) - Badges, pills
- **Medium**: `rounded-lg` (8px) - Buttons, inputs, cards (default)
- **Large**: `rounded-xl` (12px) - Modals, large containers
- **Full**: `rounded-full` - Avatars, circular elements

## Shadows & Elevation

- **Default**: `shadow-sm` - Subtle elevation
- **Modal**: `shadow-2xl` - Deep shadows for overlays
- **Dropdown**: `shadow-xl` - Medium elevation

## Hover States & Transitions

Always include transitions for smooth interactions:

```tsx
className="transition-colors duration-300"
className="transition-all duration-200"
className="hover:bg-[#2a2a2a] transition-colors"
```

## Responsive Design

Use Tailwind's responsive prefixes consistently:
- `sm:` - 640px and up
- `md:` - 768px and up
- `lg:` - 1024px and up
- `xl:` - 1280px and up

```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
  Responsive grid
</div>
```

## Accessibility

### Interactive Elements
- All interactive elements must have `min-h-[44px]` minimum
- Icon-only buttons must have `aria-label` attributes
- Form inputs must have associated labels
- Maintain proper color contrast ratios (WCAG AA)

### Focus States
```tsx
className="focus:outline-none focus:ring-2 focus:ring-lime-400 focus:ring-offset-2 focus:ring-offset-[#0a0a0a]"
```

### Keyboard Navigation
Ensure all interactive elements are keyboard accessible with proper tabindex and keyboard event handlers.

## Icons

Use Lucide React icons consistently:
- Regular icons: `w-5 h-5` (20px)
- Small icons: `w-4 h-4` (16px)
- Large icons: `w-6 h-6` (24px)

```tsx
import { Icon } from "lucide-react"

<Icon className="w-5 h-5 text-lime-400" />
```

## Animation Guidelines

- **Duration**: Use `duration-200` for quick interactions, `duration-300` for standard
- **Easing**: Default Tailwind easing is sufficient for most cases
- **Reduce Motion**: Always consider users with motion preferences

```tsx
className="transition-all duration-200 ease-in-out"
className="animate-spin" // For loading spinners
className="animate-pulse" // For live indicators
```

## File Organization

```
components/
├── ui/              # Shadcn components (Card, Button, etc.)
├── auth/            # Authentication components
├── dashboard/       # Dashboard-specific components
├── admin/           # Admin panel components (use purple theme)
├── session/         # Video session components
└── ...
```

## Best Practices

1. **Always prefer Tailwind classes** over inline styles
2. **Use shadcn Card component** instead of manual card styling
3. **Ensure buttons meet accessibility standards** with min-height
4. **Purple for admin, lime for user-facing** - maintain this distinction
5. **Use semantic color names** from the palette consistently
6. **Test hover states** on all interactive elements
7. **Verify responsive behavior** on mobile, tablet, and desktop
8. **Include loading states** for async operations
9. **Provide visual feedback** for user actions
10. **Maintain consistent spacing** using the spacing system

## Code Examples

### Complete Page Layout
```tsx
export default function ExamplePage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white pt-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Page Title</h1>
              <p className="mt-2 text-[#a1a1aa]">Description text</p>
            </div>
            <button className="bg-lime-400 hover:bg-lime-500 text-black font-bold px-6 py-2.5 min-h-[44px] rounded-lg transition-colors">
              Primary Action
            </button>
          </div>

          <Card className="bg-[#1a1a1a] border-[#27272a]">
            <CardContent className="p-6">
              Card content
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
```

## Version History

- **v1.0** (2025-01-12) - Initial design system documentation
  - Established color palette with admin/user distinction
  - Defined typography standards
  - Component patterns and accessibility guidelines
  - Button height requirements
