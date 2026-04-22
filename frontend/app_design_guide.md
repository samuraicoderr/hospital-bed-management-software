# Bedflow App Design Guide

This guide documents the current visual system used in the main app shell and dashboard experience.
It is implementation-aligned and intentionally excludes the auth area.

## 1) Brand Direction

- Product tone: calm, operational, trustworthy, founder-focused.
- Visual strategy: clean white surfaces with neutral grays, anchored by green action accents.
- Interaction style: soft transitions, lightweight motion, readable density over decorative complexity.

## 2) Theme Tokens

### Core color tokens

```css
:root {
	--background: #ffffff;
	--foreground: #171717;
	--brand-green: #0F6E56;
	--brand-green-light: #E1F5EE;
}
```

### Functional color mapping

- Primary action: `#0F6E56`
- Primary hover: `#0a5a44`
- Primary soft background: `#E1F5EE`
- Body text: `#171717`
- Muted text range: Tailwind gray `400 -> 600`
- Border baseline: Tailwind gray `200`
- Surface baseline: `#ffffff`

### Domain color system (plan + component semantics)

Plan types:

- Operator: `color #534AB7`, `bg #EEEDFE`
- Fundraising: `color #0F6E56`, `bg #E1F5EE`
- Strategic: `color #854F0B`, `bg #FAEEDA`

Component types:

- KPI: `accent #534AB7`, `bg #EEEDFE`
- Sheet: `accent #0F6E56`, `bg #E1F5EE`
- Chart: `accent #854F0B`, `bg #FAEEDA`
- Statement: `accent #993C1D`, `bg #FAECE7`
- Calendar: `accent #993556`, `bg #FBEAF0`

## 3) Typography

### Font stack

- Primary UI font: Geist Sans (`--font-geist-sans`)
- Mono/support font: Geist Mono (`--font-geist-mono`)
- Brand wordmark font: Bobbleboddy local font (`--font-logo`)

### Usage rules

- Global body text uses `--font-sans`.
- The brand wordmark class `.logo-text-font` is reserved for logo/name moments.
- Keep dense UI text in `text-sm` and `text-xs`; titles in `text-lg` to `text-xl`.

### Typographic rhythm

- Section headings: semibold (600), gray `800` or `900`
- Row/item titles: semibold, truncate when needed
- Metadata: `text-xs`, gray `400` to `500`
- Labels/chips: `text-[10px]` to `text-xs`, semibold

## 4) Spacing, Radius, and Shape

### Spacing system

- Base app shell gutter: `px-4 sm:px-6 lg:px-8`
- Section vertical rhythm: `mb-4` to `mb-10`
- Card internal spacing: `p-3`, `p-4`
- Dense controls: `px-3 py-1.5`

### Radius system

- Chips and pills: `rounded-full`
- Inputs and small controls: `rounded-lg`
- Cards/containers: `rounded-xl`
- Feature blocks and big icon wells: `rounded-2xl`

### Borders and elevation

- Default boundary: `border border-gray-200`
- Hover emphasis: `border-gray-300`
- Elevation on hover: `shadow-md` or `shadow-lg`
- Motion-lift pattern: `hover:-translate-y-0.5`

## 5) Layout System

### App shell

- Full viewport shell: `h-screen w-full`.
- Left sidebar and right content split.
- Main content column is scroll-contained (`overflow-y-auto`) while top header stays fixed in flow.

### Sidebar behavior

- Desktop width: `240px`
- Mobile drawer width: `280px`
- Mobile overlay: `bg-black/30` with `backdrop-blur-sm`
- Slide transition: `duration-300 ease-in-out`

### Content container

- Max content width: `max-w-6xl`
- Centered layout with responsive horizontal padding.

## 6) Motion and Feedback

### Core animation tokens

- `fade-in-up` for list/grid entrance.
- `logo-pulse` and `loading-bar` for startup loading state.
- `shimmer` utility for skeleton-ready surfaces.

