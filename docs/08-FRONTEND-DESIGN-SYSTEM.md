# 08 — Frontend Design System

## 1. The one hard rule
**NO GRADIENTS.** Not on buttons, backgrounds, heroes, cards, charts, text or images.
Forbidden: `bg-gradient-*`, `from-*`, `via-*`, `to-*` (gradient stops), `linear-gradient(`, `radial-gradient(`,
`conic-gradient(`, `bg-clip-text` with gradients. Recharts areas and bars use **solid fills** (no `<linearGradient>` defs).
Depth comes from **solid colour blocks, borders and soft shadows**, not colour blends.

> Quick check before each commit: `grep -rnE "gradient|from-|via-" client/src` should return nothing relevant.

## 2. Palette
| Token | Hex | Use |
|---|---|---|
| `emerald` | `#055F46` | Primary buttons, sidebar, links, active states, headings accent |
| `emerald-dark` | `#044A37` | Button hover, pressed |
| `emerald-darker` | `#03382A` | Text on mint, footer |
| `mint` | `#A7F3D0` | Accent chips, selected rows, progress fill on dark, highlights |
| `mint-soft` | `#D9FBEA` | Subtle backgrounds, hover rows, info boxes |
| `cream` | `#FFF8E7` | **Page background** |
| `cream-dark` | `#F5EBD0` | Section dividers, alternating blocks, borders on cream |
| `surface` | `#FFFFFF` | Cards, modals, inputs |
| `ink` | `#1C2B26` | Body text |
| `ink-muted` | `#5B6B65` | Secondary text |
| `line` | `#E6DFCC` | Borders on cream/white |
| `success` | `#15803D` | |
| `warning` | `#B45309` | |
| `danger` | `#B91C1C` | |
| `info` | `#1D4E89` | |

Contrast: emerald on cream ≈ 8.9:1 and white on emerald ≈ 8.3:1 (both pass AA). **Never** put white text on mint;
use `emerald-darker` on mint.

## 3. Tailwind v4 setup
`vite.config.js`
```js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
export default defineConfig({ plugins: [react(), tailwindcss()] });
```

`src/index.css`
```css
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@400;500;600&display=swap');
@import "tailwindcss";

@theme {
  --color-emerald: #055F46;
  --color-emerald-dark: #044A37;
  --color-emerald-darker: #03382A;
  --color-mint: #A7F3D0;
  --color-mint-soft: #D9FBEA;
  --color-cream: #FFF8E7;
  --color-cream-dark: #F5EBD0;
  --color-surface: #FFFFFF;
  --color-ink: #1C2B26;
  --color-ink-muted: #5B6B65;
  --color-line: #E6DFCC;
  --color-success: #15803D;
  --color-warning: #B45309;
  --color-danger: #B91C1C;
  --color-info: #1D4E89;

  --font-display: "Plus Jakarta Sans", system-ui, sans-serif;
  --font-sans: "Inter", system-ui, sans-serif;

  --radius-card: 1rem;
  --shadow-card: 0 1px 2px rgb(28 43 38 / 0.06), 0 4px 16px rgb(28 43 38 / 0.06);
}

html, body { background-color: var(--color-cream); color: var(--color-ink); font-family: var(--font-sans); }
h1, h2, h3, h4 { font-family: var(--font-display); }
```
Note: the custom `emerald` token **replaces** Tailwind's built-in emerald scale names like `emerald-500`. Use only the tokens above.

## 4. Typography
| Style | Classes |
|---|---|
| Display (landing hero) | `font-display text-4xl md:text-6xl font-extrabold tracking-tight` |
| H1 page title | `font-display text-2xl md:text-3xl font-bold` |
| H2 section | `font-display text-xl font-semibold` |
| Body | `text-base text-ink` |
| Small / meta | `text-sm text-ink-muted` |
| Label | `text-sm font-medium text-ink` |

