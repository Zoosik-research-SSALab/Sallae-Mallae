import type { Metadata } from "next";
import localFont from "next/font/local";
import AppNav from "@/shared/components/AppNav";
import AppProviders from "@/shared/components/AppProviders";
import ThemeToggle from "@/shared/components/ThemeToggle";

import "./globals.css";
import "@/styles/theme.css";

const pretendard = localFont({
  src: "../../public/fonts/PretendardVariable.woff2",
  variable: "--font-pretendard",
  display: "swap",
});

export const metadata: Metadata = {
  icons: {
    icon: "/icons/SSAL_LAB_ICON.jpg",
    shortcut: "/icons/SSAL_LAB_ICON.jpg",
  },
  title: "sallaemallae",
  description: "살래말래 위원회 프론트엔드 보일러플레이트",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={pretendard.variable} suppressHydrationWarning>
      <body>
        <AppProviders>
          <AppNav />
          <ThemeToggle />
          {children}
        </AppProviders>
      </body>
    </html>
  );
}
