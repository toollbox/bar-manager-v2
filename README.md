# Bar Manager

A bar operations application for branded inventory, flexible cocktail recipes,
service production, purchasing, and AI-assisted recommendations.

## Prerequisites

- Node.js 24 LTS (see `.nvmrc`)
- npm 11+
- Docker Desktop running for the local Supabase database, authentication, and storage

This repository currently includes a project-local Node installation in
`.tools/node` for development on this machine. The directory is ignored by Git.

## Start the app on this Mac

Node.js does not need to be started as a separate service. Select the installed
Node version in your terminal, then `npm run dev` starts the application using it.

1. Open a terminal in VS Code or Terminal and enter the project directory:

```bash
cd /Users/roman/Documents/code/bar-manager-v2
```

2. Load `nvm` and select Node.js 24 from the project's `.nvmrc`:

```bash
source /Users/roman/.nvm/nvm.sh
nvm use
node --version
npm --version
```

Run these commands in each new terminal. If Node 24 is not installed in `nvm`,
run `nvm install` once from the project directory, then `nvm use`.

3. Open Docker Desktop:

```bash
open -a Docker
```

Wait until Docker Desktop says its engine is running before continuing.

4. Start the local database services and apply any pending migrations:

```bash
npx supabase start -x studio
npx supabase migration up --local
```

5. Start the web application:

```bash
npm run dev
```

