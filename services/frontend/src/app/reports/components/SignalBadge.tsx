type Props = {
  signal: string;
};

export default function SignalBadge({ signal }: Props) {
  const normalized = signal.toUpperCase();

  if (normalized === "BUY") {
    return <span className="badge badge--ok">BUY</span>;
  }

  if (normalized === "SELL") {
    return <span className="badge badge--danger">SELL</span>;
  }

  return <span className="badge badge--warn">{normalized}</span>;
}
