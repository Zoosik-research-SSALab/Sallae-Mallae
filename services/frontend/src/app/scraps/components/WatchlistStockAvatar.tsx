import StockLogo from "@/app/stocks/components/StockLogo";

type Props = {
  name: string;
  iconUrl?: string | null;
};

export default function WatchlistStockAvatar({ name, iconUrl }: Props) {
  return <StockLogo label={name.slice(0, 2)} iconUrl={iconUrl} />;
}
