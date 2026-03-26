import Badge from "@/shared/ui/Badge";

type Props = {
  signal: string;
};

export default function SignalBadge({ signal }: Props) {
  const normalized = signal.toUpperCase();

  if (normalized === "BUY") {
    return <Badge tone="ok">BUY</Badge>;
  }

  if (normalized === "SELL") {
    return <Badge tone="danger">SELL</Badge>;
  }

  return <Badge tone="warn">{normalized}</Badge>;
}
