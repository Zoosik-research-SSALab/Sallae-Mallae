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

export type MarketCategory = {
  key: string;
  name: string;
  icon: IconType;
};

export const MARKET_CATEGORIES: MarketCategory[] = [
  { key: "에너지", name: "에너지", icon: SlEnergy },
  { key: "친환경탄소", name: "친환경 / 탄소", icon: MdEnergySavingsLeaf },
  { key: "소재", name: "소재", icon: MdOutlineGrid4X4 },
  { key: "반도체", name: "반도체", icon: CiMicrochip },
  { key: "디스플레이", name: "디스플레이", icon: MdMonitor },
  { key: "전자부품", name: "전자부품", icon: MdDeveloperBoard },
  { key: "IT플랫폼소프트웨어", name: "IT플랫폼 / 소프트웨어", icon: FaLaptopCode },
  { key: "게임디지털콘텐츠", name: "게임 / 디지털콘텐츠", icon: IoGameControllerOutline },
  { key: "2차전지", name: "2차전지", icon: FaBatteryThreeQuarters },
  { key: "스마트기기", name: "스마트기기", icon: MdSmartphone },
  { key: "기계산업장비", name: "기계 / 산업장비", icon: FaCogs },
  { key: "건설인프라", name: "건설 / 인프라", icon: TbBuildings },
  { key: "조선", name: "조선", icon: RiShip2Line },
  { key: "방산", name: "방산", icon: TbTank },
  { key: "운송물류", name: "운송 / 물류", icon: FaTruck },
  { key: "소비내구재", name: "소비내구재", icon: CgSmartHomeRefrigerator },
  { key: "필수소비재", name: "필수소비재", icon: FaShoppingCart },
  { key: "패션뷰티", name: "패션 / 뷰티", icon: PiTShirtBold },
  { key: "유통서비스", name: "유통 / 서비스", icon: RiCustomerService2Fill },
  { key: "금융헬스케어", name: "금융 / 헬스케어", icon: AiOutlineDollar },
  { key: "기타", name: "기타", icon: FaEllipsisH },
];

export function normalizeCategoryKey(name: string) {
  return name.replace(/\s*[·/]\s*/g, "").replace(/\s+/g, "").trim();
}

export function formatCategoryDisplayName(name: string) {
  return name.replace(/\s*\/\s*/g, " · ");
}

export function findMarketCategory(name: string) {
  const normalized = normalizeCategoryKey(name);
  return MARKET_CATEGORIES.find((category) => category.key === normalized);
}
