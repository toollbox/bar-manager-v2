import type { LineAvailability } from "./availability";

// Store only the bartender's explicit choices. Automatic choices are derived
// from current stock so they disappear when multiple products become eligible.
export function resolveServiceSelections(
  lines: LineAvailability[],
  quantity: number,
  choices: Record<string, string>,
) {
  const validQuantity =
    Number.isInteger(quantity) && quantity >= 1 && quantity <= 100;
  const selections = Object.fromEntries(
    lines.map((line) => {
      const eligible = validQuantity
        ? line.products.filter(
            (product) =>
              product.isAvailable &&
              product.quantity >= line.required * quantity,
          )
        : [];
      const explicit = eligible.find(
        (product) => product.id === choices[line.lineId],
      );
      return [
        line.lineId,
        explicit?.id ?? (eligible.length === 1 ? eligible[0].id : ""),
      ];
    }),
  );
  return {
    selections,
    canSubmit:
      validQuantity &&
      lines.length > 0 &&
      lines.every((line) => Boolean(selections[line.lineId])),
  };
}
