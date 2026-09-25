export function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs uppercase tracking-wide text-vikalp-text-secondary">{label}</span>
      <span className="text-lg font-semibold text-vikalp-navy">{value}</span>
    </div>
  );
}
