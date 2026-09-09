import { redirect } from 'next/navigation';

export default async function ProgramIndexPage({
  params,
}: PageProps<'/admin/programs/[programId]'>) {
  const { programId } = await params;
  redirect(`/admin/programs/${programId}/builder`);
}
