import { Suspense } from "react";
import NavBar from "@/components/NavBar";

export default function LeagueLayout({ children }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Suspense>
        <NavBar />
      </Suspense>
      <div className="flex-1">
        {children}
      </div>
    </div>
  );
}
