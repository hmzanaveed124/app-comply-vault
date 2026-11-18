# ComplyVault UI and themes

## Change the design in one place

Edit `src/theme/config.ts`. The `designSystem` object owns the brand, fonts, base font size, radius, control height, light/dark surfaces and sidebar dimensions. `createAppTheme()` owns Ant Design seed tokens and component overrides. `getThemeVariables()` derives semantic CSS variables from those same resolved tokens; do not copy colours into pages.

The root layout registers server-rendered Ant Design styles with `AntdRegistry` and mounts one `ThemeProvider` around every route. This covers authentication, the signed-in application, overlays and demo routes. Use `App.useApp()` for notifications or confirmation dialogs so that they inherit the provider; avoid Ant Design's static notification/modal APIs.

The theme button in the top bar switches light/dark mode and saves `complyvault-theme` in local storage. A small head-start script restores the root class before hydration. Dark mode can also be selected with `useAppTheme().setMode("dark")`. The HTML root is the scope for CSS variables, so body portals and custom SVG/chart styles inherit them too.

## Component styles

- `src/components/ui/controls.module.css`: reusable control, card, badge and alert structure.
- `src/components/ui/overlays.module.css`: dialog structure and responsive actions.
- `src/styles/globals.css`: Tailwind-to-token aliases, base styles and shared animations.

Use semantic classes such as `bg-surface-card`, `text-text-secondary`, `border-surface-border`, `bg-warning-bg` and `text-warning-text`. For CSS modules and charts use `var(--cv-brand)`, `var(--cv-surface-card)`, etc. CSS cascade order is declared before server-rendered styles: base → Ant Design → component modules → utility overrides. Keep shared CSS modules inside `@layer components` so existing per-use layout classes can override them.

Structural sizes can stay local when they describe an individual layout. Theme-specific colours belong in `config.ts`.

## Ant Design migration

Existing imports from `~/components/ui/*` are kept to avoid rewriting business logic. The shared Button, Input, Textarea, Card, Badge, Alert, Select, Tabs, Dialog, Sheet, Tooltip, Separator and toast renderer now use Ant Design. The user menu uses Ant Design Dropdown/Avatar, and the virtual table uses Ant Design Checkbox. RadioGroup uses Ant Design Radio.

Compatibility details:

- Buttons preserve `type="submit"`, disabled state, refs and `asChild` links.
- Input/Textarea refs resolve to native fields for react-hook-form. File inputs remain native browser inputs.
- Select/Tabs translate the existing compound JSX into Ant Design options/items. Select keeps a native form value for named fields and supports controlled/uncontrolled state and keyboard selection.
- Modal/Drawer own portals, keyboard focus and dismissal. Existing title/description components continue to work.
- Toast calls continue using the existing store, rendered through the themed Ant Design notification context.

Purpose-built virtual tables, native semantic table markup, command search and upload interactions retain their existing behaviour and now consume shared theme tokens. Unused legacy UI modules and Radix type imports remain for compatibility; this change does not claim to remove every Radix dependency. It does not change API contracts, authentication, data retention or database schema.

## Validation and preview

Run `npm run typecheck`, `npm run test:ui` and `npm test`. The focused UI suite checks theme persistence, refs, native form submissions, keyboard selection, labelled dialogs, drawer dismissal and tabs. `src/theme/test-setup.ts` supplies jsdom browser shims only for that suite.

Run the development server and open `/theme-preview` for a representative control gallery. This route returns 404 in production. Check real authenticated dashboard/review/settings pages, mobile navigation and light/dark overlays before merging. The development gallery has no backend dependency.

For a production compilation without applying migrations, use `next build` directly. The application's normal `npm run build` script also handles database deployment. Build/page-data collection requires `DATABASE_URL`; use an isolated development database for application verification.
