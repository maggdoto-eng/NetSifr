import { acceptInvitationAction, declineInvitationAction } from './actions';

export function InvitationCard(props: {
  invitationId: string;
  title: string;
  cohortLabel: string;
}) {
  return (
    <div className="card card--invite col" style={{ gap: 'var(--s3)' }}>
      <div>
        <div className="title">{props.title}</div>
        <div className="mono" style={{ marginTop: 4 }}>
          {props.cohortLabel}
        </div>
      </div>
      <div className="row" style={{ gap: 'var(--s2)' }}>
        <form action={acceptInvitationAction.bind(null, props.invitationId)} className="grow">
          <button type="submit" className="btn btn--accent btn--block">
            Accept &amp; enrol
          </button>
        </form>
        <form action={declineInvitationAction.bind(null, props.invitationId)}>
          <button type="submit" className="btn btn--ghost btn--sm">
            Later
          </button>
        </form>
      </div>
    </div>
  );
}
