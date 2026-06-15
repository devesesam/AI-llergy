import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI-lergy | Mosaic",
  description: "Select your allergens to view a customized menu",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
