import type { Metadata } from "next";
import { Itim, IBM_Plex_Sans_Thai } from "next/font/google";
import "./globals.css";

// Playful display face — kept for headings and the logo to preserve the original vibe.
const itim = Itim({
  variable: "--font-itim",
  subsets: ["latin", "thai"],
  weight: "400",
});

// Workhorse UI face — real weight range so hierarchy actually renders.
const ui = IBM_Plex_Sans_Thai({
  variable: "--font-ui",
  subsets: ["latin", "thai"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "แบบฟอร์มให้บริการเทคโนโลยีสารสนเทศ",
  description: "ระบบเปิดและติดตามคำร้องขอบริการ IT",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" className={`${ui.variable} ${itim.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
