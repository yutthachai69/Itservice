import type { Metadata } from "next";
import { IBM_Plex_Sans_Thai } from "next/font/google";
import "./globals.css";

// One workhorse face for both navigation and headings keeps the product
// visually coherent and close to the original operational forms.
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
    <html lang="th" className={`${ui.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
