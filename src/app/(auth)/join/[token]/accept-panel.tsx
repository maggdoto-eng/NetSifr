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
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold">You&apos;re invited</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Join <strong>{title}</strong> with your current account.
        </p>
      </div>

      {errorMessage && <p className="text-sm text-red-600">{errorMessage}</p>}

      <div className="flex gap-3">
        <form action={acceptInvitationTokenAction.bind(null, token)} className="flex-1">
          <button
            type="submit"
            className="w-full rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
          >
            Accept & join
          </button>
        </form>
        <form action={declineInvitationTokenAction.bind(null, token)}>
          <button type="submit" className="rounded border border-zinc-300 px-4 py-2 text-sm">
            Later
          </button>
        </form>
      </div>
    </div>
  );
}
