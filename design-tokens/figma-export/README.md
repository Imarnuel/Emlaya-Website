# Figma token export

A snapshot of the design tokens in the **Emlaya Design** Figma file (`LPXddONZ7IMNlIowbz161x`), taken on 2026-10-23. This is the raw input for the website's design tokens. Don't edit these files by hand: change Figma, then export again.

| File | Figma source | Rows |
|---|---|---|
| `primitives.tsv` | Variable collection **Primitives** (one mode) | 251 |
| `semantic.tsv` | Variable collection **Semantic** (Light and Dark modes) | 309 |
| `icon-size.tsv` | Variable collection **Icon size** (16, 20, 24 and 32px modes) | 2 |
| `text-styles.tsv` | Local text styles | 26 |

**Not exported:** the hidden **Colors** collection (Apple iOS system colours, 9 variables). It isn't part of the Emlaya brand.

## Format

Tab-separated, one variable per row. Variable columns:

- `name`: the Figma variable name, e.g. `Color/text/default`
- `type`: `COLOR`, `FLOAT` or `STRING`
- `scopes`: where Figma lets the variable be applied
- `codeSyntaxWeb`: the code name set in Figma (the mobile app's `theme.*` names)
- `hidden`: `h` if hidden from publishing
- `description`
- one column per mode with the value

Values are written as:

- `#rrggbb` or `#rrggbbaa` for a raw colour
- `@Collection:Name` for a reference to another variable, e.g. `@Primitives:Color/neutral/900`
- `@Collection:Name@N%` for a reference with an opacity, e.g. `@Primitives:Color/white@85%`
- plain numbers and strings otherwise. Numbers are exactly as Figma stores them, so some show float noise such as `-0.10000000149011612`.

## How it was exported

Each collection was read with read-only Figma Plugin API scripts. Each file was checked against an FNV-1a checksum computed inside Figma, so the file content matches Figma exactly. The one exception: 27 colour values stored as "variable + opacity" were exported as `[object Object]`. They were re-read individually from Figma and written in the `@Name@N%` form afterwards.

## Known issues in the source

These come from the Figma file itself and are recorded here, not fixed:

- `Color/blue/300` and `Color/blue/400` have the same value (`#51a2ff`).
- `Color/background/logo/type-neutral` and `Color/background/logo/border` use `#0f1b33`, which isn't in the Primitives palette.
- Near-duplicate names: `Color/green/900 2`, `Color/background/neutral/bolder 2/*`.
- 43 code names (`codeSyntaxWeb`) are shared by more than one variable, e.g. `theme.colors.textBrand` is used for both `Color/text/brand` and `Color/text/brand-bolder`.

Fixed in Figma on 2026-10-23 (no visual change), and reflected in this export:

- Renamed `Type/letter spacing/dislpay/*` to `display` and `Color/surface/transluscent/*` to `translucent`.
- `Heading/h4` letter spacing was bound to a deleted variable. It's now bound to `Type/letter spacing/heading/h4`, which has the same value (-0.1px).
