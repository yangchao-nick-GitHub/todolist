import { Geist } from "next/font/google";
import { ThemeProvider } from "next-themes";
import Link from "next/link";
import { Home } from "lucide-react";
import { AuthHeader } from "@/components/auth-header";
import "./globals.css";

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const metadata = {
  metadataBase: new URL(defaultUrl),
  title: "Next.js and Supabase Starter Kit",
  description: "The fastest way to build apps with Next.js and Supabase",
};

const geistSans = Geist({
  display: "swap",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={geistSans.className} suppressHydrationWarning>
      <body className="bg-background text-foreground">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500">
            <header className="sticky top-0 z-50 w-full backdrop-blur-lg bg-white/10 border-b border-white/20">
              <div className="container mx-auto px-4 py-4 flex items-center justify-between">
                <Link
                  href="/"
                  className="inline-flex items-center gap-2 text-white font-semibold hover:text-white/80 transition-colors"
                >
                  <Home className="w-5 h-5" />
                  <span>首页</span>
                </Link>
                <AuthHeader />
              </div>
            </header>
            <main>{children}</main>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
