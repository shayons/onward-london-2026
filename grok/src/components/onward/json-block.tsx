export function JsonBlock({ value, label }: { value: unknown; label?: string }) {
  return (
    <div className="rounded-sm bg-chip/70 px-3 py-2">
      {label ? (
        <p className="mb-1 text-xs font-medium uppercase tracking-wider text-subtle">{label}</p>
      ) : null}
      <pre className="max-h-48 overflow-auto font-mono text-xs leading-relaxed text-ink/90 scroll-thin whitespace-pre-wrap break-all">
        {stringify(value)}
      </pre>
    </div>
  );
}

function stringify(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}
