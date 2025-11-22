import React from 'react';

/**
 * Displays the current application version.
 * Reads the version from the environment variable NEXT_PUBLIC_APP_VERSION.
 * Renders as a fixed, subtle element in the bottom-right corner.
 */
export default function VersionDisplay() {
  const version = process.env.NEXT_PUBLIC_APP_VERSION;

  if (!version) return null;

  return (
    <div className="fixed bottom-1 right-2 text-[10px] text-white/20 pointer-events-none select-none z-50 font-mono">
      v{version}
    </div>
  );
}
