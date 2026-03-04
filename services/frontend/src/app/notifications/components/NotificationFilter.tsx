type Props = {
  typeFilter: string;
  onChange: (value: string) => void;
};

const options = ["ALL", "BUY", "SELL", "FLUCTUATION", "ANNOUNCEMENT"];

export default function NotificationFilter({ typeFilter, onChange }: Props) {
  return (
    <div className="row" style={{ flexWrap: "wrap" }}>
      {options.map((option) => (
        <button
          key={option}
          type="button"
          className="button"
          onClick={() => onChange(option)}
          aria-pressed={typeFilter === option}
          style={typeFilter === option ? { borderColor: "#18826a" } : undefined}
        >
          {option}
        </button>
      ))}
    </div>
  );
}
