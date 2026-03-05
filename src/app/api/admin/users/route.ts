import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function verifyOwner() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "Unauthorized", status: 401 } as const;
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError || !profile || profile.role !== "owner") {
    return { error: "Forbidden: owner access required", status: 403 } as const;
  }

  return { user } as const;
}

export async function GET() {
  try {
    const auth = await verifyOwner();
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const adminClient = createAdminClient();

    const { data: profiles, error } = await adminClient
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: "Failed to fetch users", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ users: profiles });
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
    const auth = await verifyOwner();
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
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

    const adminClient = createAdminClient();

    const { data: profile, error } = await adminClient
      .from("profiles")
      .update(updates)
      .eq("id", userId)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: "Failed to update user", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ user: profile });
  } catch (error) {
    console.error("Admin users PATCH error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : undefined },
      { status: 500 }
    );
  }
}
