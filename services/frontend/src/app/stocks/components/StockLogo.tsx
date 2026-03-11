type Props = {
  label: string;
};

export default function StockLogo({ label }: Props) {
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[color:var(--color-bg-interactive-primary)] text-[10px] font-semibold text-[color:var(--color-text-base)] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] outline outline-1 outline-offset-[-1px] outline-[color:var(--color-border-secondary)]">
      {label}
    </div>
  );
}
