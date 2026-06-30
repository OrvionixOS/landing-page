import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      organizationId?: string;
      organizationSlug?: string;
      role?: "OWNER" | "ADMIN" | "MEMBER";
    } & DefaultSession["user"];
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    userId?: string;
    organizationId?: string;
    organizationSlug?: string;
    role?: "OWNER" | "ADMIN" | "MEMBER";
  }
}
