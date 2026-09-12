import type { Metadata } from "next";
import { cn } from "@/lib/utils";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: "College Arts Fest",
  description: "Manage your arts festival teams and events",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={cn(
          "min-h-screen bg-background font-sans antialiased"
          // Font variables are now handled in globals.css
        )}
      >
        {children}
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}