import Link from 'next/link';
import { verifySession } from '@/lib/dal';
import { getPostsForCohort } from '@/modules/community';
import { avatarFor } from '@/lib/avatars';
import { NewPostForm } from './new-post-form';

function timeAgo(d: Date): string {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return new Date(d).toLocaleDateString();
}

export default async function DiscussionPage({
  params,
}: PageProps<'/programs/[programId]/discussion'>) {
  const { programId } = await params;
  await verifySession();
  const posts = await getPostsForCohort(programId);

  return (
    <div className="stack">
      <h1 className="display-md">Discussion</h1>
      <NewPostForm cohortId={programId} />

      {posts.length === 0 ? (
        <div className="empty">No posts yet — start the conversation.</div>
      ) : (
        <div className="stack">
          {posts.map((p) => {
            const avatar = avatarFor(p.author.avatarKey);
            return (
              <Link
                key={p.id}
                href={`/programs/${programId}/discussion/${p.id}`}
                className="card card--pick stack"
                style={{ gap: 'var(--s2)' }}
              >
                <div className="row">
                  <span className="avatar" style={{ background: avatar.bg, color: avatar.fg }}>
                    {avatar.glyph}
                  </span>
                  <div className="grow">
                    <div style={{ fontWeight: 600 }}>{p.author.name}</div>
                    <div className="mono">{timeAgo(p.createdAt)}</div>
                  </div>
                </div>
                <p className="truncate" style={{ margin: 0 }}>
                  {p.body}
                </p>
                <div className="mono">
                  {p._count.comments} {p._count.comments === 1 ? 'reply' : 'replies'}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
