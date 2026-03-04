import type { Metadata } from "next";
import AppNav from "./components/AppNav";
import "./globals.css";

export const metadata: Metadata = {
  title: "sallaemallae",
  description: "살래말래 위원회 프론트엔드 보일러플레이트",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <AppNav />
        {children}
      </body>
    </html>
  );
}
