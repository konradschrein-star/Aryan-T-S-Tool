"use server";

import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { encode } from "next-auth/jwt";

export async function loginAction(email: string, password: string) {
  try {
    if (!email || !password) {
      return { error: "Email and password are required" };
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user) {
      return { error: "Invalid email or password" };
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return { error: "Invalid email or password" };
    }

    // Create JWT using NextAuth's own encode function
    const secret = process.env.AUTH_SECRET!;
    const isSecure = process.env.NODE_ENV === "production";
    const cookieName = isSecure
      ? "__Secure-authjs.session-token"
      : "authjs.session-token";
    const token = await encode({
      secret,
      salt: cookieName,
      token: {
        sub: user.id,
        id: user.id,
        email: user.email,
        name: user.displayName,
        role: user.role,
        approved: user.approved,
        banned: user.banned,
      },
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });

    // Set the session cookie (same name NextAuth uses)
    const cookieStore = await cookies();
    cookieStore.set(cookieName, token, {
      httpOnly: true,
      secure: isSecure,
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
    });

    return { success: true };
  } catch (error) {
    console.error("Login error:", error);
    return { error: "An unexpected error occurred" };
  }
}