## 5. Core components (in `components/ui/`)
| Component | Spec |
|---|---|
| **Button** | Variants: `primary` (`bg-emerald text-white hover:bg-emerald-dark`), `secondary` (`bg-mint text-emerald-darker hover:bg-mint/80`), `outline` (`border border-emerald text-emerald hover:bg-mint-soft`), `ghost`, `danger`. Sizes sm/md/lg. `rounded-xl`, `focus-visible:ring-2 ring-emerald ring-offset-2 ring-offset-cream`. Loading spinner. |
| **Card** | `bg-surface rounded-[var(--radius-card)] border border-line shadow-[var(--shadow-card)] p-6` |
| **Input / Select / Textarea** | `bg-surface border border-line rounded-xl px-4 py-2.5 focus:border-emerald focus:ring-2 focus:ring-mint` and error state `border-danger` |
| **Badge / StatusBadge** | Pill with **solid** soft colours. Map: pending→`bg-cream-dark text-warning`, approved/published/completed→`bg-mint text-emerald-darker`, rejected/failed→`bg-red-100 text-danger`, active→`bg-emerald text-white` |
| **Stepper** | Profile wizard steps. Done = emerald circle with check, current = emerald ring, upcoming = `line` border |
| **ProgressBar** | Track `bg-cream-dark`, fill `bg-emerald` (solid) |
| **Sidebar** | `bg-emerald text-white`. Active item `bg-mint text-emerald-darker rounded-xl`. Hover `bg-emerald-dark` |
| **Topbar** | `bg-surface border-b border-line`, with language switcher (EN / ES pill toggle) and notification bell with badge count |
| **Table** | Header `bg-cream-dark text-ink-muted text-xs uppercase`, rows `hover:bg-mint-soft` |
| **EmptyState** | Illustration (see 13) + title + text + action button |
| **Modal** | `bg-surface rounded-2xl`, backdrop `bg-ink/40` (solid with opacity, not a gradient) |
| **TagInput** | For skills, hobbies, goals. Chips `bg-mint-soft text-emerald-darker` |
| **PathwayTimeline** | Vertical timeline. Numbered emerald nodes, phase label chip, programme card with match score bar and reason |
| **DynamicField** | Renders a `ProgrammeField` definition into the right input type |
| **ReadOnlyRemarks** | Card with `border-l-4 border-emerald bg-mint-soft` and a lock icon: "Remarks from your organization (read-only)" |

## 6. Layout
- Page background is always `bg-cream`.
- Dashboard layout: fixed sidebar 264px (collapsible on mobile into a drawer) + topbar + content `max-w-7xl mx-auto p-4 md:p-8`.
- Grid gaps `gap-6`. Section spacing `space-y-8`.
- Responsive breakpoints: mobile-first. Tables become stacked cards below `md`.
- Landing page sections alternate `bg-cream` and `bg-surface`, with one solid `bg-emerald` call-to-action band (white text).

## 7. Charts (recharts)
- Series colours, in order: `#055F46`, `#A7F3D0`, `#1D4E89`, `#B45309`, `#5B6B65`. For the mint series, add a `#055F46` stroke so it stays visible on white.
- Solid `fill`. No `<defs><linearGradient>`. Grid lines `#E6DFCC`.

## 8. Iconography and imagery
- Icons: `lucide-react`, stroke 1.75, sizes 16/20/24.
- Photos: natural, warm-toned, real people learning and working (see 13). Use rounded corners `rounded-2xl`.
- To make photos feel on-brand **without gradients**: place them on a solid `bg-mint` or `bg-emerald` block offset behind
  them (`relative` + an absolutely positioned solid shape), or use a solid emerald overlay at 60% opacity for text-on-image.

## 9. Accessibility
- All interactive elements are keyboard reachable with a visible focus ring.
- Form errors are linked with `aria-describedby`. Icons-only buttons need `aria-label` (translated).
- `lang` attribute on `<html>` follows the current language.
