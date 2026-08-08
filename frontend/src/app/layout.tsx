import type { Metadata } from "next";
import { Anton, Space_Grotesk, Noto_Sans } from "next/font/google";
import { PrivyProviders } from "@/providers/PrivyProviders";
import "./globals.css";

// Anton stands in for Burbank Big Condensed Black (commercial, not on
// Google Fonts) — used only for the logo wordmark.
const anton = Anton({
  variable: "--font-anton",
  weight: "400",
  subsets: ["latin"],
});

// Space Grotesk stands in for Heading Now (commercial) — used for
// headings and other display UI text besides the logo.
const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  weight: ["500", "700"],
  subsets: ["latin"],
});

// Noto Sans — in-game/feature and body text.
const notoSans = Noto_Sans({
  variable: "--font-noto-sans",
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Monad Battle Royale",
  description: "Every move is a transaction. Last wallet standing wins.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${anton.variable} ${spaceGrotesk.variable} ${notoSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-brand-black text-brand-white font-body">
        <PrivyProviders>{children}</PrivyProviders>
      </body>
    </html>
  );
}
