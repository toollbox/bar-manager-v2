import { describe, expect, it } from "vitest";

import { calculateReorder } from "@/domain/purchasing";

describe("calculateReorder", () => {
  it("orders whole bottles up to target stock", () => {
    expect(calculateReorder({ quantity: 500, reorderPoint: 750, targetStock: 3000, bottleSize: 750, bottleCost: 20 })).toEqual({
      isLow: true,
      suggestedQuantity: 2500,
      suggestedPackages: 4,
      estimatedCost: 80,
    });
  });

  it("does not recommend stock above the reorder point", () => {
    expect(calculateReorder({ quantity: 1000, reorderPoint: 750, targetStock: 3000, bottleSize: 750, bottleCost: 20 }).suggestedQuantity).toBe(0);
  });
});
