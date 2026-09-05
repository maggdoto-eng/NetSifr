import { acceptInvitationAction, declineInvitationAction } from './actions';

export function InvitationCard(props: {
  invitationId: string;
  title: string;
  cohortLabel: string;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border-2 border-orange-500 bg-white p-4 shadow-[4px_4px_0_#FF6A45]">
      <div>
        <div className="font-bold leading-tight">{props.title}</div>
        <div className="mt-1 font-mono text-[10px] tracking-wide text-zinc-500">
          {props.cohortLabel.toUpperCase()}
        </div>
      </div>
      <div className="flex gap-2">
        <form action={acceptInvitationAction.bind(null, props.invitationId)} className="flex-1">
          <button
            type="submit"
            className="w-full rounded-xl bg-orange-500 py-2.5 font-semibold text-white"
          >
            Accept & enrol
          </button>
        </form>
        <form action={declineInvitationAction.bind(null, props.invitationId)}>
          <button
            type="submit"
            className="rounded-xl border border-zinc-200 px-4 py-2.5 text-sm text-zinc-500"
          >
            Later
          </button>
        </form>
      </div>
    </div>
  );
}
