package pricing

import (
	"testing"

	"pricing-hub/backend/internal/channel"
)

func TestPricingServiceSiteWithoutFees(t *testing.T) {
	service := NewPricingService()
	result, err := service.Calculate(PricingInput{
		ProductCostCents: 1000,
		SalePriceCents:   centsPtr(2000),
		ChannelCode:      "site",
		Mode:             ModeAnalyzeSalePrice,
	}, siteChannel())
	if err != nil {
		t.Fatalf("Calculate() error = %v", err)
	}
	if result.TotalCostCents != 1000 || result.NetProfitCents != 1000 || result.MarginBPS != 5000 {
		t.Fatalf("unexpected result: %+v", result)
	}
}

func TestPricingServiceShopeeTierUpTo7999(t *testing.T) {
	service := NewPricingService()
	result, err := service.Calculate(PricingInput{
		ProductCostCents: 2000,
		SalePriceCents:   centsPtr(5000),
		ChannelCode:      "shopee",
		Mode:             ModeAnalyzeSalePrice,
	}, shopeeChannel())
	if err != nil {
		t.Fatalf("Calculate() error = %v", err)
	}
	if result.ChannelCommissionCents != 1000 || result.ChannelFixedFeeCents != 400 {
		t.Fatalf("unexpected shopee fee: %+v", result)
	}
	if result.TotalCostCents != 3400 || result.NetProfitCents != 1600 || result.MarginBPS != 3200 {
		t.Fatalf("unexpected result: %+v", result)
	}
}

func TestPricingServiceShopeeTier100To199(t *testing.T) {
	service := NewPricingService()
	result, err := service.Calculate(PricingInput{
		ProductCostCents: 5000,
		SalePriceCents:   centsPtr(15000),
		ChannelCode:      "shopee",
		Mode:             ModeAnalyzeSalePrice,
	}, shopeeChannel())
	if err != nil {
		t.Fatalf("Calculate() error = %v", err)
	}
	if result.ChannelCommissionCents != 2100 || result.ChannelFixedFeeCents != 2000 {
		t.Fatalf("unexpected shopee fee: %+v", result)
	}
	if result.TotalCostCents != 9100 || result.NetProfitCents != 5900 || result.MarginBPS != 3933 {
		t.Fatalf("unexpected result: %+v", result)
	}
}

func TestPricingServiceTikTokBelow50(t *testing.T) {
	service := NewPricingService()
	result, err := service.Calculate(PricingInput{
		ProductCostCents: 1000,
		SalePriceCents:   centsPtr(4000),
		ChannelCode:      "tiktok_shop",
		Mode:             ModeAnalyzeSalePrice,
	}, tiktokChannel())
	if err != nil {
		t.Fatalf("Calculate() error = %v", err)
	}
	if result.ChannelCommissionCents != 400 || result.ChannelFixedFeeCents != 400 {
		t.Fatalf("unexpected tiktok fee: %+v", result)
	}
	if result.TotalCostCents != 1800 || result.NetProfitCents != 2200 || result.MarginBPS != 5500 {
		t.Fatalf("unexpected result: %+v", result)
	}
}

func TestPricingServiceTikTokAbove50(t *testing.T) {
	service := NewPricingService()
	result, err := service.Calculate(PricingInput{
		ProductCostCents: 2000,
		SalePriceCents:   centsPtr(10000),
		ChannelCode:      "tiktok_shop",
		Mode:             ModeAnalyzeSalePrice,
	}, tiktokChannel())
	if err != nil {
		t.Fatalf("Calculate() error = %v", err)
	}
	if result.ChannelCommissionCents != 600 || result.ChannelFixedFeeCents != 600 {
		t.Fatalf("unexpected tiktok fee: %+v", result)
	}
	if result.TotalCostCents != 3200 || result.NetProfitCents != 6800 || result.MarginBPS != 6800 {
		t.Fatalf("unexpected result: %+v", result)
	}
}

