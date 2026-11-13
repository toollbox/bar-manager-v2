import cocktailPhotos from "../../public/images/cocktails/credits.json";
import inventoryPhotos from "../../public/images/inventory/credits.json";

const DEFAULT_INVENTORY_IMAGE =
  "https://images.unsplash.com/photo-1752141918855-b7f49e1b11ed?auto=format&fit=crop&w=640&q=80";

const DEFAULT_COCKTAIL_IMAGE =
  "https://images.unsplash.com/photo-1576670393064-0063c3492d38?auto=format&fit=crop&w=640&q=80";

export function getDefaultCatalogImage(
  kind: "inventory" | "cocktail",
  name?: string,
) {
  return kind === "cocktail"
    ? ((name ? getCocktailPhoto(name)?.src : undefined) ??
        DEFAULT_COCKTAIL_IMAGE)
    : ((name ? getInventoryPhoto({ name })?.src : undefined) ??
        DEFAULT_INVENTORY_IMAGE);
}

export function getStorageImageUrl(path: string) {
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!baseUrl) return null;

  return `${baseUrl}/storage/v1/object/public/catalog-images/${path
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;
}

export function resolveCatalogImage({
  imagePath,
  imageUrl,
  kind = "inventory",
  name,
}: {
  imagePath?: string | null;
  imageUrl?: string | null;
  kind?: "inventory" | "cocktail";
  name?: string;
}) {
  return (
    (imagePath ? getStorageImageUrl(imagePath) : null) ||
    imageUrl ||
    getDefaultCatalogImage(kind, name)
  );
}
export type CatalogPhotoCredit = {
  author: string;
  source: string;
  license: string;
  licenseUrl: string | null;
};

function normalizeCocktailName(name: string) {
  return name
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/\bwhisky\b/g, "whiskey")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function getCocktailPhoto(name: string) {
  const normalized = normalizeCocktailName(name);
  return cocktailPhotos.find(
    (photo) => normalizeCocktailName(photo.name) === normalized,
  );
}

function normalizeInventoryName(name: string) {
  return name
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function getInventoryPhoto({
  name,
  brand,
  ingredientName,
}: {
  name: string;
  brand?: string;
  ingredientName?: string;
}) {
  const productName = brand
    ? normalizeInventoryName(`${brand} ${name}`)
    : undefined;
  const exact = productName
    ? inventoryPhotos.find((photo) =>
        photo.products.some(
          (product) => normalizeInventoryName(product) === productName,
        ),
      )
    : undefined;
  const ingredient = normalizeInventoryName(ingredientName ?? name);
  const photo =
    exact ??
    inventoryPhotos.find((photo) =>
      photo.ingredients.some(
        (name) => normalizeInventoryName(name) === ingredient,
      ),
    );
  return photo
    ? {
        ...photo,
        fit:
          photo.fit === "contain" ? ("contain" as const) : ("cover" as const),
        isIngredientReference: Boolean(brand && !exact),
      }
    : undefined;
}
