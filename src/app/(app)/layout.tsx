import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { AppSidebar } from "@/components/app-sidebar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const [profile] = await db
    .select()
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  if (!profile) {
    redirect("/login");
  }

  if (!profile.approved) {
    redirect("/pending");
  }

  if (profile.banned) {
    redirect("/login");
  }

  const profileData = {
    id: profile.id,
    email: profile.email,
    display_name: profile.displayName,
    role: profile.role as "owner" | "va",
    approved: profile.approved,
    banned: profile.banned,
    created_at: profile.createdAt.toISOString(),
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <AppSidebar profile={profileData} />
      <main className="flex-1 overflow-y-auto p-6">{children}</main>
    </div>
  );
}
