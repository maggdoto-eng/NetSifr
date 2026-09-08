'use server';

import { revalidatePath } from 'next/cache';
import { requireAdminContext } from '@/app/admin/action-context';
import { gradeSubmission } from '@/modules/learning';

const VALID_LABELS = new Set(['NEEDS_WORK', 'GOOD', 'EXCELLENT']);

export async function gradeSubmissionAction(
  input: { cohortId: string; submissionId: string },
  formData: FormData,
): Promise<void> {
  const { userId, organizationId } = await requireAdminContext();

  const label = formData.get('label')?.toString();
  const feedback = formData.get('feedback')?.toString().trim() ?? '';
  if (!label || !VALID_LABELS.has(label) || feedback.length === 0) return;

  await gradeSubmission({
    submissionId: input.submissionId,
    organizationId,
    label: label as 'NEEDS_WORK' | 'GOOD' | 'EXCELLENT',
    feedback,
    gradedByUserId: userId,
  });

  revalidatePath(`/admin/programs/${input.cohortId}/submissions`);
}
