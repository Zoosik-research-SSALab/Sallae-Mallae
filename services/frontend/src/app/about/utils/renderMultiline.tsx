export function renderMultiline(text: string) {
  return text.split("\n").map((line, index) => (
    <span key={`${text}-${index}`} className="block">
      {line}
    </span>
  ));
}
