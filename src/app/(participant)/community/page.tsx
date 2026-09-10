import { verifySession } from '@/lib/dal';
import { getDefaultOrganization } from '@/lib/org';
import { getCommunityFeed } from '@/modules/community';
import { avatarFor } from '@/lib/avatars';
import { NewCommunityPost } from './new-community-post';
import { PostActionsBar } from '../post-actions-bar';

function timeAgo(d: Date): string {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return new Date(d).toLocaleDateString();
}

export default async function CommunityPage() {
  const { userId } = await verifySession();
  const org = await getDefaultOrganization();
  const posts = await getCommunityFeed(org.id, userId);

  return (
    <div className="shell stack" style={{ maxWidth: 720 }}>
      <div>
        <div className="mono">{org.name}</div>
        <h1 className="display-lg" style={{ marginTop: 6 }}>
          Community
        </h1>
        <p className="lede" style={{ marginTop: 8 }}>
          Everyone across NetSifr — share wins, questions, and calls to action.
        </p>
      </div>

      <NewCommunityPost />

      {posts.length === 0 ? (
        <div className="empty">No posts yet — be the first to say something.</div>
      ) : (
        <div className="stack">
          {posts.map((p) => {
            const avatar = avatarFor(p.author.avatarKey);
            return (
              <div key={p.id} className="card stack" style={{ gap: 'var(--s3)' }}>
                <div className="row">
                  <span className="avatar" style={{ background: avatar.bg, color: avatar.fg }}>
                    {avatar.glyph}
                  </span>
                  <div className="grow">
                    <div style={{ fontWeight: 600 }}>{p.author.name}</div>
                    <div className="mono">{timeAgo(p.createdAt)}</div>
                  </div>
                </div>
                <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{p.body}</p>
                <PostActionsBar
                  postId={p.id}
                  initialLiked={p.reactions.length > 0}
                  initialCount={p._count.reactions}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
