export type Theme = "dark" | "light";

export type User = {
  id: string;
  name: string;
  email: string;
  avatar_url?: string | null;
};

export type AuthResponse = {
  user: User;
};

export type FeeStrategy = "fixed" | "tiered" | "category";

export type FeeTier = {
  label: string;
  min_price_cents: number;
  max_price_cents: number | null;
  commission_bps: number;
  fixed_fee_cents: number;
};

export type CategoryFeeRule = {
  code: string;
  name: string;
  commission_bps: number;
  fixed_fee_cents: number;
};

export type FeeOptionRule = {
  code: string;
  label: string;
  type: "percentage" | "percentage_with_cap" | "fixed_amount";
  bps: number;
  cap_cents: number | null;
  fixed_amount_cents: number;
  default_enabled: boolean;
};

export type FeeRules = {
  strategy: FeeStrategy;
  default_commission_bps: number;
  fixed_fee_cents: number;
  min_commission_cents: number;
  manual_adjustable: boolean;
  tiers: FeeTier[];
  categories: CategoryFeeRule[];
  options: FeeOptionRule[];
};

export type Channel = {
  ID?: string;
  Code?: string;
  Name?: string;
  Description?: string;
  Enabled?: boolean;
  FeeRules?: FeeRules;
  LastVerifiedAt?: string | null;
  SourceNote?: string | null;
  code?: string;
  name?: string;
  description?: string;
  enabled?: boolean;
  fee_rules?: FeeRules;
  fee_rules_json?: FeeRules;
  last_verified_at?: string | null;
  source_note?: string | null;
};

export type NormalizedChannel = {
  id: string;
  code: string;
  name: string;
  description: string;
  enabled: boolean;
  fee_rules: FeeRules;
  last_verified_at?: string | null;
  source_note?: string | null;
};

export type CostType = "fixed_amount" | "percentage";

export type ManualCost = {
  name: string;
  type: CostType;
  amount_cents: number;
  bps: number;
  enabled: boolean;
};

export type VariableCost = {
  type: CostType;
  amount_cents: number;
  bps: number;
};

export type ChannelOptions = {
  category_code: string;
  override_commission_bps: number | null;
  override_fixed_fee_cents: number | null;
  enabled_options: Record<string, boolean>;
};

export type PricingMode = "target_margin" | "analyze_sale_price";

export type PricingInput = {
  product_title: string;
  product_cost_cents: number;
  sale_price_cents: number | null;
  desired_margin_bps: number | null;
  seller_discount_bps: number;
  channel_code: string;
  channel_options: ChannelOptions;
  manual_costs: ManualCost[];
  ads_bps: number;
  fixed_costs_bps: number;
  tax_bps: number;
  extra_fees_bps: number;
  logistic_cost: VariableCost;
  mode: PricingMode;
};

export type PricingStatus = "profit" | "warning" | "loss";

export type PricingBreakdownItem = {
  label: string;
  amount_cents: number;
  bps?: number | null;
};

export type PricingResult = {
  sale_price_cents: number;
  recommended_sale_price_cents: number;
  total_cost_cents: number;
  product_cost_cents: number;
  manual_costs_total_cents: number;
  channel_fee_cents: number;
  channel_commission_cents: number;
  channel_fixed_fee_cents: number;
  tax_cents: number;
  ads_cents: number;
  extra_fees_cents: number;
  net_profit_cents: number;
  margin_bps: number;
  markup_bps: number;
  status: PricingStatus;
  breakdown: PricingBreakdownItem[];
};

export type Product = {
  ID?: string;
  id?: string;
  UserID?: string;
  user_id?: string;
  Title?: string;
  title?: string;
  CostCents?: number;
  cost_cents?: number;
  DefaultChannelCode?: string | null;
  default_channel_code?: string | null;
  Category?: string | null;
  category?: string | null;
  CreatedAt?: string;
  created_at?: string;
};

export type Simulation = {
  ID?: string;
  id?: string;
  Title?: string;
  title?: string;
  Description?: string | null;
  description?: string | null;
  ChannelCode?: string;
  channel_code?: string;
  Input?: PricingInput;
  input?: PricingInput;
  Result?: PricingResult;
  result?: PricingResult;
  CreatedAt?: string;
  created_at?: string;
};

export type Preference = {
  user_id: string;
  theme: Theme;
};
