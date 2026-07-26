import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Detour | Side quests near you",
  description:
    "Weird, specific things to do nearby, ranked by people whose taste you trust.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
