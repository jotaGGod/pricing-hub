alter table user_preferences
add column if not exists default_costs_json jsonb not null default '{
  "tax_bps": 400,
  "ads_bps": 0,
  "fixed_costs_bps": 0,
  "extra_fees_bps": 0,
  "seller_discount_bps": 0,
  "logistic_cost": {"type": "fixed_amount", "amount_cents": 0, "bps": 0},
  "manual_costs": []
}'::jsonb;
