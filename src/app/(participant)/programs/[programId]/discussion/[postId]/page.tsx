import Link from 'next/link';
import { notFound } from 'next/navigation';
import { verifySession } from '@/lib/dal';
import { getPostWithComments } from '@/modules/community';
import { avatarFor } from '@/lib/avatars';
import { CommentForm } from './comment-form';
import { PostActionsBar } from '../../../../post-actions-bar';

function when(d: Date): string {
  return new Date(d).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default async function PostPage({
  params,
}: PageProps<'/programs/[programId]/discussion/[postId]'>) {
  const { programId, postId } = await params;
  const { userId } = await verifySession();

  const post = await getPostWithComments(postId, programId, userId);
  if (!post) notFound();

  const authorAvatar = avatarFor(post.author.avatarKey);

  return (
    <div className="stack">
      <Link href={`/programs/${programId}/discussion`} className="mono" style={{ color: 'var(--mute)' }}>
        ← Discussion
      </Link>

      <div className="card stack" style={{ gap: 'var(--s3)' }}>
        <div className="row">
          <span className="avatar" style={{ background: authorAvatar.bg, color: authorAvatar.fg }}>
            {authorAvatar.glyph}
          </span>
          <div className="grow">
            <div style={{ fontWeight: 600 }}>{post.author.name}</div>
            <div className="mono">{when(post.createdAt)}</div>
          </div>
        </div>
        <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{post.body}</p>
        <PostActionsBar
          postId={post.id}
          initialLiked={post.reactions.length > 0}
          initialCount={post._count.reactions}
        />
      </div>

      <div className="mono">
        {post.comments.length} {post.comments.length === 1 ? 'reply' : 'replies'}
      </div>

      <div className="stack" style={{ gap: 'var(--s2)' }}>
        {post.comments.map((c) => {
          const avatar = avatarFor(c.author.avatarKey);
          return (
            <div key={c.id} className="card card--pad-sm row row--top">
              <span className="avatar" style={{ background: avatar.bg, color: avatar.fg }}>
                {avatar.glyph}
              </span>
              <div className="grow">
                <div className="row" style={{ gap: 'var(--s2)' }}>
                  <span style={{ fontWeight: 600 }}>{c.author.name}</span>
                  <span className="mono">{when(c.createdAt)}</span>
                </div>
                <p style={{ margin: '4px 0 0', whiteSpace: 'pre-wrap' }}>{c.body}</p>
              </div>
            </div>
          );
        })}
      </div>

      <CommentForm cohortId={programId} postId={postId} />
    </div>
  );
}
