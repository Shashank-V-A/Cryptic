export function FinancialYearSelector({ value, options = [], onChange }) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="sr-only">Financial year</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-[var(--vda-radius)] border border-[var(--vda-border)] bg-[var(--vda-surface)] px-2.5 py-1.5 text-sm text-[var(--vda-ink)] shadow-[var(--vda-shadow-sm)]"
      >
        {options.length === 0 ? (
          <option value={value}>{value.replace('_', ' ').replace('_', '–')}</option>
        ) : (
          options.map((fy) => (
            <option key={fy.id} value={fy.id}>
              {fy.label}
            </option>
          ))
        )}
      </select>
    </label>
  );
}
