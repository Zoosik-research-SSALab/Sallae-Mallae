import type { NewsTrendingKeyword } from "../types/news";

type Props = {
  items: NewsTrendingKeyword[];
  onKeywordSelect?: (keyword: string) => void;
};

export default function NewsKeywordSidebar({ items, onKeywordSelect }: Props) {
  return (
    <section className="flex flex-col gap-4">
      <div>
        <h2 className="text-xl font-extrabold leading-6 text-[color:var(--color-text-primary)]">많이 찾는 뉴스 키워드</h2>
      </div>

      <div className="rounded-3xl bg-[color:var(--color-bg-secondary)] p-6">
        <div className="flex flex-col gap-4">
          {items.map((item, index) => (
            <button
              key={`${item.rank}-${item.keyword}`}
              type="button"
              onClick={() => onKeywordSelect?.(item.keyword)}
              className="flex items-center gap-3 text-left transition-opacity hover:opacity-80"
            >
              <span
                className={`w-5 text-center text-base font-extrabold leading-6 ${
                  index < 3 ? "text-[color:var(--color-text-info)]" : "text-[color:var(--color-text-tertiary)]"
                }`}
              >
                {item.rank}
              </span>
              <span className="text-base font-bold leading-6 text-[color:var(--color-text-primary)]">{item.keyword}</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
