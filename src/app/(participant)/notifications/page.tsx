import Link from 'next/link';
import { verifySession } from '@/lib/dal';
import { getNotifications } from '@/modules/communications';
import { MarkReadOnView } from './mark-read-on-view';

const TYPE_ICON: Record<string, string> = {
  ANNOUNCEMENT: '📣',
  ASSIGNMENT_GRADED: '✎',
  MODULE_PUBLISHED: '▶',
  INVITATION: '✉',
  GENERIC: '•',
};

function timeAgo(d: Date): string {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(d).toLocaleDateString();
}

export default async function NotificationsPage() {
  const { userId } = await verifySession();
  const notifications = await getNotifications(userId);
  const hasUnread = notifications.some((n) => !n.readAt);

  return (
    <div className="shell stack" style={{ maxWidth: 720 }}>
      <MarkReadOnView hasUnread={hasUnread} />
      <div>
        <div className="mono">Inbox</div>
        <h1 className="display-lg" style={{ marginTop: 6 }}>
          Notifications
        </h1>
      </div>

      {notifications.length === 0 ? (
        <div className="empty">You’re all caught up — nothing here yet.</div>
      ) : (
        <div className="stack" style={{ gap: 'var(--s2)' }}>
          {notifications.map((n) => {
            const inner = (
              <>
                <span
                  className="mod-icon"
                  style={{ background: 'var(--bg-sunk)', fontSize: 16 }}
                  aria-hidden
                >
                  {TYPE_ICON[n.type] ?? '•'}
                </span>
                <div className="grow">
                  <div style={{ fontWeight: 600 }}>{n.title}</div>
                  {n.body && (
                    <div className="muted truncate" style={{ fontSize: 14, marginTop: 2 }}>
                      {n.body}
                    </div>
                  )}
                  <div className="mono" style={{ marginTop: 4 }}>
                    {timeAgo(n.createdAt)}
                  </div>
                </div>
                {!n.readAt && (
                  <span
                    aria-label="unread"
                    style={{
                      width: 9,
                      height: 9,
                      borderRadius: 999,
                      background: 'var(--coral)',
                      flex: 'none',
                    }}
                  />
                )}
              </>
            );
            const style = { background: n.readAt ? undefined : 'var(--mint-tint)' } as const;
            return n.linkUrl ? (
              <Link key={n.id} href={n.linkUrl} className="card card--pad-sm row" style={style}>
                {inner}
              </Link>
            ) : (
              <div key={n.id} className="card card--pad-sm row" style={style}>
                {inner}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
