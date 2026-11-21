"use client";

/** Full reload beside the build label, so an open tab picks up a newer build as well as fresh data. */
export function RefreshButton() {
  return (
    <button type="button" className="tb-icon" onClick={() => window.location.reload()} aria-label="Refresh the page" title="Refresh">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M21 12a9 9 0 1 1-2.64-6.36" /><path d="M21 3v6h-6" />
      </svg>
    </button>
  );
}
