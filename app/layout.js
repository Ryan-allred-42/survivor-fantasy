import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import FireBackground from "@/components/FireBackground";

const geistSans = GeistSans;
const geistMono = GeistMono;

export const metadata = {
  title: "Survivor Fantasy — Season 50",
  description: "Play Survivor Season 50 fantasy with your friends. Pick who gets voted out, allocate points, climb the leaderboard.",
  openGraph: {
    title: "Survivor Fantasy — Season 50",
    description: "The ultimate Survivor Season 50 fantasy league experience.",
    type: "website",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen`}>
        <FireBackground />
        <div className="relative" style={{ zIndex: 1 }}>
          {children}
        </div>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
