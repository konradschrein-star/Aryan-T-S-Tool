import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

async function verifyOwner() {
  const session = await auth();

  if (!session?.user?.id) {
    return { error: "Unauthorized", status: 401 } as const;
  }

  if (session.user.role !== "owner") {
    return { error: "Forbidden: owner access required", status: 403 } as const;
  }

  return { userId: session.user.id } as const;
}

export async function GET() {
  try {
    const authResult = await verifyOwner();
    if ("error" in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const allUsers = await db
      .select({
        id: users.id,
        email: users.email,
        display_name: users.displayName,
        role: users.role,
        approved: users.approved,
        banned: users.banned,
        created_at: users.createdAt,
      })
      .from(users)
      .orderBy(users.createdAt);

    // Map to expected format
    const formatted = allUsers.map((u) => ({
      ...u,
      created_at: u.created_at.toISOString(),
    }));

    return NextResponse.json({ users: formatted });
  } catch (error) {
    console.error("Admin users GET error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : undefined },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const authResult = await verifyOwner();
    if ("error" in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const body = await request.json();
    const { userId, approved, banned, role } = body;

    if (!userId) {
      return NextResponse.json(
        { error: "Missing required field: userId" },
        { status: 400 }
      );
    }

    const updates: Record<string, unknown> = {};
    if (typeof approved === "boolean") updates.approved = approved;
    if (typeof banned === "boolean") updates.banned = banned;
    if (typeof role === "string") updates.role = role;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    const [updated] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, userId))
      .returning({
        id: users.id,
        email: users.email,
        display_name: users.displayName,
        role: users.role,
        approved: users.approved,
        banned: users.banned,
        created_at: users.createdAt,
      });

    if (!updated) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      user: { ...updated, created_at: updated.created_at.toISOString() },
    });
  } catch (error) {
    console.error("Admin users PATCH error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : undefined },
      { status: 500 }
    );
  }
}
