'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { markAllReadAction } from './actions';

/** Marks everything read once when the page is actually opened, then refreshes
 *  the shell so the bell badge clears. Runs on mount only — not on prefetch. */
export function MarkReadOnView({ hasUnread }: { hasUnread: boolean }) {
  const router = useRouter();
  const done = useRef(false);
  useEffect(() => {
    if (!hasUnread || done.current) return;
    done.current = true;
    markAllReadAction().then(() => router.refresh());
  }, [hasUnread, router]);
  return null;
}
