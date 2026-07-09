import { z } from "zod";

const manualCostSchema = z.object({
  name: z.string(),
  type: z.enum(["fixed_amount", "percentage"]),
  amount_cents: z.number().int().min(0),
  bps: z.number().int().min(0),
  enabled: z.boolean()
});

export const pricingFormSchema = z
  .object({
    product_title: z.string().max(120),
    product_cost_cents: z.number().int().min(0),
    sale_price_cents: z.number().int().min(0).nullable(),
    desired_margin_bps: z.number().int().min(0).max(9900).nullable(),
    seller_discount_bps: z.number().int().min(0).max(10000),
    channel_code: z.string().min(1),
    channel_options: z.object({
      category_code: z.string(),
      override_commission_bps: z.number().int().min(0).nullable(),
      override_fixed_fee_cents: z.number().int().min(0).nullable(),
      enabled_options: z.record(z.boolean())
    }),
    manual_costs: z.array(manualCostSchema),
    ads_bps: z.number().int().min(0),
    fixed_costs_bps: z.number().int().min(0),
    tax_bps: z.number().int().min(0),
    extra_fees_bps: z.number().int().min(0),
    logistic_cost: z.object({
      type: z.enum(["fixed_amount", "percentage"]),
      amount_cents: z.number().int().min(0),
      bps: z.number().int().min(0)
    }),
    mode: z.enum(["target_margin", "analyze_sale_price"])
  })
  .superRefine((value, ctx) => {
    if (value.mode === "target_margin" && value.desired_margin_bps === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["desired_margin_bps"],
        message: "Informe a margem desejada"
      });
    }
    if (value.mode === "analyze_sale_price" && (!value.sale_price_cents || value.sale_price_cents <= 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["sale_price_cents"],
        message: "Informe o preco de venda"
      });
    }
  });
