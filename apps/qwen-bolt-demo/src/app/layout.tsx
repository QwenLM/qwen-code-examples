import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Qwen Bolt - AI Website Builder",
  description: "Build stunning apps & websites by chatting with AI",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
