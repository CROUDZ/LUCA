import type { DefaultSession, DefaultUser } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      role: "USER" | "DEVELOPER" | "MODERATOR" | "ADMIN";
      verified: boolean;
    };
  }

  interface User extends DefaultUser {
    role: "USER" | "DEVELOPER" | "MODERATOR" | "ADMIN";
    verified: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: string;
    verified?: boolean;
  }
}
