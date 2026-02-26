import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { TokenProvider } from "@/contexts/TokenContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { EditorProvider } from "@/contexts/EditorContext";
import { ProjectProvider } from "@/contexts/ProjectContext";
import { I18nProvider } from "@/components/I18nProvider";

export const metadata: Metadata = {
  title: "Qwen Coder - AI Code Studio",
  description: "Create stunning apps & websites by chatting with AI",
  icons: {
    icon: '/favicon.svg',
    apple: '/icon-512.svg',
  },
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
                  <I18nProvider>
                    {children}
                  </I18nProvider>
                </ProjectProvider>
              </EditorProvider>
            </NotificationProvider>
          </TokenProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
