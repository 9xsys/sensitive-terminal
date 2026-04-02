import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sensitive Terminal — A Terminal That Takes Everything Personally",
  description: "Go ahead, type a command. See if I care.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
