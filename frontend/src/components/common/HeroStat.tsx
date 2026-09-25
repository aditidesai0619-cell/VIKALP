// Global UI refinement — the big, important-number pattern (population,
// households, etc.) used identically on the Decision and Destination &
// Relocation settlement-context cards. Extracted once instead of
// patching two near-duplicate blocks. Uses the dedicated `text-stat`
// (40px) token reserved for hero numbers.
export function HeroStat({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="flex flex-col items-end">
      <span className="text-stat font-semibold leading-none text-vikalp-text">{value}</span>
      <span className="mt-1 text-xs uppercase tracking-wide text-vikalp-text-secondary">{label}</span>
    </div>
  );
}
