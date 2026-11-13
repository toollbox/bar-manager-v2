alter table public.inventory_balances add constraint balances_finite_nonnegative
check (quantity >= 0 and quantity::text not in ('NaN','Infinity','-Infinity'));
alter table public.inventory_movements add constraint movements_finite
check (quantity_delta::text not in ('NaN','Infinity','-Infinity'));
alter table public.cocktail_ingredients add constraint recipe_quantities_finite
check (quantity_in_base_unit::text not in ('NaN','Infinity','-Infinity'));
