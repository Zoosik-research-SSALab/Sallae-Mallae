import Image from "next/image";
import Link from "next/link";

type HeaderLogoProps = {
  href?: string;
  src?: string;
  alt?: string;
};

export default function HeaderLogo({
  href = "/",
  src = "/images/header-logo.svg",
  alt = "Service logo",
}: HeaderLogoProps) {
  return (
    <Link href={href} className="inline-flex items-center" aria-label="Go to home">
      <Image src={src} alt={alt} width={192} height={40} priority className="h-10 w-auto" />
    </Link>
  );
}
