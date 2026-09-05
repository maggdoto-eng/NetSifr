import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { authenticateWithEmailPassword, normalizeEmail } from '@/modules/identity';
import { assertWithinRateLimit, RateLimitExceededError } from '@/lib/rate-limit';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      name?: string | null;
    };
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(credentials, request) {
        const email = normalizeEmail(String(credentials?.email ?? ''));
        const password = String(credentials?.password ?? '');
        if (!email || !password) return null;

        const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
        try {
          // Per-email and per-IP limits — a login is rejected as invalid
          // credentials (not a distinguishable "rate limited" error) either
          // way, so brute-forcing a specific address and spraying many
          // addresses from one IP are both throttled without leaking which.
          await assertWithinRateLimit(`login:email:${email}`, {
            limit: 10,
            windowMs: 15 * 60 * 1000,
          });
          await assertWithinRateLimit(`login:ip:${ip}`, { limit: 30, windowMs: 15 * 60 * 1000 });
        } catch (error) {
          if (error instanceof RateLimitExceededError) return null;
          throw error;
        }

        const user = await authenticateWithEmailPassword(email, password);
        if (!user) return null;
        return { id: user.id, name: user.name };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) token.sub = user.id;
      return token;
    },
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      return session;
    },
  },
});
