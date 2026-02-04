import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { TokenProvider } from "@/contexts/TokenContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { EditorProvider } from "@/contexts/EditorContext";
import { ProjectProvider } from "@/contexts/ProjectContext";

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
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <TokenProvider>
            <NotificationProvider>
              <EditorProvider>
                <ProjectProvider>
                  {children}
                </ProjectProvider>
              </EditorProvider>
            </NotificationProvider>
          </TokenProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
