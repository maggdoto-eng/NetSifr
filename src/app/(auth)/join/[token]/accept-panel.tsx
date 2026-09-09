import { acceptInvitationTokenAction, declineInvitationTokenAction } from './actions';

export function AcceptPanel({
  token,
  title,
  errorMessage,
}: {
  token: string;
  title: string;
  errorMessage?: string;
}) {
  return (
    <div className="stack">
      <div>
        <h1 className="display-sm">You’re invited</h1>
        <p className="muted" style={{ fontSize: 14, marginTop: 4 }}>
          Join <strong>{title}</strong> with your current account.
        </p>
      </div>

      {errorMessage && (
        <p style={{ color: 'var(--coral)', fontSize: 14 }} role="alert">
          {errorMessage}
        </p>
      )}

      <div className="row" style={{ gap: 'var(--s3)' }}>
        <form action={acceptInvitationTokenAction.bind(null, token)} className="grow">
          <button type="submit" className="btn btn--accent btn--block">
            Accept &amp; join
          </button>
        </form>
        <form action={declineInvitationTokenAction.bind(null, token)}>
          <button type="submit" className="btn btn--ghost">
            Later
          </button>
        </form>
      </div>
    </div>
  );
}
