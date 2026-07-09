import { describe, expect, it } from "vitest";
import { pricingFormSchema } from "./validation";

const baseInput = {
  product_title: "Produto",
  product_cost_cents: 1000,
  sale_price_cents: null,
  desired_margin_bps: 3000,
  seller_discount_bps: 0,
  channel_code: "site",
  channel_options: {
    category_code: "",
    override_commission_bps: null,
    override_fixed_fee_cents: null,
    enabled_options: {}
  },
  manual_costs: [],
  ads_bps: 0,
  fixed_costs_bps: 0,
  tax_bps: 400,
  extra_fees_bps: 0,
  logistic_cost: {
    type: "fixed_amount",
    amount_cents: 0,
    bps: 0
  },
  mode: "target_margin"
} as const;

describe("pricingFormSchema", () => {
  it("accepts a target margin input", () => {
    expect(pricingFormSchema.safeParse(baseInput).success).toBe(true);
  });

  it("rejects negative product cost", () => {
    expect(pricingFormSchema.safeParse({ ...baseInput, product_cost_cents: -1 }).success).toBe(false);
  });

  it("requires sale price in analysis mode", () => {
    expect(pricingFormSchema.safeParse({ ...baseInput, mode: "analyze_sale_price" }).success).toBe(false);
  });
});
