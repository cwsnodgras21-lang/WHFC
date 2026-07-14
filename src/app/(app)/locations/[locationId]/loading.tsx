export default function LocationDetailLoading() {
  return (
    <div className="space-y-6">
      <div className="card animate-pulse card-body space-y-4">
        <div className="h-4 w-32 rounded bg-[var(--color-border-subtle)]" />
        <div className="h-8 w-64 rounded bg-[var(--color-border-subtle)]" />
        <div className="space-y-3 pt-4">
          {Array.from({ length: 5 }).map((_, index) => (
            <div
              key={index}
              className="h-12 rounded bg-[var(--color-border-subtle)]"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
