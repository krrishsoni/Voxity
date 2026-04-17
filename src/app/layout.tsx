import type { Metadata } from "next";
import { Sora } from "next/font/google";
import "./globals.css";
import { NavBar } from "@/components/nav-bar";
import { PwaRegister } from "@/components/pwa-register";
import { ToastProvider } from "@/components/toast";
import { PageTransition } from "@/components/page-transition";

const sora = Sora({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Campus Pulse",
  description: "College voting and quiz platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={sora.className}>
        <PwaRegister />
        <ToastProvider>
          <div className="min-h-screen bg-app-gradient">
            <NavBar />
            <main className="mx-auto w-full max-w-6xl px-4 pb-14 pt-6 sm:px-6">
              <PageTransition>{children}</PageTransition>
            </main>
          </div>
        </ToastProvider>
      </body>
    </html>
  );
}
