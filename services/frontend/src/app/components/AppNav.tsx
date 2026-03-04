import Link from "next/link";

const navItems = [
  { href: "/", label: "대시보드" },
  { href: "/search", label: "검색" },
  { href: "/stocks", label: "종목" },
  { href: "/reports", label: "리포트" },
  { href: "/signals", label: "AI매매신호" },
  { href: "/portfolio", label: "의장 포트폴리오" },
  { href: "/scraps", label: "스크랩" },
  { href: "/notifications", label: "알림함" },
  { href: "/news", label: "뉴스" },
];

export default function AppNav() {
  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Link href="/" className="brand">
          살래말래
        </Link>
        <nav className="site-nav">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className="site-nav__link">
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="site-nav">
          <Link href="/auth/login" className="site-nav__link">
            로그인
          </Link>
        </div>
      </div>
    </header>
  );
}
