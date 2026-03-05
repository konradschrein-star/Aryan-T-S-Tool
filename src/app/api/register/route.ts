import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const { email, password, displayName } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    // Check if email already exists
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    // Check if this is the first user — make them owner + approved
    const [anyUser] = await db.select({ id: users.id }).from(users).limit(1);
    const isFirstUser = !anyUser;

    const [newUser] = await db
      .insert(users)
      .values({
        email,
        passwordHash,
        displayName: displayName || null,
        role: isFirstUser ? "owner" : "va",
        approved: isFirstUser,
      })
      .returning({ id: users.id });

    return NextResponse.json({ success: true, userId: newUser.id });
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Registration failed", details: error instanceof Error ? error.message : undefined },
      { status: 500 }
    );
  }
}
