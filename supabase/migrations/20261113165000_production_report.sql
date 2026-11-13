create function public.production_report(target_location_id uuid, from_date date, through_date date, page_number integer default 1)
returns jsonb language plpgsql stable security invoker set search_path = '' as $$
declare loc public.locations%rowtype; start_time timestamptz; end_time timestamptz; result jsonb;
begin
  select * into loc from public.locations where id = target_location_id;
  if not found then raise exception 'Location not found'; end if;
  if from_date is null or through_date is null or through_date < from_date or through_date - from_date > 366 or page_number is null or page_number < 1 or page_number > 100000 then
    raise exception 'Choose a valid date range of at most 367 days';
  end if;
  start_time := from_date::timestamp at time zone loc.timezone;
  end_time := (through_date + 1)::timestamp at time zone loc.timezone;
  with filtered as (
    select * from public.cocktail_productions where location_id = target_location_id
      and created_at >= start_time and created_at < end_time
  ), page as (
    select * from filtered order by created_at desc, id desc limit 50 offset (page_number - 1) * 50
  )
  select jsonb_build_object(
    'events', (select count(*) from filtered),
    'drinks', (select coalesce(sum(quantity),0) from filtered),
    'cocktails', coalesce((select jsonb_agg(t order by t.drinks desc) from (
      select cocktail_name as name, sum(quantity) as drinks from filtered group by cocktail_name
    ) t),'[]'::jsonb),
    'usage', coalesce((select jsonb_agg(t order by t.label) from (
      select pi.product_label as label, pi.base_unit as unit, sum(pi.quantity_used) as quantity
      from public.cocktail_production_ingredients pi join filtered f on f.id = pi.production_id
      group by pi.product_label, pi.base_unit
    ) t),'[]'::jsonb),
    'history', coalesce((select jsonb_agg(t order by t.created_at desc, t.id desc) from (
      select p.id, p.cocktail_name as name, p.quantity, p.created_at,
        coalesce((select jsonb_agg(jsonb_build_object('ingredient',pi.ingredient_name,'product',pi.product_label,'quantity',pi.quantity_used,'unit',pi.base_unit))
          from public.cocktail_production_ingredients pi where pi.production_id = p.id),'[]'::jsonb) as ingredients
      from page p
    ) t),'[]'::jsonb)
  ) into result;
  return result;
end;
$$;
revoke all on function public.production_report(uuid,date,date,integer) from public;
grant execute on function public.production_report(uuid,date,date,integer) to authenticated;
