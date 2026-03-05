import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    role?: string;
    approved?: boolean;
    banned?: boolean;
  }

  interface Session extends DefaultSession {
    user: {
      id: string;
      role: string;
      approved: boolean;
      banned: boolean;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
    approved: boolean;
    banned: boolean;
  }
}
