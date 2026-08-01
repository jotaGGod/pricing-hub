import {
  Banknote,
  Briefcase,
  Building2,
  CircleDollarSign,
  CirclePlus,
  CreditCard,
  FileText,
  Gem,
  Gift,
  Handshake,
  Landmark,
  Megaphone,
  Package,
  Percent,
  PiggyBank,
  Printer,
  Receipt,
  ShoppingCart,
  Sparkles,
  Ticket,
  Truck,
  Users,
  Wallet,
  Wrench
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

// The catalog the category editor offers. Keys are stored in the database, so
// renaming one orphans existing categories — add new entries instead.
export const financeIcons: Record<string, LucideIcon> = {
  "circle-dollar-sign": CircleDollarSign,
  "shopping-cart": ShoppingCart,
  "circle-plus": CirclePlus,
  briefcase: Briefcase,
  percent: Percent,
  ticket: Ticket,
  gem: Gem,
  landmark: Landmark,
  package: Package,
  printer: Printer,
  truck: Truck,
  megaphone: Megaphone,
  "file-text": FileText,
  banknote: Banknote,
  "credit-card": CreditCard,
  receipt: Receipt,
  wallet: Wallet,
  "piggy-bank": PiggyBank,
  gift: Gift,
  handshake: Handshake,
  users: Users,
  building: Building2,
  wrench: Wrench,
  sparkles: Sparkles
};

export const financeIconNames = Object.keys(financeIcons);

export function FinanceIcon({ name, size = 16 }: { name: string; size?: number }) {
  const Icon = financeIcons[name] ?? CircleDollarSign;
  return <Icon size={size} />;
}
