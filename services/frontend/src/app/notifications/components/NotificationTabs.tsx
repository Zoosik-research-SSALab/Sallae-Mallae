import type { NotificationTab } from "../types/notifications";

type Props = {
  activeTab: NotificationTab;
  onChange: (tab: NotificationTab) => void;
};

const tabs: Array<{ value: NotificationTab; label: string }> = [
  { value: "ALL", label: "전체보기" },
  { value: "SURGE", label: "급등락" },
  { value: "SIGNAL", label: "AI 매매신호" },
  { value: "ANNOUNCEMENT", label: "주요 공시" },
];

export default function NotificationTabs({ activeTab, onChange }: Props) {
  return (
    <div className="flex w-full gap-8 overflow-x-auto border-b border-[color:var(--color-border-primary)]">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.value;

        return (
          <button
            key={tab.value}
            type="button"
            onClick={() => onChange(tab.value)}
            className={`shrink-0 border-b pb-2 text-sm font-semibold leading-5 transition-colors lg:pb-3 lg:text-base lg:leading-6 ${
              isActive
                ? "border-[color:var(--color-border-base)] text-[color:var(--color-text-primary)]"
                : "border-transparent text-[color:var(--color-text-tertiary)] hover:text-[color:var(--color-text-secondary)]"
            }`}
            aria-pressed={isActive}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