func TestPricingServiceAnalyzeSalePriceWithTarget(t *testing.T) {
	service := NewPricingService()
	result, err := service.Calculate(PricingInput{
		ProductCostCents: 5000,
		SalePriceCents:   centsPtr(10000),
		DesiredMarginBPS: bpsPtr(3000),
		TaxBPS:           400,
		ChannelCode:      "site",
		Mode:             ModeAnalyzeSalePrice,
	}, siteChannel())
	if err != nil {
		t.Fatalf("Calculate() error = %v", err)
	}
	if result.TaxCents != 400 || result.NetProfitCents != 4600 || result.MarginBPS != 4600 || result.Status != PricingStatusProfit {
		t.Fatalf("unexpected result: %+v", result)
	}
}

func TestPricingServiceTargetMarginBinarySearch(t *testing.T) {
	service := NewPricingService()
	result, err := service.Calculate(PricingInput{
		ProductCostCents: 1000,
		DesiredMarginBPS: bpsPtr(5000),
		ChannelCode:      "site",
		Mode:             ModeTargetMargin,
	}, siteChannel())
	if err != nil {
		t.Fatalf("Calculate() error = %v", err)
	}
	if result.RecommendedSalePriceCents != 2000 || result.MarginBPS != 5000 {
		t.Fatalf("unexpected target margin result: %+v", result)
	}
}

func TestPricingServiceZeroProductCostReturnsZeroResult(t *testing.T) {
	service := NewPricingService()
	result, err := service.Calculate(PricingInput{
		ProductCostCents: 0,
		DesiredMarginBPS: bpsPtr(3000),
		TaxBPS:           400,
		ChannelCode:      "shopee",
		Mode:             ModeTargetMargin,
	}, shopeeChannel())
	if err != nil {
		t.Fatalf("Calculate() error = %v", err)
	}
	if result.RecommendedSalePriceCents != 0 ||
		result.SalePriceCents != 0 ||
		result.TotalCostCents != 0 ||
		result.NetProfitCents != 0 ||
		result.MarginBPS != 0 {
		t.Fatalf("expected zero result, got: %+v", result)
	}
}

func TestPricingServiceLossScenario(t *testing.T) {
	service := NewPricingService()
	result, err := service.Calculate(PricingInput{
		ProductCostCents: 10000,
		SalePriceCents:   centsPtr(8000),
		ChannelCode:      "site",
		Mode:             ModeAnalyzeSalePrice,
	}, siteChannel())
	if err != nil {
		t.Fatalf("Calculate() error = %v", err)
	}
	if result.Status != PricingStatusLoss || result.NetProfitCents != -2000 {
		t.Fatalf("expected loss, got: %+v", result)
	}
}

func siteChannel() channel.Channel {
	return channel.Channel{
		Code: "site",
		FeeRules: channel.FeeRules{
			Strategy: channel.FeeStrategyFixed,
		},
	}
}

func shopeeChannel() channel.Channel {
	max7999 := int64(7999)
	max9999 := int64(9999)
	max19999 := int64(19999)
	max49999 := int64(49999)
	return channel.Channel{
		Code: "shopee",
		FeeRules: channel.FeeRules{
			Strategy: channel.FeeStrategyTiered,
			Tiers: []channel.FeeTier{
				{MinPriceCents: 0, MaxPriceCents: &max7999, CommissionBPS: 2000, FixedFeeCents: 400},
				{MinPriceCents: 8000, MaxPriceCents: &max9999, CommissionBPS: 1400, FixedFeeCents: 1600},
				{MinPriceCents: 10000, MaxPriceCents: &max19999, CommissionBPS: 1400, FixedFeeCents: 2000},
				{MinPriceCents: 20000, MaxPriceCents: &max49999, CommissionBPS: 1400, FixedFeeCents: 2600},
				{MinPriceCents: 50000, CommissionBPS: 1400, FixedFeeCents: 2800},
			},
		},
	}
}

func tiktokChannel() channel.Channel {
	max4999 := int64(4999)
	return channel.Channel{
		Code: "tiktok_shop",
		FeeRules: channel.FeeRules{
			Strategy: channel.FeeStrategyTiered,
			Tiers: []channel.FeeTier{
				{MinPriceCents: 0, MaxPriceCents: &max4999, CommissionBPS: 1000, FixedFeeCents: 400},
				{MinPriceCents: 5000, CommissionBPS: 600, FixedFeeCents: 600},
			},
		},
	}
}

func centsPtr(value int64) *int64 {
	return &value
}

func bpsPtr(value int64) *int64 {
	return &value
}
