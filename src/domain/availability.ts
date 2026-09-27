export type StockProduct = {
  id: string;
  ingredientId: string;
  label: string;
  quantity: number;
  isAvailable: boolean;
};

export type AvailabilityRecipeLine = {
  lineId: string;
  ingredientId: string;
  ingredientName: string;
  unit: "ml" | "g" | "each";
  required: number;
  selectionPolicy: "any_product" | "prefer_product" | "require_product";
  preferredProductId: string | null;
};

export type LineAvailability = AvailabilityRecipeLine & {
  available: number;
  canMake: boolean;
  products: StockProduct[];
};

export function calculateCocktailAvailability(
  recipe: AvailabilityRecipeLine[],
  stock: StockProduct[],
) {
  const lines: LineAvailability[] = recipe.map((line) => {
    const candidates = stock
      .filter((product) =>
        product.ingredientId === line.ingredientId &&
        product.isAvailable &&
        product.quantity > 0 &&
        (line.selectionPolicy !== "require_product" ||
          product.id === line.preferredProductId),
      )
      .sort((left, right) => {
        if (left.id === line.preferredProductId) return -1;
        if (right.id === line.preferredProductId) return 1;
        return right.quantity - left.quantity;
      });
    const available = candidates.reduce((total, product) => total + product.quantity, 0);
    return {
      ...line,
      available,
      canMake: candidates.some((product) => product.quantity >= line.required),
      products: candidates,
    };
  });

  const maxServings = recipe.length === 0
    ? 0
    : Math.min(...lines.map((line) => Math.max(
        0,
        ...line.products.map((product) => Math.floor(product.quantity / line.required)),
      )));

  return {
    canMake: recipe.length > 0 && lines.every((line) => line.canMake),
    maxServings,
    lines,
  };
}
