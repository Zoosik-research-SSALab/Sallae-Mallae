"use client";

import { useState } from "react";
import type { IconType } from "react-icons";
import { AiOutlineDollar } from "react-icons/ai";
import { CgSmartHomeRefrigerator } from "react-icons/cg";
import { CiMicrochip } from "react-icons/ci";
import { FaBatteryThreeQuarters, FaCogs, FaEllipsisH, FaLaptopCode, FaShoppingCart, FaTruck } from "react-icons/fa";
import { IoGameControllerOutline } from "react-icons/io5";
import { MdDeveloperBoard, MdEnergySavingsLeaf, MdMonitor, MdOutlineGrid4X4, MdSmartphone } from "react-icons/md";
import { PiTShirtBold } from "react-icons/pi";
import { RiCustomerService2Fill, RiShip2Line } from "react-icons/ri";
import { SlEnergy } from "react-icons/sl";
import { TbBuildings, TbTank } from "react-icons/tb";
import ValueChangeRateText from "@/shared/components/ValueChangeRateText";
import type { CategoryItem } from "../types/main";
import { formatPrice, formatSignedPriceChange, formatSignedRate, getRateTone } from "../utils/formatters";

const COLLAPSED_CATEGORY_COUNT = 3;
const EXPANDED_CATEGORY_COUNT = 21;

const categoryIconMap: Record<string, IconType> = {
  에너지: SlEnergy,
  친환경탄소: MdEnergySavingsLeaf,
  소재: MdOutlineGrid4X4,
  반도체: CiMicrochip,
  디스플레이: MdMonitor,
  전자부품: MdDeveloperBoard,
  IT플랫폼소프트웨어: FaLaptopCode,
  게임디지털콘텐츠: IoGameControllerOutline,
  "2차전지": FaBatteryThreeQuarters,
  스마트기기: MdSmartphone,
  기계산업장비: FaCogs,
  건설인프라: TbBuildings,
  조선: RiShip2Line,
  방산: TbTank,
  운송물류: FaTruck,
  소비내구재: CgSmartHomeRefrigerator,
  필수소비재: FaShoppingCart,
  패션뷰티: PiTShirtBold,
  유통서비스: RiCustomerService2Fill,
  금융헬스케어: AiOutlineDollar,
  기타: FaEllipsisH,
};

function getRateClassName(value: number) {
  const tone = getRateTone(value);

  if (tone === "positive") {
    return "text-[color:var(--color-text-danger)]";
  }

  if (tone === "negative") {
    return "text-[color:var(--color-text-info)]";
  }

  return "text-[color:var(--color-text-tertiary)]";
}

function getCategoryKey(name: string) {
  return name.replace(/\s*[·/]\s*/g, "").replace(/\s+/g, "").trim();
}

function formatCategoryLabel(name: string) {
  return name.replace(/\s*\/\s*/g, " · ");
}

type Props = {
  categories: CategoryItem[];
  isLoading: boolean;
};

export default function CategoryStocksSection({ categories, isLoading }: Props) {
  const [isExpanded, setIsExpanded] = useState(false);
  const allCategories = categories.slice(0, EXPANDED_CATEGORY_COUNT);
  const visibleCategories = isExpanded ? allCategories : allCategories.slice(0, COLLAPSED_CATEGORY_COUNT);

  return (
    <section className="mb-2 py-10">
      <div className="mb-1 flex items-center justify-between gap-4">
        <h2 className="typo-heading-md text-[color:var(--color-text-primary)] md:[font-size:var(--typo-heading-lg-font-size)] md:[line-height:var(--typo-heading-lg-line-height)]">
          카테고리별 주가
        </h2>
      </div>

      {isLoading && allCategories.length === 0 ? <div className="mt-8 h-60 rounded-2xl bg-[color:var(--color-bg-tertiary)]" /> : null}

      <div className="mt-6 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {visibleCategories.map((category) => {
          const Icon = categoryIconMap[getCategoryKey(category.name)] ?? FaEllipsisH;

          return (
            <article
              key={category.name}
              className="rounded-2xl border-x border-b border-[color:var(--color-border-secondary)] bg-[color:var(--color-bg-primary)] p-6 shadow-[0px_1px_2px_rgba(0,0,0,0.05)]"
            >
              <div className="mb-1 flex items-center gap-2">
                <span className="inline-flex h-5 w-5 items-center justify-center text-[color:var(--color-icon-primary)]">
                  <Icon className="h-4 w-4" />
                </span>
                <h3 className="typo-body-md mb-0.5 font-bold text-[color:var(--color-text-primary)]">{formatCategoryLabel(category.name)}</h3>
              </div>

              <div className="mt-6 flex flex-col gap-5">
                {category.stocks.map((stock) => (
                  <div key={`${category.name}-${stock.name}`} className="flex items-center justify-between gap-4">
                    <div>
                      <div className="typo-body-md font-semibold text-[color:var(--color-text-primary)]">{stock.name}</div>
                      <div className="typo-body-sm text-[color:var(--color-text-tertiary)]">{formatPrice(stock.price)}</div>
                    </div>
                    <div className="flex flex-col items-end gap-0.5 text-right">
                      <ValueChangeRateText value={stock.fluctuationRate} className={`typo-body-sm px-0 font-semibold ${getRateClassName(stock.fluctuationRate)}`}>
                        {formatSignedRate(stock.fluctuationRate)}
                      </ValueChangeRateText>
                      <span className={`typo-body-xs font-medium ${getRateClassName(stock.fluctuationRate)}`}>
                        {formatSignedPriceChange(stock.price, stock.fluctuationRate)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </article>
          );
        })}
      </div>

      {allCategories.length > COLLAPSED_CATEGORY_COUNT ? (
        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={() => setIsExpanded((current) => !current)}
            className="typo-body-sm rounded-xl px-6 py-3 font-medium text-[color:var(--color-text-secondary)] transition-colors hover:bg-[color:var(--color-bg-tertiary)] hover:text-[color:var(--color-text-primary)]"
          >
            {isExpanded ? "접기" : "더보기"}
          </button>
        </div>
      ) : null}
    </section>
  );
}
