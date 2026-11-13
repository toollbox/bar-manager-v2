# Bar Manager

A bar operations application for branded inventory, flexible cocktail recipes,
service production, purchasing, and AI-assisted recommendations.

## Prerequisites

- Node.js 24 LTS (see `.nvmrc`)
- npm 11+

This repository currently includes a project-local Node installation in
`.tools/node` for development on this machine. The directory is ignored by Git.

## Development

If Node is installed globally or through `nvm`:

```bash
npm ci
npm run dev
```

Using the project-local toolchain:

```bash
export PATH="$PWD/.tools/node/bin:$PATH"
npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Local Supabase

Docker Desktop must be running. Start the local stack with Studio excluded
until Docker Desktop has permission to access the macOS Documents folder:

```bash
npx supabase start -x studio
```

The local API runs at `http://127.0.0.1:54321`. Local credentials are generated
by the Supabase CLI and stored only in the ignored `.env.local` file.

## Validation

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

## Environment

Copy `.env.example` to `.env.local` when the Supabase project is connected.
Never commit `.env.local` or service-role credentials.

## Domain model

Recipes refer to a generic ingredient such as `Vodka`, optionally with a
preferred or required branded product. Inventory is held against exact products
such as `Smirnoff No. 21` or `Grey Goose Original`. Production records the exact
product poured so stock, cost, substitutions, and forecasts remain accurate.

Inventory categories and branded products can use an external HTTPS image or a
custom upload. Uploads are stored in the public `catalog-images` Supabase Storage
bucket, limited to 5 MB, and restricted to JPEG, PNG, WebP, and AVIF files.
Write access is limited to owners and managers in the item's organization.

Cocktail recipes use one of three product-selection rules: any available brand,
prefer a named product while allowing substitution, or require an exact product.
The database enforces that preferred products belong to the recipe ingredient
and the same organization.

During service, the bartender selects the exact product used for each recipe
ingredient. Drink production runs as one locked database transaction: it checks
live stock and recipe rules, records exact product usage, writes inventory
movements, updates balances, and creates production history together.

The operations dashboard reports live product, recipe, low-stock, and daily
production totals. Purchasing recommendations refill products from their
reorder point to target stock, round quantities to whole bottles when possible,
estimate cost, and support receiving the delivery into inventory.

Owners can load a repeat-safe starter bar from the dashboard. It includes 14
common ingredients, 15 stocked products with opening balances and reorder
targets, and six complete classic cocktail recipes.

## Workspace management

Use the navigation bar to select the current location. Inventory, purchasing,
service, dashboard totals, and reports all use that selection. Owners can add
locations and invite teammates from Settings. Invitation codes expire after
seven days and can only be accepted by a verified account with the recipient's
email. Codes are shared manually; the app does not send invitation email yet.
Owners can change roles or remove members, but cannot remove the last owner.

Inventory supports editing details, costs and stock targets, plus archiving and
restoring catalog items. Base units are fixed once an ingredient is in use.
Production history stores recipe/product snapshots so later recipe edits and
catalog renames do not rewrite historical pours. Reports include date filters,
pagination, popular drinks, and product consumption. Daily boundaries and report
timestamps use the selected location's timezone, including daylight saving.

The starter loader preserves existing recipes, removed recipe lines, stock
targets, availability settings, and inventory balances on subsequent runs.

## Database and browser regression checks

Start Docker and local Supabase, then apply pending migrations:

```bash
npx supabase start -x studio
npx supabase migration up --local
npx supabase db lint --local --level warning
npm run test:integration
npx playwright install chromium
npm run test:e2e
```

Integration tests cover stock-write permissions, concurrent pours, request
deduplication, recipe snapshots, repeat imports, invitations, role restrictions,
report isolation, and daylight-saving boundaries. Tests create isolated local
accounts and organizations and remove their fixtures afterward. Browser tests
start the application automatically and exercise the owner workflow.

Next.js is pinned to 16.4.6. A scoped `minimatch` override applies the published
security fix to TypeScript ESLint's glob matcher until its dependency range is
updated upstream. No service-role key is needed by the application; local tests
read local Supabase credentials in memory and refuse non-local API addresses.
