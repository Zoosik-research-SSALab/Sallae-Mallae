type Props = {
  className?: string;
  strokeWidth?: number;
};

export default function CloseIcon({ className = "h-6 w-6", strokeWidth = 2 }: Props) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <path d="M7 7 17 17" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" />
      <path d="M17 7 7 17" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" />
    </svg>
  );
}
