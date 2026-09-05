import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { assertWithinRateLimit, RateLimitExceededError } from '@/lib/rate-limit';
import { recordHeartbeat, AttendanceError } from '@/modules/learning';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (
    !body ||
    typeof body.recordingModuleId !== 'string' ||
    typeof body.nonce !== 'string' ||
    typeof body.deltaSeconds !== 'number'
  ) {
    return NextResponse.json({ error: 'bad request' }, { status: 400 });
  }

  try {
    await assertWithinRateLimit(`attendance-ping:${session.user.id}:${body.recordingModuleId}`, {
      limit: 20,
      windowMs: 60 * 1000,
    });
  } catch (error) {
    if (error instanceof RateLimitExceededError) {
      return NextResponse.json({ error: 'rate limited' }, { status: 429 });
    }
    throw error;
  }

  try {
    const result = await recordHeartbeat({
      userId: session.user.id,
      recordingModuleId: body.recordingModuleId,
      nonce: body.nonce,
      deltaSeconds: body.deltaSeconds,
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AttendanceError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    throw error;
  }
}
