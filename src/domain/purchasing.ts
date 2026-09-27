export function calculateReorder({
  quantity,
  reorderPoint,
  targetStock,
  bottleSize,
  bottleCost,
}: {
  quantity: number;
  reorderPoint: number;
  targetStock: number;
  bottleSize: number | null;
  bottleCost: number | null;
}) {
  const isLow = reorderPoint > 0 && quantity <= reorderPoint;
  const suggestedQuantity = isLow ? Math.max(targetStock - quantity, 0) : 0;
  const suggestedPackages = bottleSize && suggestedQuantity > 0
    ? Math.ceil(suggestedQuantity / bottleSize)
    : null;
  return {
    isLow,
    suggestedQuantity,
    suggestedPackages,
    estimatedCost: suggestedPackages !== null && bottleCost !== null
      ? suggestedPackages * bottleCost
      : null,
  };
}
