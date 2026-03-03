"use client";

import { useState } from "react";
import { updateUserProfile, getUserLeagues } from "@/actions/admin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

export default function UserManager({ users: initialUsers }) {
  const [users, setUsers] = useState(initialUsers);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingUserId, setEditingUserId] = useState(null);
  const [editDisplayName, setEditDisplayName] = useState("");
  const [leaguesDialogUserId, setLeaguesDialogUserId] = useState(null);
  const [leaguesDialogName, setLeaguesDialogName] = useState("");
  const [userLeagues, setUserLeagues] = useState([]);
  const [loadingLeagues, setLoadingLeagues] = useState(false);
  const [togglingAdminId, setTogglingAdminId] = useState(null);

  const filtered = users.filter((u) => {
    const q = searchQuery.toLowerCase();
    return (
      u.display_name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q)
    );
  });

  async function handleSaveDisplayName(userId) {
    if (!editDisplayName.trim()) {
      toast.error("Display name cannot be empty");
      return;
    }
    const result = await updateUserProfile(userId, { display_name: editDisplayName.trim() });
    if (result?.error) {
      toast.error(result.error);
      return;
    }
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, display_name: editDisplayName.trim() } : u))
    );
    setEditingUserId(null);
    toast.success("Display name updated");
  }

  async function handleToggleAdmin(userId, currentIsAdmin) {
    setTogglingAdminId(userId);
    const result = await updateUserProfile(userId, { is_admin: !currentIsAdmin });
    setTogglingAdminId(null);
    if (result?.error) {
      toast.error(result.error);
      return;
    }
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, is_admin: !currentIsAdmin } : u))
    );
    toast.success(`Admin ${!currentIsAdmin ? "granted" : "revoked"}`);
  }

  async function handleViewLeagues(userId, displayName) {
    setLeaguesDialogUserId(userId);
    setLeaguesDialogName(displayName ?? "User");
    setLoadingLeagues(true);
    const result = await getUserLeagues(userId);
    setLoadingLeagues(false);
    if (result?.error) {
      toast.error(result.error);
      return;
    }
    setUserLeagues(result.leagues ?? []);
  }

  const adminUsers = filtered.filter((u) => u.is_admin);
  const regularUsers = filtered.filter((u) => !u.is_admin);

  return (
    <div className="space-y-6">
      {/* Search */}
      <div>
        <Input
          placeholder="Search by name or email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-sm bg-input border-border text-foreground text-sm"
        />
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span>{users.length} total users</span>
        <span>{users.filter((u) => u.is_admin).length} admins</span>
      </div>

      {/* Admin users */}
      {adminUsers.length > 0 && (
        <div>
          <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
            Admins ({adminUsers.length})
          </h2>
          <div className="space-y-2">
            {adminUsers.map((user) => (
              <UserRow
                key={user.id}
                user={user}
                isEditing={editingUserId === user.id}
                editDisplayName={editDisplayName}
                onEditDisplayNameChange={setEditDisplayName}
                onStartEdit={() => {
                  setEditingUserId(user.id);
                  setEditDisplayName(user.display_name ?? "");
                }}
                onSaveDisplayName={() => handleSaveDisplayName(user.id)}
                onCancelEdit={() => setEditingUserId(null)}
                onToggleAdmin={() => handleToggleAdmin(user.id, user.is_admin)}
                togglingAdmin={togglingAdminId === user.id}
                onViewLeagues={() => handleViewLeagues(user.id, user.display_name)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Regular users */}
      <div>
        <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
          Users ({regularUsers.length})
        </h2>
        <div className="space-y-2">
          {regularUsers.map((user) => (
            <UserRow
              key={user.id}
              user={user}
              isEditing={editingUserId === user.id}
              editDisplayName={editDisplayName}
              onEditDisplayNameChange={setEditDisplayName}
              onStartEdit={() => {
                setEditingUserId(user.id);
                setEditDisplayName(user.display_name ?? "");
              }}
              onSaveDisplayName={() => handleSaveDisplayName(user.id)}
              onCancelEdit={() => setEditingUserId(null)}
              onToggleAdmin={() => handleToggleAdmin(user.id, user.is_admin)}
              togglingAdmin={togglingAdminId === user.id}
              onViewLeagues={() => handleViewLeagues(user.id, user.display_name)}
            />
          ))}
          {regularUsers.length === 0 && (
            <p className="text-sm text-muted-foreground py-4 text-center">
              {searchQuery ? "No users match your search." : "No regular users found."}
            </p>
          )}
        </div>
      </div>

      {/* User leagues dialog */}
      <Dialog open={!!leaguesDialogUserId} onOpenChange={() => setLeaguesDialogUserId(null)}>
        <DialogContent className="bg-card border-border text-foreground">
          <DialogHeader>
            <DialogTitle>{leaguesDialogName}&apos;s Leagues</DialogTitle>
          </DialogHeader>
          {loadingLeagues ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Loading...</p>
          ) : userLeagues.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Not a member of any leagues.</p>
          ) : (
            <div className="space-y-2 py-2 max-h-72 overflow-y-auto">
              {userLeagues.map((league) => (
                <div key={league.id} className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-secondary/50">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{league.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Code: <span className="font-mono">{league.join_code}</span>
                      {" · "}Joined {new Date(league.joined_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </p>
                  </div>
                  {league.is_owner && (
                    <Badge className="bg-primary/15 text-primary border-primary/30 text-[10px] shrink-0">Owner</Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function UserRow({
  user,
  isEditing,
  editDisplayName,
  onEditDisplayNameChange,
  onStartEdit,
  onSaveDisplayName,
  onCancelEdit,
  onToggleAdmin,
  togglingAdmin,
  onViewLeagues,
}) {
  return (
    <div className="gradient-card border border-border rounded-xl px-4 py-3">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        {/* Avatar + info */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs font-bold text-muted-foreground shrink-0">
            {(user.display_name ?? "?").charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            {isEditing ? (
              <div className="flex items-center gap-2">
                <Input
                  value={editDisplayName}
                  onChange={(e) => onEditDisplayNameChange(e.target.value)}
                  className="h-7 text-sm bg-input border-border text-foreground max-w-[200px]"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") onSaveDisplayName();
                    if (e.key === "Escape") onCancelEdit();
                  }}
                />
                <Button
                  size="sm"
                  onClick={onSaveDisplayName}
                  className="h-7 text-xs bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onCancelEdit}
                  className="h-7 text-xs text-muted-foreground"
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <>
                <p className="text-sm font-semibold text-foreground truncate">
                  {user.display_name ?? "No name"}
                </p>
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
              </>
            )}
          </div>
        </div>

        {/* Badges + actions */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {user.is_admin && (
            <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/30 text-xs">Admin</Badge>
          )}
          <Badge className="bg-secondary text-secondary-foreground border-border text-xs">
            {user.league_count} league{user.league_count !== 1 ? "s" : ""}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {new Date(user.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </span>
          <button
            onClick={onViewLeagues}
            className="text-xs text-primary hover:text-primary/80 transition-colors"
          >
            Leagues
          </button>
          <button
            onClick={onStartEdit}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Edit
          </button>
          <button
            onClick={onToggleAdmin}
            disabled={togglingAdmin}
            className={`text-xs font-medium transition-colors disabled:opacity-50 ${
              user.is_admin
                ? "text-destructive hover:text-destructive/80"
                : "text-amber-400 hover:text-amber-300"
            }`}
          >
            {togglingAdmin
              ? "..."
              : user.is_admin
                ? "Revoke Admin"
                : "Grant Admin"}
          </button>
        </div>
      </div>
    </div>
  );
}
