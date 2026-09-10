'use client';

import { useState, useTransition } from 'react';
import { followAction } from './community-actions';

export function FollowButton({
  userId,
  initialFollowing,
}: {
  userId: string;
  initialFollowing: boolean;
}) {
  const [following, setFollowing] = useState(initialFollowing);
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      className={`btn btn--sm ${following ? 'btn--ghost' : 'btn--primary'}`}
      disabled={pending}
      onClick={() => {
        setFollowing((f) => !f);
        start(async () => {
          await followAction(userId);
        });
      }}
    >
      {following ? 'Following' : 'Follow'}
    </button>
  );
}
