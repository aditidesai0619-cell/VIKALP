export function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 bg-vikalp-bg px-6 text-center">
      <h1 className="text-lg font-semibold text-vikalp-navy">{title}</h1>
      <p className="text-sm text-vikalp-text-secondary">
        VIKALP — Module coming in a later implementation task.
      </p>
    </div>
  );
}