Keep this terminal open. When it prints `Ready`, open
[http://localhost:3000](http://localhost:3000). Code changes refresh automatically.

### First setup or after dependency changes

Run `npm ci` after selecting Node, before starting the application, when setting
up a fresh checkout or after `package.json` / `package-lock.json` changes. It is
not required every time you start the app. The existing `.env.local` on this
machine is already configured; see Environment below for a fresh checkout.

### If `node`, `npm`, or `nvm` is not found

From the project directory, activate the existing project-local toolchain:

```bash
export PATH="$PWD/.tools/node/bin:$PATH"
node --version
npm --version
```

Then continue with the Docker, Supabase, and `npm run dev` steps above. This
fallback applies to this machine; `.tools/node` is not included in Git.

### Stop and restart

- Press **Ctrl+C** in the app's terminal to stop the web server.
- Run `npm run dev` to start it again in the same terminal.
- To stop the local database services while retaining their data, run
  `npx supabase stop` after stopping the web server.
- If Next.js reports that port 3000 is occupied, check whether the app is already
  running in another terminal. Use the URL printed by the server if it chooses a
  different port.

### Run a production build locally

With Supabase running and `.env.local` configured:

```bash
npm run build
npm start
```

Stop the development server first so both servers do not compete for port 3000.

## Local Supabase

Docker Desktop must be running. Start the local stack with Studio excluded
until Docker Desktop has permission to access the macOS Documents folder:

```bash
npx supabase start -x studio
```

The local API runs at `http://127.0.0.1:54321`. To inspect service status and local
credentials, run `npx supabase status`. The application reads its local API URL
and publishable key from the ignored `.env.local` file.

## Validation

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

## Environment

For a fresh checkout, copy `.env.example` to `.env.local` only if `.env.local`
does not already exist. After starting Supabase, obtain the local publishable
key with `npx supabase status`, then set these two values:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<local publishable key from Supabase status>
```

Use the **publishable** key, not the secret or service-role key. Restart
`npm run dev` after changing `.env.local`. Never commit `.env.local` or
service-role credentials.

## Domain model

Recipes refer to a generic ingredient such as `Vodka`, optionally with a
preferred or required branded product. Inventory is held against exact products
such as `Smirnoff No. 21` or `Grey Goose Original`. Production records the exact
product poured so stock, cost, substitutions, and forecasts remain accurate.

Recipes display both milliliters and US fluid ounces, for example
`50 ml (≈1.69 fl oz)`. Inventory products have a saved **Stock unit** selector
beside package size: liquids support ml or US fl oz; counted items use each,
and weighed items use grams. Package size, on-hand stock, reorder levels, and
target stock use that one chosen unit, such as `400 ml` or `13 fl oz`. Changing
the unit converts existing amounts and preserves the physical stock. The
inventory forms do not ask for package cost, and purchasing does not show cost
estimates. Stock movements and purchase receipts default to the product's
saved unit. Recipe amount entry still supports either liquid unit and shows
a conversion preview. Ounces here mean US **fluid** ounces.
The General Products **Base unit** dropdown has four separate choices:
`g`, `ml`, `fl oz`, and `each`. Its saved choice supplies the default for new
branded products and recipe entry. Changing between ml and fl oz does not
reinterpret existing inventory amounts or override branded products' units.
The **Category** dropdown includes 20 common bar ingredient categories, covering
spirits, liqueurs, wine, beer, mixers, juices, syrups, bitters, produce, garnishes,
and other bar essentials. Existing organization categories remain available in
both create and edit forms, including custom categories from archived items.

Conversions use `1 US fl oz = 29.5735295625 ml`, from the US liquid gallon
definition in [NIST's measurement tables](https://www.nist.gov/document/2025-nist-handbook-44-appx-c).
The server converts inputs to the ingredient's canonical unit after checking
its organization and unit compatibility. Liquid stock remains stored in ml;
there is no need to change existing ingredients or recipes. Migration
`20261113180000_volume_unit_precision.sql` expands quantity precision to retain
conversions through production, ledger entries, and history. Only display
values are rounded; displayed ounce equivalents use `≈`.
Migration `20261113181000_product_stock_units.sql` backfills existing products
with their ingredient's base unit and adds a validated per-product stock unit.
Migration `20261113182000_ingredient_default_units.sql` persists the General
Products unit choice, retaining canonical ml for liquid stock calculations.

Inventory categories and branded products can use an external HTTPS image or a
custom upload. Uploads are stored in the public `catalog-images` Supabase Storage
bucket, limited to 5 MB, and restricted to JPEG, PNG, WebP, and AVIF files.
Write access is limited to owners and managers in the item's organization.

The six starter cocktails have individual photographs bundled in
`public/images/cocktails`, used automatically on the Cocktails and Service
pages when a drink has no custom image. Uploaded images take priority, followed
by an external image URL, then the matching bundled photo. Matching ignores
case/punctuation and accepts “Gin & Tonic” and “Whisky Sour” spellings. Other
cocktails use the general cocktail photo until an owner/manager chooses one.
Photo authors, Wikimedia Commons sources, and individual image licenses are
listed in `public/images/cocktails/credits.json` and shown below default photos.
To restore missing bundled assets, run `node scripts/download-cocktail-photos.mjs`.

Inventory also includes 15 local reference photographs covering the 14 starter
ingredients and 15 starter products. Known products match by brand and product
name; other products use their ingredient's photo, labeled as an ingredient
reference. Custom uploads and image URLs always take priority. Bottle reference
photos show the entire bottle; packaging and sizes may differ from your stock.
Sources and licenses are in `public/images/inventory/credits.json`, with credits
below ingredient images and under “Photo credit” in product rows. Restore missing
assets with `node scripts/download-inventory-photos.mjs`.

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
and support receiving the delivery into inventory.

Owners can load a repeat-safe starter bar from the dashboard. It includes 14
common ingredients, 15 stocked products with opening balances and reorder
targets, and six complete classic cocktail recipes.

## Workspace management

In **Settings → Appearance**, choose **Warm Linen**, **Midnight Brass**,
**Botanical**, **Cobalt**, or **Bordeaux**, then click **Save theme**. Each theme
defines the application palette, heading typography, form surfaces, and corner
styles. Warm Linen is the default. A saved choice applies immediately across
the application and follows the user's account across sessions, devices, and
workspaces. Owners, managers, and bartenders can each choose their own theme.
Preferences are stored in `user_preferences` with row-level security limiting
access to the signed-in user's own row. Migration
`20261113183000_user_theme_preferences.sql` creates the preferences table;
`20261113183100_theme_preferences_grants.sql` limits its granted operations.

Use the navigation bar to select the current location. Inventory, purchasing,
service, dashboard totals, and reports all use that selection. Owners can add
locations and invite teammates from Settings. Invitation codes expire after
seven days and can only be accepted by a verified account with the recipient's
email. Codes are shared manually; the app does not send invitation email yet.
Owners can change roles or remove members, but cannot remove the last owner.

Inventory supports editing details, measurement units and stock targets, plus archiving and
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
