import { useEffect, type ReactNode } from "react";
import { CloseIcon } from "./icons";

// Generic right-side slide-in drawer (brief §8: "do not permanently
// consume the page with a giant paragraph panel"). Closes on Escape
// and on backdrop click; scroll-locks the body while open.
export function Drawer({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: ReactNode;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-1200 flex justify-end">
      <button
        type="button"
        aria-label="Close panel"
        onClick={onClose}
        className="absolute inset-0 bg-black/60"
      />
      <div className="relative flex h-full w-full max-w-[440px] flex-col overflow-y-auto border-l border-vikalp-border bg-vikalp-card shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-vikalp-border bg-vikalp-card px-5 py-4">
          <div className="text-lg font-semibold text-vikalp-text">{title}</div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-vikalp-text-secondary transition-colors hover:bg-vikalp-bg hover:text-vikalp-text"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>
        <div className="flex flex-col gap-4 p-5">{children}</div>
      </div>
    </div>
  );
}
