import type { Database as GeneratedDatabase } from "./database";

// PostgreSQL accepts explicit NULL for these nullable update parameters. The
// generator currently emits every numeric function parameter as non-nullable.
type UpdateProduct =
  GeneratedDatabase["public"]["Functions"]["update_inventory_product"];
export type Database = Omit<GeneratedDatabase, "public"> & {
  public: Omit<GeneratedDatabase["public"], "Functions"> & {
    Functions: Omit<
      GeneratedDatabase["public"]["Functions"],
      "update_inventory_product"
    > & {
      update_inventory_product: Omit<UpdateProduct, "Args"> & {
        Args: Omit<
          UpdateProduct["Args"],
          "product_bottle_size" | "product_cost"
        > & {
          product_bottle_size: number | null;
          product_cost: number | null;
        };
      };
    };
  };
};
