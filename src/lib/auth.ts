import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validations/auth";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/auth/sign-in",
  },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email.toLowerCase() },
        });
        if (!user?.passwordHash) return null;

        const isValid = await bcrypt.compare(parsed.data.password, user.passwordHash);
        if (!isValid) return null;

        return { id: user.id, email: user.email, name: user.name, image: user.image };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user?.id) {
        token.userId = user.id;
      }

      // Resolve tenant membership at sign-in, and lazily backfill if missing
      // (e.g. token issued before the user had an organization yet). Role or
      // org changes after that take effect on next login or explicit
      // `update()` trigger rather than every request, to avoid a DB round
      // trip on every session check.
      if (token.userId && (user || trigger === "update" || !token.organizationId)) {
        const membership = await prisma.membership.findFirst({
          where: { userId: token.userId },
          orderBy: { createdAt: "asc" },
          select: { organizationId: true, role: true, organization: { select: { slug: true } } },
        });
        token.organizationId = membership?.organizationId;
        token.organizationSlug = membership?.organization.slug;
        token.role = membership?.role;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user && token.userId) {
        session.user.id = token.userId;
        session.user.organizationId = token.organizationId;
        session.user.organizationSlug = token.organizationSlug;
        session.user.role = token.role;
      }
      return session;
    },
  },
});
