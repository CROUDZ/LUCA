import type { NextAuthConfig, Session } from "next-auth";
import type { Adapter } from "next-auth/adapters";
import type { JWT } from "next-auth/jwt";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const credentialsSchema = z.object({
  email: z.string().email({ message: "Email invalide" }),
  password: z.string().min(8, "Mot de passe trop court"),
});

export const authConfig: NextAuthConfig = {
  adapter: PrismaAdapter(prisma) as unknown as Adapter,
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      name: "Email et mot de passe",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mot de passe", type: "password" },
      },
      authorize: async (rawCredentials: unknown) => {
        const parsed = credentialsSchema.safeParse(rawCredentials ?? {});
        if (!parsed.success) {
          throw new Error("Identifiants invalides");
        }

        const { email, password } = parsed.data;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !user.passwordHash) {
          throw new Error("Email ou mot de passe incorrect");
        }

        const valid = await compare(password, user.passwordHash);
        if (!valid) {
          throw new Error("Email ou mot de passe incorrect");
        }

        if (!user.verified) {
          throw new Error("Email non vérifié");
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          verified: user.verified,
        } as const;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }: { token: JWT; user?: { role?: string; verified?: boolean; id?: string } }) {
      if (user) {
        token.role = user.role;
        token.verified = user.verified;
      } else if (token.sub) {
        const dbUser = await prisma.user.findUnique({ where: { id: token.sub } });
        if (dbUser) {
          token.role = dbUser.role;
          token.verified = dbUser.verified;
        }
      }
      return token;
    },
    async session({ session, token }: { session: Session; token: JWT }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        const role = (token.role as string | undefined) as
          | "USER"
          | "DEVELOPER"
          | "MODERATOR"
          | "ADMIN"
          | undefined;
        session.user.role = role ?? "USER";
        session.user.verified = Boolean(token.verified);
      }
      return session;
    },
  },
  trustHost: true,
  secret: process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET || process.env.SECRET,
};

export default authConfig;
