export function BaseUnitSelect({
  className,
  defaultValue = "ml",
}: {
  className: string;
  defaultValue?: string;
}) {
  return (
    <select
      aria-label="Base unit"
      className={className}
      defaultValue={defaultValue}
      name="baseUnit"
      required
    >
      <option value="g">g</option>
      <option value="ml">ml</option>
      <option value="fl_oz">fl oz</option>
      <option value="each">each</option>
    </select>
  );
}
