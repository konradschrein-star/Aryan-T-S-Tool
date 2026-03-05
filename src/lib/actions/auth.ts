"use server";

import { signIn } from "@/lib/auth";
import { AuthError } from "next-auth";
import { isRedirectError } from "next/dist/client/components/redirect-error";

export async function loginAction(email: string, password: string) {
  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: "/dashboard",
    });
    return { success: true };
  } catch (error) {
    // NextAuth v5 throws a NEXT_REDIRECT on success — this is expected
    if (isRedirectError(error)) {
      return { success: true };
    }
    if (error instanceof AuthError) {
      return { error: "Invalid email or password" };
    }
    return { error: "An unexpected error occurred" };
  }
}
