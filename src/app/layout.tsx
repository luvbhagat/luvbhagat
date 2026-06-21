import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";

// Body font (Inter) and display/heading font (Space Grotesk) — same pairing
// used in the AuraClip mockups.
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
});

export const metadata: Metadata = {
  title: "AuraClip AI — Turn long videos into scroll-stopping shorts",
  description:
    "AuraClip AI turns long videos into short, vertical, captioned clips for social media.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // We default to dark mode (the signature violet look). The `.dark` class is
  // what Tailwind + Shadcn use to pick the dark color tokens.
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} ${spaceGrotesk.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
