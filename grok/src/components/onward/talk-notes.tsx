import { TALK_TRACK } from "@/lib/onward/talk-track";
import { useOnward } from "@/lib/onward/store";
import { X } from "lucide-react";

export function TalkNotes() {
  const open = useOnward((s) => s.notesOpen);
  const setOpen = useOnward((s) => s.setNotesOpen);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <button type="button" className="absolute inset-0 bg-ink/20" aria-label="Close notes" onClick={() => setOpen(false)} />
      <aside className="relative z-10 flex h-full w-full max-w-md flex-col bg-paper shadow-border-hover">
        <header className="flex items-center justify-between border-b border-line px-4 py-3">
          <div>
            <p className="text-xs uppercase tracking-wider text-subtle">Six minutes</p>
            <h2 className="font-display text-lg">Talk track</h2>
          </div>
          <button type="button" className="size-10 rounded-md hover:bg-chip" onClick={() => setOpen(false)} aria-label="Close">
            <X className="mx-auto size-4" />
          </button>
        </header>
        <ol className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 scroll-thin">
          {TALK_TRACK.map((s) => (
            <li key={s.t}>
              <p className="text-xs font-medium tabular-nums text-accent">{s.t}</p>
              <h3 className="font-display text-lg">{s.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted">{s.body}</p>
            </li>
          ))}
        </ol>
      </aside>
    </div>
  );
}
