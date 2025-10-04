import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

export default function Modal({ open, onClose, title, children, maxWidth = "md" }) {
  const panelRef = useRef(null);
  const lastFocusedRef = useRef(null);

  // Run hooks every render; do work only when `open` is true
  useEffect(() => {
    if (!open) return;

    // remember focus and lock scroll
    lastFocusedRef.current = document.activeElement;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // esc + simple focus trap
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
      if (e.key !== "Tab") return;

      const focusables = panelRef.current?.querySelectorAll(
        'a,button,input,select,textarea,[tabindex]:not([tabindex="-1"])'
      );
      if (!focusables || focusables.length === 0) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault(); last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault(); first.focus();
      }
    };
    document.addEventListener("keydown", onKey);

    // focus the panel after mount
    const t = setTimeout(() => panelRef.current?.focus(), 0);

    return () => {
      clearTimeout(t);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      if (lastFocusedRef.current instanceof HTMLElement) lastFocusedRef.current.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  const sizes = {
    sm: "modal-sm",
    md: "",
    lg: "modal-lg",
    xl: "modal-xl",
  };

  return createPortal(
    <div
      className="modal fade show d-block"
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 2000,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        overflowY: 'auto' // Allow scrolling when content exceeds viewport
      }}
      onMouseDown={(e) => {
        // close only when clicking the dark backdrop (not inside the panel)
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable" style={{ maxHeight: '95vh', margin: '1.75rem auto' }}>
        <div
          ref={panelRef}
          tabIndex={-1}
          className={`modal-content ${sizes[maxWidth]}`}
          style={{ 
            maxHeight: '95vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}
        >
          <div className="modal-header flex-shrink-0">
            <h5 className="modal-title">{title}</h5>
            <button
              type="button"
              className="btn-close"
              onClick={onClose}
              aria-label="Close"
            ></button>
          </div>
          <div className="modal-body flex-grow-1" style={{ 
            overflowY: 'auto',
            minHeight: 0,
            padding: '1rem'
          }}>
            {children}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
