"use client";

import { useState, useActionState } from "react";
import { createLeague } from "@/actions/leagues";
import { SCORING_METHOD_LABELS, SCORING_METHOD_DESCRIPTIONS } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const METHODS = ["winner_only", "top_five", "full_season"];
const METHOD_COLORS = {
  winner_only: "border-red-500/40 data-[selected=true]:border-red-500 data-[selected=true]:bg-red-500/10",
  top_five:    "border-amber-500/40 data-[selected=true]:border-amber-500 data-[selected=true]:bg-amber-500/10",
  full_season: "border-emerald-500/40 data-[selected=true]:border-emerald-500 data-[selected=true]:bg-emerald-500/10",
};
const METHOD_TEXT_COLORS = {
  winner_only: "text-red-400",
  top_five:    "text-amber-400",
  full_season: "text-emerald-400",
};

export default function CardCreateLeague() {
  const [open, setOpen] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState("full_season");
  const [createdLeague, setCreatedLeague] = useState(null);

  const [state, formAction, isPending] = useActionState(async (_, formData) => {
    formData.set("scoring_method", selectedMethod);
    const result = await createLeague(formData);
    if (result.success) setCreatedLeague(result.league);
    return result;
  }, null);

  function handleClose(isOpen) {
    setOpen(isOpen);
    if (!isOpen) { setCreatedLeague(null); setSelectedMethod("full_season"); }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        {/* Card — flex column so content fills height and button stays at bottom */}
        <button className="gradient-card border border-border hover:border-primary/50 rounded-2xl p-8 text-left transition-all group cursor-pointer w-full flex flex-col h-full">
          <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center mb-5 group-hover:bg-primary/25 transition-colors shrink-0">
            <span className="text-2xl">🏝️</span>
          </div>
          <h3 className="text-xl font-bold text-foreground mb-2">Create a League</h3>
          <p className="text-sm text-muted-foreground leading-relaxed flex-1">
            Start a new league, choose your scoring mode, and share the invite code with your tribe.
          </p>
          <div className="mt-5 text-xs font-semibold text-primary group-hover:underline">
            Create league →
          </div>
        </button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg bg-card border-border text-foreground">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {createdLeague ? "League Created!" : "Create a League"}
          </DialogTitle>
        </DialogHeader>

        {createdLeague ? (
          <div className="space-y-6 py-2">
            <p className="text-muted-foreground text-sm">
              Your league <span className="text-foreground font-semibold">{createdLeague.name}</span> is ready.
              Share this code with your friends:
            </p>
            <div className="flex items-center justify-center">
              <div className="bg-primary/10 border-2 border-primary/40 rounded-2xl px-10 py-6 text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-widest mb-2">Join Code</p>
                <p className="text-5xl font-black tracking-[0.3em] text-gradient">{createdLeague.join_code}</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Anyone with this code can join your league from the dashboard.
            </p>
            <Button
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
              asChild
            >
              <a href={`/league/${createdLeague.id}`}>Go to League</a>
            </Button>
          </div>
        ) : (
          <form action={formAction} className="space-y-6 py-2">
            {state?.error && (
              <div className="px-4 py-3 rounded-lg bg-destructive/15 border border-destructive/30 text-destructive text-sm">
                {state.error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="league-name" className="text-foreground">League Name</Label>
              <Input
                id="league-name"
                name="name"
                placeholder="The Outcast Alliance"
                required
                className="bg-input border-border text-foreground placeholder:text-muted-foreground"
              />
            </div>
            <div className="space-y-3">
              <Label className="text-foreground">Scoring Method</Label>
              <div className="grid gap-3">
                {METHODS.map((method) => (
                  <button
                    key={method}
                    type="button"
                    data-selected={selectedMethod === method}
                    onClick={() => setSelectedMethod(method)}
                    className={`border rounded-xl p-4 text-left transition-all ${METHOD_COLORS[method]}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`font-bold text-sm ${METHOD_TEXT_COLORS[method]}`}>
                        {SCORING_METHOD_LABELS[method]}
                      </span>
                      {selectedMethod === method && <span className="text-xs text-primary">Selected</span>}
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {SCORING_METHOD_DESCRIPTIONS[method]}
                    </p>
                  </button>
                ))}
              </div>
            </div>
            <Button
              type="submit"
              disabled={isPending}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold h-11"
            >
              {isPending ? "Creating..." : "Create League"}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
