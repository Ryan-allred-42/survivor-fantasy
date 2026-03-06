"use client";

import { useState } from "react";
import Image from "next/image";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export default function PlayerAvatar({ player, size = 32, className = "" }) {
  const [open, setOpen] = useState(false);

  if (!player) return null;

  const sizeStyle = { width: size, height: size };
  const fallbackText = player.name?.charAt(0) ?? "?";

  const details = [player.age && `Age ${player.age}`, player.hometown, player.occupation, player.tribe]
    .filter(Boolean);

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        className={`shrink-0 rounded-full cursor-pointer ring-0 hover:ring-2 hover:ring-primary/60 transition-shadow focus:outline-none focus:ring-2 focus:ring-primary/60 ${className}`}
        style={sizeStyle}
        title={`View ${player.name}`}
      >
        {player.photo_url ? (
          <div className="relative w-full h-full rounded-full overflow-hidden">
            <Image
              src={player.photo_url}
              alt={player.name}
              fill
              className="object-cover scale-125 object-top"
            />
          </div>
        ) : (
          <div
            className="w-full h-full rounded-full bg-secondary flex items-center justify-center text-xs font-bold text-muted-foreground"
            style={sizeStyle}
          >
            {fallbackText}
          </div>
        )}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-card border-border text-foreground sm:max-w-sm p-0 overflow-hidden" showCloseButton={false}>
          <DialogTitle className="sr-only">{player.name}</DialogTitle>
          {player.photo_url ? (
            <div className="relative w-full aspect-3/4 overflow-hidden">
              <Image
                src={player.photo_url}
                alt={player.name}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 100vw, 384px"
                priority
              />
              <div className="absolute inset-0 bg-linear-to-t from-black/80 via-transparent to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-5">
                <p className="text-xl font-bold text-white drop-shadow-lg">{player.name}</p>
                {details.length > 0 && (
                  <p className="text-sm text-white/80 mt-1">{details.join(" · ")}</p>
                )}
                {!player.is_active && (
                  <span className="inline-block mt-2 text-xs font-semibold text-destructive bg-destructive/20 border border-destructive/30 px-2 py-0.5 rounded-md">
                    Eliminated{player.eliminated_week ? ` (Week ${player.eliminated_week})` : ""}
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="p-6">
              <DialogHeader>
                <p className="text-lg font-semibold leading-none">{player.name}</p>
                {details.length > 0 && (
                  <DialogDescription>{details.join(" · ")}</DialogDescription>
                )}
              </DialogHeader>
              {!player.is_active && (
                <span className="inline-block mt-3 text-xs font-semibold text-destructive bg-destructive/20 border border-destructive/30 px-2 py-0.5 rounded-md">
                  Eliminated{player.eliminated_week ? ` (Week ${player.eliminated_week})` : ""}
                </span>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
