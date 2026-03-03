"use client";

import { useState } from "react";
import {
  getLeagueMembers,
  updateLeague,
  deleteLeague,
  removeLeagueMember,
  transferLeagueOwnership,
} from "@/actions/admin";
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

export default function LeagueManager({ leagues: initialLeagues }) {
  const [leagues, setLeagues] = useState(initialLeagues);
  const [expandedId, setExpandedId] = useState(null);
  const [members, setMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [editingLeagueId, setEditingLeagueId] = useState(null);
  const [editName, setEditName] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [removingUserId, setRemovingUserId] = useState(null);
  const [transferDialogLeagueId, setTransferDialogLeagueId] = useState(null);

  async function handleExpand(leagueId) {
    if (expandedId === leagueId) {
      setExpandedId(null);
      setMembers([]);
      return;
    }
    setExpandedId(leagueId);
    setLoadingMembers(true);
    const result = await getLeagueMembers(leagueId);
    setLoadingMembers(false);
    if (result?.error) {
      toast.error(result.error);
      return;
    }
    setMembers(result.members ?? []);
  }

  async function handleSaveName(leagueId) {
    if (!editName.trim()) {
      toast.error("League name cannot be empty");
      return;
    }
    const result = await updateLeague(leagueId, { name: editName.trim() });
    if (result?.error) {
      toast.error(result.error);
      return;
    }
    setLeagues((prev) =>
      prev.map((l) => (l.id === leagueId ? { ...l, name: editName.trim() } : l))
    );
    setEditingLeagueId(null);
    toast.success("League name updated");
  }

  async function handleDelete(leagueId) {
    setIsDeleting(true);
    const result = await deleteLeague(leagueId);
    setIsDeleting(false);
    if (result?.error) {
      toast.error(result.error);
      return;
    }
    setLeagues((prev) => prev.filter((l) => l.id !== leagueId));
    setDeleteConfirmId(null);
    if (expandedId === leagueId) {
      setExpandedId(null);
      setMembers([]);
    }
    toast.success("League deleted");
  }

  async function handleRemoveMember(leagueId, userId, displayName) {
    setRemovingUserId(userId);
    const result = await removeLeagueMember(leagueId, userId);
    setRemovingUserId(null);
    if (result?.error) {
      toast.error(result.error);
      return;
    }
    setMembers((prev) => prev.filter((m) => m.user_id !== userId));
    setLeagues((prev) =>
      prev.map((l) =>
        l.id === leagueId ? { ...l, member_count: Math.max(0, l.member_count - 1) } : l
      )
    );
    toast.success(`${displayName} removed from league`);
  }

  async function handleTransfer(leagueId, newOwnerId) {
    const result = await transferLeagueOwnership(leagueId, newOwnerId);
    if (result?.error) {
      toast.error(result.error);
      return;
    }
    const newOwner = members.find((m) => m.user_id === newOwnerId);
    setLeagues((prev) =>
      prev.map((l) =>
        l.id === leagueId
          ? { ...l, owner_id: newOwnerId, owner_name: newOwner?.display_name ?? "Unknown" }
          : l
      )
    );
    setMembers((prev) =>
      prev.map((m) => ({
        ...m,
        is_owner: m.user_id === newOwnerId,
      }))
    );
    setTransferDialogLeagueId(null);
    toast.success("Ownership transferred");
  }

  return (
    <div className="space-y-3">
      {leagues.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-sm">No leagues found.</p>
        </div>
      )}

      {leagues.map((league) => (
        <div key={league.id} className="gradient-card border border-border rounded-2xl overflow-hidden">
          {/* League row */}
          <div className="px-5 py-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <button
                  onClick={() => handleExpand(league.id)}
                  className="text-muted-foreground hover:text-foreground transition-colors shrink-0 text-sm"
                >
                  {expandedId === league.id ? "▼" : "▶"}
                </button>
                <div className="min-w-0 flex-1">
                  {editingLeagueId === league.id ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="h-8 text-sm bg-input border-border text-foreground max-w-xs"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSaveName(league.id);
                          if (e.key === "Escape") setEditingLeagueId(null);
                        }}
                      />
                      <Button
                        size="sm"
                        onClick={() => handleSaveName(league.id)}
                        className="h-8 text-xs bg-primary hover:bg-primary/90 text-primary-foreground"
                      >
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingLeagueId(null)}
                        className="h-8 text-xs text-muted-foreground"
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <div>
                      <p className="font-bold text-foreground text-sm truncate">{league.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Owner: {league.owner_name} · {league.member_count} member{league.member_count !== 1 ? "s" : ""} · Code: <span className="font-mono">{league.join_code}</span>
                      </p>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge className="bg-secondary text-secondary-foreground border-border text-xs">
                  Full Season
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {new Date(league.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </span>
                <button
                  onClick={() => {
                    setEditingLeagueId(league.id);
                    setEditName(league.name);
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={() => setDeleteConfirmId(league.id)}
                  className="text-xs text-destructive hover:text-destructive/80 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>

          {/* Expanded members */}
          {expandedId === league.id && (
            <div className="border-t border-border/40 bg-background/30">
              {loadingMembers ? (
                <div className="px-5 py-6 text-center text-sm text-muted-foreground">Loading members...</div>
              ) : members.length === 0 ? (
                <div className="px-5 py-6 text-center text-sm text-muted-foreground">No members in this league.</div>
              ) : (
                <div>
                  <div className="px-5 py-3 flex items-center justify-between border-b border-border/30">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      Members ({members.length})
                    </p>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setTransferDialogLeagueId(league.id)}
                      className="h-7 text-xs text-primary hover:text-primary/80"
                    >
                      Transfer Ownership
                    </Button>
                  </div>
                  <div className="divide-y divide-border/30">
                    {members.map((member) => (
                      <div key={member.user_id} className="flex items-center justify-between px-5 py-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-xs font-bold text-muted-foreground shrink-0">
                            {member.display_name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">
                              {member.display_name}
                              {member.is_owner && (
                                <Badge className="ml-2 bg-primary/15 text-primary border-primary/30 text-[10px]">Owner</Badge>
                              )}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Joined {new Date(member.joined_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                              {member.mulligan_used && " · Mulligan used"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-sm font-semibold text-foreground tabular-nums">
                            {Number(member.cumulative_score).toLocaleString()} pts
                          </span>
                          {!member.is_owner && (
                            <button
                              onClick={() => handleRemoveMember(league.id, member.user_id, member.display_name)}
                              disabled={removingUserId === member.user_id}
                              className="text-xs text-destructive hover:text-destructive/80 transition-colors disabled:opacity-50"
                            >
                              {removingUserId === member.user_id ? "Removing..." : "Remove"}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ))}

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent className="bg-card border-border text-foreground">
          <DialogHeader>
            <DialogTitle>Delete League</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            This will permanently delete the league, all member data, picks, and scores. This action cannot be undone.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setDeleteConfirmId(null)} className="text-sm">
              Cancel
            </Button>
            <Button
              onClick={() => handleDelete(deleteConfirmId)}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground text-sm font-semibold"
            >
              {isDeleting ? "Deleting..." : "Delete League"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Transfer ownership dialog */}
      <Dialog open={!!transferDialogLeagueId} onOpenChange={() => setTransferDialogLeagueId(null)}>
        <DialogContent className="bg-card border-border text-foreground">
          <DialogHeader>
            <DialogTitle>Transfer Ownership</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            Select a member to become the new league owner.
          </p>
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {members
              .filter((m) => !m.is_owner)
              .map((member) => (
                <button
                  key={member.user_id}
                  onClick={() => handleTransfer(transferDialogLeagueId, member.user_id)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-secondary transition-colors text-left"
                >
                  <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-xs font-bold text-muted-foreground shrink-0">
                    {member.display_name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm text-foreground">{member.display_name}</span>
                </button>
              ))}
            {members.filter((m) => !m.is_owner).length === 0 && (
              <p className="text-sm text-muted-foreground py-4 text-center">No other members to transfer to.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
