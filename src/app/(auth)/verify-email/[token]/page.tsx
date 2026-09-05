import Link from 'next/link';
import { confirmEmailVerificationForToken } from '../../actions';

export default async function VerifyEmailPage({ params }: PageProps<'/verify-email/[token]'>) {
  const { token } = await params;
  const result = await confirmEmailVerificationForToken(token);

  if (result.error) {
    return <p className="text-sm text-red-600">{result.error}</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm">Your email is verified.</p>
      <Link href="/login" className="text-sm underline">
        Continue to log in
      </Link>
    </div>
  );
}
