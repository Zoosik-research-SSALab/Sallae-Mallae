import Button from "@/shared/ui/Button";

type Props = {
  typeFilter: string;
  onChange: (value: string) => void;
};

const options = ["ALL", "BUY", "SELL", "FLUCTUATION", "ANNOUNCEMENT"];

export default function NotificationFilter({ typeFilter, onChange }: Props) {
  return (
    <div className="row" style={{ flexWrap: "wrap" }}>
      {options.map((option) => (
        <Button
          key={option}
          variant={typeFilter === option ? "primary" : "default"}
          onClick={() => onChange(option)}
          aria-pressed={typeFilter === option}
        >
          {option}
        </Button>
      ))}
    </div>
  );
}
