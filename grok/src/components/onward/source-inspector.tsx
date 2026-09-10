import { POLICIES } from "@/lib/onward/dataset";
import { useOnward } from "@/lib/onward/store";
import { X } from "lucide-react";

export function SourceInspector() {
  const ref = useOnward((s) => s.inspectorRef);
  const setRef = useOnward((s) => s.setInspectorRef);
  if (!ref) return null;
  const doc = POLICIES.find((p) => p.id === ref);
  if (!doc) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center sm:items-center">
      <button
        type="button"
        className="absolute inset-0 bg-ink/30"
        aria-label="Close source"
        onClick={() => setRef(null)}
      />
      <article className="relative z-10 max-h-[80dvh] w-full max-w-lg overflow-y-auto rounded-t-xl sm:rounded-xl bg-paper p-5 shadow-border-hover scroll-thin">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wider text-subtle">
              {doc.uri} · {doc.versionId}
            </p>
            <h3 className="font-display text-xl">{doc.title}</h3>
          </div>
          <button
            type="button"
            className="size-10 rounded-md hover:bg-chip"
            onClick={() => setRef(null)}
            aria-label="Close"
          >
            <X className="mx-auto size-4" />
          </button>
        </div>
        <pre className="mt-4 whitespace-pre-wrap font-sans text-sm leading-relaxed text-ink/90">{doc.body}</pre>
        <p className="mt-4 text-xs text-subtle">
          Authored fixture. Versioned for the demo — not a production-certified travel policy.
        </p>
      </article>
    </div>
  );
}
