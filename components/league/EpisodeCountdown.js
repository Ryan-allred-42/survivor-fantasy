"use client";

import { useState, useEffect } from "react";

function getTimeLeft(lockTime) {
  const diff = new Date(lockTime) - new Date();
  if (diff <= 0) return null;

  const totalSeconds = Math.floor(diff / 1000);
  const days  = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const mins  = Math.floor((totalSeconds % 3600) / 60);
  const secs  = totalSeconds % 60;

  return { days, hours, mins, secs, totalSeconds };
}

export default function EpisodeCountdown({ lockTime, inline = false }) {
  // Start as null — prevents SSR/hydration mismatch from Date.now() differences
  const [timeLeft, setTimeLeft] = useState(null);

  useEffect(() => {
    setTimeLeft(getTimeLeft(lockTime));
    const interval = setInterval(() => setTimeLeft(getTimeLeft(lockTime)), 1000);
    return () => clearInterval(interval);
  }, [lockTime]);

  // During SSR or before first paint, render nothing (safe default)
  if (timeLeft === null) return null;
  if (timeLeft === false || !timeLeft)
    return <span className="text-destructive font-semibold">Locked</span>;

  const { days, hours, mins, secs, totalSeconds } = timeLeft;

  let text;
  if (totalSeconds < 3600) {
    const mm = String(mins).padStart(2, "0");
    const ss = String(secs).padStart(2, "0");
    text = `${mm}:${ss}`;
  } else if (days > 0) {
    text = `${days}d ${hours}h`;
  } else {
    text = `${hours}h`;
  }

  if (inline) return <span className="font-mono tabular-nums">{text} left</span>;

  return <p className="font-mono tabular-nums text-xs">{text} until lock</p>;
}
