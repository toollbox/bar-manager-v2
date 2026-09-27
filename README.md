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
