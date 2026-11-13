import { ingredientCategories } from "@/domain/ingredient-categories";

export function CategorySelect({
  className,
  defaultValue = "",
  categories = [],
}: {
  className: string;
  defaultValue?: string;
  categories?: string[];
}) {
  const options = Array.from(
    new Set(
      [...ingredientCategories, ...categories, defaultValue].filter(Boolean),
    ),
  ).sort((left, right) => left.localeCompare(right, "en-US"));
  return (
    <select
      aria-label="Category"
      className={className}
      defaultValue={defaultValue}
      name="category"
      required
    >
      <option value="" disabled>
        Select a category
      </option>
      {options.map((category) => (
        <option key={category} value={category}>
          {category}
        </option>
      ))}
    </select>
  );
}