### Motion characteristics

- Most interactions run between `150ms` and `300ms`.
- Hover state patterns combine subtle color shift + lift.
- Lists use staggered delays (`0.05s` increments).

### Accessibility and reduced motion

- `prefers-reduced-motion` disables non-essential animation.
- Focus-visible ring uses brand green (`#0F6E56`) with clear offset.
- Disabled controls use reduced opacity and blocked interaction.

## 7) Component Styling Patterns

### Buttons

- Primary: dark neutral (`bg-gray-900`) in shared UI button primitive.
- Contextual CTA in planning surfaces: brand green (`#0F6E56`).
- Ghost: transparent with light gray hover.
- Required interaction states: hover, focus-visible, disabled.

### Inputs

- Search input style: light gray fill (`bg-gray-100`), no heavy border, rounded-lg.
- Focus ring: `focus:ring-[#0F6E56]/30` and optional white surface transition.

### Cards

- Templates and plans use white or near-white cards with `border-gray-200`.
- Add hover lift + soft shadow + slight overlay for call-to-action reveal.
- Use tiny metadata chips/badges to keep scan speed high.

### Chips and status pills

- Plan type chip foreground/background pair must come from plan type mapping.
- Keep chip text at `text-[10px]` or `text-xs` semibold.

### Iconography

- Use Lucide set consistently.
- Icon default tones: gray `400` to `600`.
- Brand green only for active/primary intent.

## 8) Scroll and Overflow Behavior

- Horizontal template rails hide default scrollbar (`scrollbar-hide`).
- Vertical content panes use thin custom scrollbar (`scrollbar-thin`).
- Preserve overflow clipping on cards with overlays (`overflow-hidden`).

## 9) Responsive Behavior

- Mobile-first by default.
- Common shift points:
	- Compact labels on small screens (`sm:hidden`/`sm:inline`).
	- Sidebar becomes slide-in drawer below `lg`.
	- Plan list columns progressively reveal at `md` and `lg`.
	- Grid scales from 1 to 2 to 3 columns (`sm`, `lg`).

## 10) Brand Assets

### Logos

- Green logo: `/app-logos/bedflow-logo-green.png`
- Dark logo: `/app-logos/bedflow-logo-black.png`
- White logo: `/app-logos/bedflow-logo-white.png`
- SVG variants available for each logo color.

### Avatars and fallback media

- Default avatar: `/media/avatars/default-avatar.png`
- Example avatar for mock/demo states: `/media/avatars/samuraicoderr.png`

### Fonts

- Brand logo font asset: `/fonts/Bobbleboddy.ttf`

## 11) Practical Do and Dont

Do:

- Keep primary actions green and secondary actions neutral.
- Use semantic type colors from config, not ad-hoc hex values.
- Preserve soft, low-contrast surfaces with clear hierarchy.
- Maintain consistent radius tiers (`lg`, `xl`, `2xl`).

Dont:

- Do not introduce dark theme styling in this app shell without a dedicated theme spec.
- Do not overload screens with strong saturated backgrounds.
- Do not use auth-area UI patterns as references for this document.

## 12) Copy/Paste Token Snippets

### Primary action button

```tsx
className="text-sm font-medium text-white bg-[#0F6E56] hover:bg-[#0a5a44] px-3 py-1.5 rounded-lg shadow-sm transition-colors"
```

### Soft success/brand pill

```tsx
className="bg-[#E1F5EE] text-[#0F6E56] border border-[#0F6E56]/20"
```

### Standard card shell

```tsx
className="bg-white border border-gray-200 rounded-xl hover:border-gray-300 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
```

## 13) Source of Truth

When implementing new surfaces in the main app, follow this priority order:

1. Token and mapping values from `lib/appconfig.ts`.
2. Global behavior and motion utilities from `app/globals.css`.
3. Existing shell/component patterns from sidebar, top header, templates, and plan list modules.

This keeps new UI consistent while still allowing product-specific composition.
