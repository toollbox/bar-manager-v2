const DEFAULT_INVENTORY_IMAGE =
  "https://images.unsplash.com/photo-1752141918855-b7f49e1b11ed?auto=format&fit=crop&w=640&q=80";

const DEFAULT_COCKTAIL_IMAGE =
  "https://images.unsplash.com/photo-1576670393064-0063c3492d38?auto=format&fit=crop&w=640&q=80";

export function getDefaultCatalogImage(kind: "inventory" | "cocktail") {
  return kind === "cocktail"
    ? DEFAULT_COCKTAIL_IMAGE
    : DEFAULT_INVENTORY_IMAGE;
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
}: {
  imagePath?: string | null;
  imageUrl?: string | null;
  kind?: "inventory" | "cocktail";
}) {
  return (
    (imagePath ? getStorageImageUrl(imagePath) : null) ||
    imageUrl ||
    getDefaultCatalogImage(kind)
  );
}
