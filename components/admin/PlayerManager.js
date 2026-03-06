"use client";

import { useState } from "react";
import { updatePlayer, addPlayer } from "@/actions/admin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import PlayerAvatar from "@/components/PlayerAvatar";

export default function PlayerManager({ players: initialPlayers }) {
  const [players, setPlayers] = useState(initialPlayers);
  const [editingId, setEditingId] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  async function handleToggleActive(player) {
    const result = await updatePlayer(player.id, { is_active: !player.is_active });
    if (result?.error) {
      toast.error(result.error);
    } else {
      setPlayers((prev) =>
        prev.map((p) => (p.id === player.id ? { ...p, is_active: !p.is_active } : p))
      );
      toast.success("Player updated");
    }
  }

  async function handleAdd(e) {
    e.preventDefault();
    setIsSaving(true);
    const formData = new FormData(e.target);
    const result = await addPlayer({
      name: formData.get("name"),
      age: parseInt(formData.get("age")) || null,
      hometown: formData.get("hometown"),
      occupation: formData.get("occupation"),
      tribe: formData.get("tribe"),
      is_active: true,
    });
    setIsSaving(false);
    if (result?.error) {
      toast.error(result.error);
    } else {
      setPlayers((prev) => [...prev, result.player]);
      setAddOpen(false);
      toast.success("Player added!");
    }
  }

  async function handleUpdateTribe(player, tribe) {
    const result = await updatePlayer(player.id, { tribe });
    if (result?.error) {
      toast.error(result.error);
    } else {
      setPlayers((prev) =>
        prev.map((p) => (p.id === player.id ? { ...p, tribe } : p))
      );
      setEditingId(null);
      toast.success("Tribe updated");
    }
  }

  const active = players.filter((p) => p.is_active);
  const eliminated = players.filter((p) => !p.is_active);

  return (
    <div className="space-y-8">
      <div className="flex justify-end">
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold">
              Add Player
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border text-foreground">
            <DialogHeader>
              <DialogTitle>Add New Player</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAdd} className="space-y-4 py-2">
              {[
                { name: "name", label: "Name", required: true },
                { name: "age", label: "Age", type: "number" },
                { name: "hometown", label: "Hometown" },
                { name: "occupation", label: "Occupation" },
                { name: "tribe", label: "Tribe" },
              ].map((field) => (
                <div key={field.name} className="space-y-1.5">
                  <Label htmlFor={field.name} className="text-foreground text-sm">{field.label}</Label>
                  <Input
                    id={field.name}
                    name={field.name}
                    type={field.type ?? "text"}
                    required={field.required}
                    className="bg-input border-border text-foreground"
                  />
                </div>
              ))}
              <Button type="submit" disabled={isSaving} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold">
                {isSaving ? "Adding..." : "Add Player"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Active */}
      <div>
        <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3">
          Active ({active.length})
        </h2>
        <div className="space-y-2">
          {active.map((player) => (
            <PlayerRow
              key={player.id}
              player={player}
              isActive
              onToggle={() => handleToggleActive(player)}
              onUpdateTribe={(tribe) => handleUpdateTribe(player, tribe)}
              isEditing={editingId === player.id}
              onEdit={() => setEditingId(editingId === player.id ? null : player.id)}
            />
          ))}
          {active.length === 0 && (
            <p className="text-sm text-muted-foreground py-4 text-center">No active players</p>
          )}
        </div>
      </div>

      {/* Eliminated */}
      {eliminated.length > 0 && (
        <div>
          <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3">
            Eliminated ({eliminated.length})
          </h2>
          <div className="space-y-2">
            {eliminated
              .sort((a, b) => (a.placement ?? 0) - (b.placement ?? 0))
              .map((player) => (
                <PlayerRow
                  key={player.id}
                  player={player}
                  isActive={false}
                  onToggle={() => handleToggleActive(player)}
                  onUpdateTribe={(tribe) => handleUpdateTribe(player, tribe)}
                  isEditing={editingId === player.id}
                  onEdit={() => setEditingId(editingId === player.id ? null : player.id)}
                />
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PlayerRow({ player, isActive, onToggle, onUpdateTribe, isEditing, onEdit }) {
  const [tribeInput, setTribeInput] = useState(player.tribe ?? "");

  return (
    <div className={`gradient-card border rounded-xl px-4 py-3 ${isActive ? "border-border" : "border-border/40 opacity-70"}`}>
      <div className="flex items-center gap-3">
        <PlayerAvatar player={player} size={32} />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground text-sm">{player.name}</p>
          <p className="text-xs text-muted-foreground">
            {[player.tribe, player.occupation, player.hometown].filter(Boolean).join(" · ")}
          </p>
        </div>
        {!isActive && player.placement && (
          <Badge className="bg-secondary text-muted-foreground border-border text-xs shrink-0">
            #{player.placement}
          </Badge>
        )}
        <button
          onClick={onEdit}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0"
        >
          Edit
        </button>
        <button
          onClick={onToggle}
          className={`text-xs font-medium shrink-0 transition-colors ${
            isActive ? "text-destructive hover:text-destructive/80" : "text-emerald-400 hover:text-emerald-300"
          }`}
        >
          {isActive ? "Eliminate" : "Restore"}
        </button>
      </div>

      {isEditing && (
        <div className="mt-3 pt-3 border-t border-border/40 flex items-center gap-2">
          <Input
            value={tribeInput}
            onChange={(e) => setTribeInput(e.target.value)}
            placeholder="Tribe name"
            className="h-8 text-xs bg-input border-border text-foreground"
          />
          <Button
            size="sm"
            onClick={() => onUpdateTribe(tribeInput)}
            className="h-8 text-xs bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            Save
          </Button>
        </div>
      )}
    </div>
  );
}
