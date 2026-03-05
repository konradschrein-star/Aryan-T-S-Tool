"use client";

import { useCallback, useEffect, useState } from "react";
import { Profile } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RefreshCw, MoreHorizontal, ShieldCheck, ShieldBan, KeyRound, UserCheck, UserX } from "lucide-react";
import { toast } from "sonner";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Reset password dialog
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetUserId, setResetUserId] = useState<string | null>(null);
  const [resetUserEmail, setResetUserEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [resetting, setResetting] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users");
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to fetch users");
        return;
      }
      const data = await res.json();
      setUsers(data.users ?? []);
    } catch (error) {
      console.error("Fetch users error:", error);
      toast.error("Failed to fetch users");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const updateUser = async (
    userId: string,
    updates: { approved?: boolean; banned?: boolean; role?: string }
  ) => {
    setActionLoading(userId);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, ...updates }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to update user");
        return;
      }

      const data = await res.json();
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, ...data.user } : u))
      );

      toast.success("User updated successfully");
    } catch (error) {
      console.error("Update user error:", error);
      toast.error("Failed to update user");
    } finally {
      setActionLoading(null);
    }
  };

  const openResetDialog = (userId: string, email: string) => {
    setResetUserId(userId);
    setResetUserEmail(email);
    setNewPassword("");
    setResetDialogOpen(true);
  };

  const handleResetPassword = async () => {
    if (!resetUserId || !newPassword) return;

    setResetting(true);
    try {
      const res = await fetch("/api/admin/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: resetUserId, newPassword }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to reset password");
        return;
      }

      toast.success(`Password reset for ${resetUserEmail}`);
      setResetDialogOpen(false);
    } catch (error) {
      console.error("Reset password error:", error);
      toast.error("Failed to reset password");
    } finally {
      setResetting(false);
    }
  };

  const getStatusBadge = (user: Profile) => {
    if (user.banned) {
      return <Badge variant="destructive">Banned</Badge>;
    }
    if (user.approved) {
      return <Badge variant="default">Approved</Badge>;
    }
    return <Badge variant="secondary">Pending</Badge>;
  };

  const getRoleBadge = (role: string) => {
    if (role === "owner") {
      return <Badge variant="default" className="bg-amber-600 hover:bg-amber-700">Owner</Badge>;
    }
    return <Badge variant="outline">VA</Badge>;
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">User Management</h1>
        <Button variant="outline" size="sm" onClick={fetchUsers}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Display Name</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-[70px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  Loading users...
                </TableCell>
              </TableRow>
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  No users found.
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-mono text-sm">
                    {user.email}
                  </TableCell>
                  <TableCell>{user.display_name || "---"}</TableCell>
                  <TableCell>{getRoleBadge(user.role)}</TableCell>
                  <TableCell>{getStatusBadge(user)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(user.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          disabled={actionLoading === user.id}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Actions</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {!user.approved && !user.banned && (
                          <DropdownMenuItem
                            onClick={() =>
                              updateUser(user.id, { approved: true })
                            }
                          >
                            <UserCheck className="mr-2 h-4 w-4" />
                            Approve
                          </DropdownMenuItem>
                        )}
                        {user.approved && (
                          <DropdownMenuItem
                            onClick={() =>
                              updateUser(user.id, { approved: false })
                            }
                          >
                            <UserX className="mr-2 h-4 w-4" />
                            Revoke Approval
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        {!user.banned ? (
                          <DropdownMenuItem
                            onClick={() =>
                              updateUser(user.id, { banned: true })
                            }
                            className="text-destructive focus:text-destructive"
                          >
                            <ShieldBan className="mr-2 h-4 w-4" />
                            Ban User
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem
                            onClick={() =>
                              updateUser(user.id, { banned: false })
                            }
                          >
                            <ShieldCheck className="mr-2 h-4 w-4" />
                            Unban User
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        {user.role === "va" ? (
                          <DropdownMenuItem
                            onClick={() =>
                              updateUser(user.id, { role: "owner" })
                            }
                          >
                            <ShieldCheck className="mr-2 h-4 w-4" />
                            Promote to Owner
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem
                            onClick={() =>
                              updateUser(user.id, { role: "va" })
                            }
                          >
                            <ShieldBan className="mr-2 h-4 w-4" />
                            Demote to VA
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() =>
                            openResetDialog(user.id, user.email)
                          }
                        >
                          <KeyRound className="mr-2 h-4 w-4" />
                          Reset Password
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Set a new password for {resetUserEmail}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                placeholder="Enter new password (min. 6 characters)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setResetDialogOpen(false)}
              disabled={resetting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleResetPassword}
              disabled={resetting || newPassword.length < 6}
            >
              {resetting ? "Resetting..." : "Reset Password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
