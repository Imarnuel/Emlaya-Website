# Emlaya website design tokens

Colour, spacing, radius, border, icon and type tokens for the Emlaya website, built from the **Emlaya Design** Figma file (the same tokens the mobile app uses). Text sizes are re-based for the web.

## Use them

| File | For |
|---|---|
| `dist/tailwind.css` | Tailwind CSS v4. Add `@import "tailwindcss";` then import this file. |
| `dist/tokens.css` | Any other CSS. Defines every token as a CSS variable on `:root`, plus `.type-*` text style classes. |
| `dist/tokens.json` | Design token tools such as Style Dictionary. Standard [DTCG](https://www.designtokens.org/) format. |

Tested with Tailwind CSS 4.1.18 and 4.3.3.

In Tailwind, the default palette, fonts, type sizes, radii and spacing scale are switched off. Only Emlaya values exist, so off-brand values can't slip in.

| Token | CSS variable | Tailwind |
|---|---|---|
| Figma `Color/neutral/900` | `--color-neutral-900` | `bg-neutral-900`, `text-neutral-900` |
| Figma `Color/text/default` | `--color-text-default` | `text-text-default` |
| Figma `Color/background/brand/bold/default` | `--color-background-brand-bold-default` | `bg-background-brand-bold-default` |
| Figma `Spacing/400` (16px) | `--spacing-400` | `p-400`, `gap-400`, `mt-400` |
| Figma `Border radius/200` (8px) | `--radius-200` | `rounded-200` |
| Figma `Border width/sm` (1px) | `--border-width-sm` | `border-(length:--border-width-sm)` |
| Figma `icon size` (24px mode) | `--icon-size-24`, `--icon-stroke-24` | `size-(--icon-size-24)` |
| Font roles | `--font-display`, `--font-heading`, `--font-body`, `--font-label` | `font-display`, `font-body` |
| Font weights | `--font-weight-regular`, `-medium`, `-semi-bold`, `-bold` | `font-medium`, `font-semi-bold` |
| Text styles | `--text-heading-h1` (+ `--line-height`, `--letter-spacing`, `--font-weight`) | `type-heading-h1` (the whole style), or `text-heading-h1` (size, line height, spacing) |

Role weights (`--font-weight-display`, `-heading`, `-body`, `-label`, `-label-bold`) are CSS variables only. As Tailwind classes they would clash with the font family classes.

### Fonts

The tokens name the fonts but don't load them. Both are on Google Fonts. In Next.js, load them with `next/font/google`:

- **Zalando Sans SemiExpanded**, weight 600: display and headings
- **Geist**, weights 400, 500 and 600: body text and labels

## Names and values

- **Names** are the Figma design names, in kebab case. They're unique, unlike the mobile code names in Figma (`theme.colors.*`), 43 of which are shared by several tokens. Each token's Figma name is kept in `tokens.json` under `$extensions["com.figma"].name`.
- **Colour, spacing, radius, border width and icon values** are exactly as in Figma, in px. Colours that reference another colour stay references (`--color-text-default: var(--color-neutral-900)`). Colours defined as "colour at an opacity" use `color-mix()`.
- **Only light mode.** The website has no dark mode.

## Left out on purpose

- Dark mode values, and the `dark neutral` and `dark alpha neutral` palettes, which only dark mode uses
- The mobile text sizes, line heights and letter spacing (replaced by the web type scale)
- The code font (Roboto Mono) and code text styles
- Figma's hidden Apple iOS colour collection and the Inter "Linked Text" style

## Web type scale

Defined in `web-typography.json`, the one hand-written input. Edit it there and rebuild.

- Same roles, fonts and weights as the mobile text styles: Display d1–d3, Heading h1–h4, Body, Label, Label Bold.
- Body text is 16px (mobile: 15px). Body and label sizes are fixed.
- Display and heading sizes are fluid: they grow from the phone size at 375px wide to the desktop size at 1280px, and stay put outside that range.
- Sizes are in rem, so they follow the reader's browser text size. Letter spacing is in em, carried over from the mobile styles.

| Style | Phone | Desktop | Line height |
|---|---|---|---|
| display-d1 | 40px | 72px | 1.05 |
| display-d2 | 36px | 60px | 1.1 |
| display-d3 | 32px | 48px | 1.15 |
| heading-h1 | 28px | 40px | 1.2 |
| heading-h2 | 24px | 32px | 1.25 |
| heading-h3 | 20px | 24px | 1.3 |
| heading-h4 | 18px | 20px | 1.4 |
| body-large / base / small / xsmall / tiny | 18 / 16 / 14 / 13 / 12px | same | 28 / 24 / 20 / 18 / 16px |
| label-*, label-bold-* | same sizes as body | same | 24 / 24 / 20 / 18 / 16px |

## Contrast

`node design-tokens/check-contrast.mjs` prints the contrast of every text colour on the main backgrounds. Two to know about:

- `link-default` and `text-brand` (yellow 600) are **2.67:1 on white**, below the 4.5:1 that body text needs. `text-brand-bolder` (yellow 700, 4.52:1) passes.
- `text-subtle` passes on white (4.65:1) but not on `surface-secondary-default` (4.20:1).

## Rebuild

```
node design-tokens/build.mjs
node design-tokens/check-contrast.mjs
```

No dependencies; needs Node 18 or later. To pick up Figma changes, re-export `figma-export/` first (see its README).
