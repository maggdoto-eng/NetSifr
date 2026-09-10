'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { likeAction, reportAction } from './community-actions';

/** Like + report controls, shared by cohort discussion and the community feed. */
export function PostActionsBar({
  postId,
  initialLiked,
  initialCount,
  replyCount,
}: {
  postId: string;
  initialLiked: boolean;
  initialCount: number;
  replyCount?: number;
}) {
  const router = useRouter();
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [reported, setReported] = useState(false);
  const [pending, start] = useTransition();

  function toggleLike(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const next = !liked;
    setLiked(next);
    setCount((c) => c + (next ? 1 : -1));
    start(async () => {
      await likeAction(postId);
      router.refresh();
    });
  }

  function report(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const reason = window.prompt('Report this post — what’s the issue?');
    if (reason === null) return;
    setReported(true);
    start(async () => {
      await reportAction(postId, reason);
    });
  }

  return (
    <div className="row" style={{ gap: 'var(--s4)' }}>
      <button
        type="button"
        onClick={toggleLike}
        disabled={pending}
        className="mono"
        style={{ color: liked ? 'var(--coral)' : 'var(--mute)' }}
        aria-pressed={liked}
      >
        {liked ? '♥' : '♡'} {count}
      </button>
      {replyCount !== undefined && <span className="mono">💬 {replyCount}</span>}
      <button
        type="button"
        onClick={report}
        disabled={reported || pending}
        className="mono"
        style={{ color: 'var(--mute)', marginLeft: 'auto' }}
      >
        {reported ? 'Reported' : 'Report'}
      </button>
    </div>
  );
}
