---
name: ui-ux-pro-max-core
description: Universal UI/UX rules for web interfaces — accessibility (WCAG 2.2), touch and interaction, performance, layout and responsive, typography and colour mechanics, animation, forms and feedback, navigation — plus React, Next.js and Tailwind implementation guidelines. Use when designing, building, reviewing or fixing any page or component. Style-neutral by design; it never chooses a visual style, palette or font.
---

# UI/UX Pro Max — Core Rules

A trimmed copy of [UI/UX Pro Max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) (MIT, see `LICENSE`) that keeps only the rules that hold for any design, and drops everything that picks a look.

**Not included, on purpose:** style catalogues, colour palettes, font pairings, product-type style recommendations, landing-page colour strategies, icon-library picks, animation presets, the `--design-system` generator and the search scripts. Visual style, colour, typography, iconography and motion feel come from the project's own brand and design system. If a rule here seems to conflict with the brand system, the brand system wins on *what it looks like*; these rules win on *whether it works* (contrast, target size, focus, reduced motion and so on).

## Rule categories by priority

Work through them in this order. Full rule text: `references/quick-reference.md`.

| Priority | Category | Impact | Must have | Avoid |
|---|---|---|---|---|
| 1 | Accessibility | CRITICAL | Contrast 4.5:1, alt text, keyboard nav, accessible names | Removing focus rings, unlabeled icon buttons |
| 2 | Touch & Interaction | CRITICAL | 24×24 CSS px minimum targets (44×44 preferred on touch), 8px+ spacing, loading feedback | Hover-only interactions, instant 0ms state changes |
| 3 | Performance | HIGH | WebP/AVIF, lazy loading, reserved space (CLS < 0.1) | Layout thrashing, layout shift |
| 4 | Visual Consistency | HIGH | One brand system everywhere, SVG icons (no emoji), one primary CTA per view | Mixing visual languages, emoji as icons |
| 5 | Layout & Responsive | HIGH | Mobile-first, viewport meta, no horizontal scroll | Fixed px container widths, disabled zoom |
| 6 | Typography & Color | MEDIUM | 16px base body, 1.5 line-height, semantic colour tokens | Body text < 12px, grey-on-grey, raw hex in components |
| 7 | Animation | MEDIUM | Motion conveys meaning, spatial continuity, reduced-motion support | One duration everywhere, animating width/height |
| 8 | Forms & Feedback | MEDIUM | Visible labels, error near field, helper text | Placeholder-only labels, errors only at the top |
| 9 | Navigation | HIGH | Predictable back, deep links, active state shown | Overloaded nav, broken back behaviour |
| 10 | Charts & Data | LOW | Legends, tooltips, accessible colours | Colour as the only signal |

## Detailed references

Read on demand; grep rather than loading whole files.

| Need | File |
|---|---|
| All rules, one line each — review/audit pass | `references/quick-reference.md` |
| Web UX rules with do/don't and code examples | `data/ux-guidelines.csv` |
| React/Next.js performance | `data/react-performance.csv` |
| Next.js implementation | `data/stacks/nextjs.csv` |
| React implementation | `data/stacks/react.csv` |
| Tailwind implementation | `data/stacks/html-tailwind.csv` |

Example: `grep -i "focus" data/ux-guidelines.csv`.

Code examples in these files are illustrations (a sample font name, a sample grey). They are not recommendations to use that font or colour.

## Before delivering a page

- [ ] Reviewed `references/quick-reference.md` §1–§5 (CRITICAL + HIGH) as a final pass
- [ ] Works at 320px, 375px, 768px, 1024px and 1440px, with no horizontal scroll
- [ ] Every interactive element reachable and operable by keyboard, with visible focus
- [ ] Text contrast ≥ 4.5:1 (≥ 3:1 for large text and non-text UI), checked in every theme the site ships
- [ ] Reduced-motion respected: content is fully usable and readable with motion off
- [ ] Images sized or aspect-ratio'd, below-the-fold media lazy-loaded, no layout shift
- [ ] Loading, empty, error and success states present wherever they apply
