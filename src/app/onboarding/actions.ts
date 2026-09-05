'use server';

import { redirect } from 'next/navigation';
import { verifySession } from '@/lib/dal';
import { completeOnboarding, OnboardingError } from '@/modules/identity';

export async function completeOnboardingAction(input: {
  name: string;
  avatarKey: number;
  personaAnswers: number[];
  topicIds: string[];
}): Promise<{ error?: string }> {
  const { userId } = await verifySession();

  try {
    await completeOnboarding({ userId, ...input });
  } catch (error) {
    if (error instanceof OnboardingError) return { error: error.message };
    throw error;
  }

  redirect('/programs');
}
