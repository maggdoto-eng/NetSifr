import { ResetPasswordForm } from './reset-password-form';

export default async function ResetPasswordPage({ params }: PageProps<'/reset-password/[token]'>) {
  const { token } = await params;
  return <ResetPasswordForm token={token} />;
}
