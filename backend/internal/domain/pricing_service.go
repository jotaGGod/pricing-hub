package domain

import "strings"

const (
	bpsBase        int64 = 10000
	maxSearchPrice int64 = 100_000_000_00
)

type PricingService struct{}

type channelFeeResult struct {
	commissionCents int64
	fixedFeeCents   int64
	optionFeeCents  int64
	breakdown       []PricingBreakdownItem
}

func NewPricingService() *PricingService {
	return &PricingService{}
}

func (s *PricingService) Calculate(input PricingInput, channel Channel) (PricingResult, error) {
	if err := validatePricingInput(input); err != nil {
		return PricingResult{}, err
	}
	if input.ProductCostCents == 0 {
		return zeroPricingResult(), nil
	}

	switch input.Mode {
	case PricingModeAnalyzeSalePrice:
		if input.SalePriceCents == nil || *input.SalePriceCents <= 0 {
			return PricingResult{}, ErrInvalidInput
		}
		return s.calculateAtPrice(input, channel, *input.SalePriceCents)
	case PricingModeTargetMargin:
		if input.DesiredMarginBPS == nil || *input.DesiredMarginBPS < 0 || *input.DesiredMarginBPS >= bpsBase {
			return PricingResult{}, ErrInvalidInput
		}
		return s.calculateTargetMargin(input, channel, *input.DesiredMarginBPS)
	default:
		return PricingResult{}, ErrInvalidInput
	}
}

func zeroPricingResult() PricingResult {
	return PricingResult{
		Status: PricingStatusProfit,
		Breakdown: []PricingBreakdownItem{
			{Label: "Custo do produto", AmountCents: 0},
		},
	}
}

func (s *PricingService) calculateTargetMargin(input PricingInput, channel Channel, desiredMarginBPS int64) (PricingResult, error) {
	low := s.minimumCostFloor(input, channel)
	if low < 1 {
		low = 1
	}
	high := low * 3
	if high < 1000 {
		high = 1000
	}

	var highResult PricingResult
	found := false
	for high <= maxSearchPrice {
		result, err := s.calculateAtPrice(input, channel, high)
		if err != nil {
			return PricingResult{}, err
		}
		if result.MarginBPS >= desiredMarginBPS && result.NetProfitCents >= 0 {
			highResult = result
			found = true
			break
		}
		high *= 2
	}
	if !found {
		return PricingResult{}, ErrImpossibleMargin
	}

	for i := 0; i < 80 && low < high; i++ {
		mid := low + (high-low)/2
		result, err := s.calculateAtPrice(input, channel, mid)
		if err != nil {
			return PricingResult{}, err
		}
		if result.MarginBPS >= desiredMarginBPS && result.NetProfitCents >= 0 {
			high = mid
			highResult = result
		} else {
			low = mid + 1
		}
	}

	best, err := s.calculateAtPrice(input, channel, high)
	if err != nil {
		return PricingResult{}, err
	}
	if best.MarginBPS < desiredMarginBPS || best.NetProfitCents < 0 {
		best = highResult
	}

	// Marketplace tiers can add discrete fixed fees at boundaries. This short
	// correction keeps the binary search conservative around those jumps.
	for attempts := 0; attempts < 10_000 && best.SalePriceCents > 1; attempts++ {
		previous, err := s.calculateAtPrice(input, channel, best.SalePriceCents-1)
		if err != nil || previous.MarginBPS < desiredMarginBPS || previous.NetProfitCents < 0 {
			break
		}
		best = previous
	}

	best.RecommendedSalePriceCents = best.SalePriceCents
	return best, nil
}

func (s *PricingService) calculateAtPrice(input PricingInput, channel Channel, salePriceCents int64) (PricingResult, error) {
	if salePriceCents <= 0 {
		return PricingResult{}, ErrInvalidInput
	}

	feeBaseCents := salePriceCents - percentFloor(salePriceCents, input.SellerDiscountBPS)
	if feeBaseCents < 0 {
		feeBaseCents = 0
	}

	channelFee := s.calculateChannelFee(channel, feeBaseCents, input.ChannelOptions)

	manualFixedCents, manualPercentCents, manualBreakdown := calculateManualCosts(input.ManualCosts, feeBaseCents)
	logisticFixedCents, logisticPercentCents, logisticBreakdown := calculateLogisticCost(input.LogisticCost, feeBaseCents)
	taxCents := percentCeil(feeBaseCents, input.TaxBPS)
	adsCents := percentCeil(feeBaseCents, input.AdsBPS)
	fixedCostsCents := percentCeil(feeBaseCents, input.FixedCostsBPS)
	extraFeesCents := percentCeil(feeBaseCents, input.ExtraFeesBPS)

	channelFeeCents := channelFee.commissionCents + channelFee.fixedFeeCents + channelFee.optionFeeCents
	manualCostsTotalCents := manualFixedCents + manualPercentCents
	totalCostCents := input.ProductCostCents +
		manualCostsTotalCents +
		logisticFixedCents +
		logisticPercentCents +
		channelFeeCents +
		taxCents +
		adsCents +
		fixedCostsCents +
		extraFeesCents

	netProfitCents := salePriceCents - totalCostCents
	marginBPS := int64(0)
	if salePriceCents > 0 {
		marginBPS = netProfitCents * bpsBase / salePriceCents
	}

	markupBPS := int64(0)
	if input.ProductCostCents > 0 {
		markupBPS = netProfitCents * bpsBase / input.ProductCostCents
	}

	status := PricingStatusProfit
	if netProfitCents < 0 {
		status = PricingStatusLoss
	} else if input.DesiredMarginBPS != nil && marginBPS < *input.DesiredMarginBPS {
		status = PricingStatusWarning
	}

	breakdown := []PricingBreakdownItem{
		{Label: "Custo do produto", AmountCents: input.ProductCostCents},
	}
	breakdown = append(breakdown, manualBreakdown...)
	breakdown = append(breakdown, logisticBreakdown...)
	breakdown = append(breakdown, channelFee.breakdown...)
	breakdown = append(breakdown,
		PricingBreakdownItem{Label: "Impostos", AmountCents: taxCents, BPS: ptrBPS(input.TaxBPS)},
		PricingBreakdownItem{Label: "Ads", AmountCents: adsCents, BPS: ptrBPS(input.AdsBPS)},
		PricingBreakdownItem{Label: "Custos fixos percentuais", AmountCents: fixedCostsCents, BPS: ptrBPS(input.FixedCostsBPS)},
		PricingBreakdownItem{Label: "Taxas extras", AmountCents: extraFeesCents, BPS: ptrBPS(input.ExtraFeesBPS)},
	)

	return PricingResult{
		SalePriceCents:            salePriceCents,
		RecommendedSalePriceCents: salePriceCents,
		TotalCostCents:            totalCostCents,
		ProductCostCents:          input.ProductCostCents,
		ManualCostsTotalCents:     manualCostsTotalCents,
		ChannelFeeCents:           channelFeeCents,
		ChannelCommissionCents:    channelFee.commissionCents,
		ChannelFixedFeeCents:      channelFee.fixedFeeCents,
		TaxCents:                  taxCents,
		AdsCents:                  adsCents,
		ExtraFeesCents:            extraFeesCents,
		NetProfitCents:            netProfitCents,
		MarginBPS:                 marginBPS,
		MarkupBPS:                 markupBPS,
		Status:                    status,
		Breakdown:                 breakdown,
	}, nil
}

func (s *PricingService) minimumCostFloor(input PricingInput, channel Channel) int64 {
	manualFixedCents := int64(0)
	for _, cost := range input.ManualCosts {
		if cost.Enabled && cost.Type == CostTypeFixedAmount {
			manualFixedCents += cost.AmountCents
		}
	}
	logisticFixedCents := int64(0)
	if input.LogisticCost != nil && input.LogisticCost.Type == CostTypeFixedAmount {
		logisticFixedCents = input.LogisticCost.AmountCents
	}
	channelFee := s.calculateChannelFee(channel, 0, input.ChannelOptions)
	return input.ProductCostCents + manualFixedCents + logisticFixedCents + channelFee.fixedFeeCents + channelFee.optionFeeCents
}

func (s *PricingService) calculateChannelFee(channel Channel, feeBaseCents int64, options ChannelOptions) channelFeeResult {
	commissionBPS := channel.FeeRules.DefaultCommissionBPS
	fixedFeeCents := channel.FeeRules.FixedFeeCents
	label := "Comissão do canal"

	switch channel.FeeRules.Strategy {
	case FeeStrategyTiered:
		for _, tier := range channel.FeeRules.Tiers {
			if feeBaseCents < tier.MinPriceCents {
				continue
			}
			if tier.MaxPriceCents != nil && feeBaseCents > *tier.MaxPriceCents {
				continue
			}
			commissionBPS = tier.CommissionBPS
			fixedFeeCents = tier.FixedFeeCents
			if strings.TrimSpace(tier.Label) != "" {
				label = "Comissão do canal - " + tier.Label
			}
			break
		}
	case FeeStrategyCategory:
		selected := strings.TrimSpace(options.CategoryCode)
		foundCategory := false
		for _, category := range channel.FeeRules.Categories {
			if selected != "" && category.Code == selected {
				commissionBPS = category.CommissionBPS
				fixedFeeCents = category.FixedFeeCents
				label = "Comissão do canal - " + category.Name
				foundCategory = true
				break
			}
		}
		if !foundCategory && selected == "" {
			for _, category := range channel.FeeRules.Categories {
				if category.Code == "default" || category.Code == "demais" {
					commissionBPS = category.CommissionBPS
					fixedFeeCents = category.FixedFeeCents
					label = "Comissão do canal - " + category.Name
					break
				}
			}
		}
	}

	if options.OverrideCommissionBPS != nil {
		commissionBPS = *options.OverrideCommissionBPS
	}
	if options.OverrideFixedFeeCents != nil {
		fixedFeeCents = *options.OverrideFixedFeeCents
	}

	commissionCents := percentCeil(feeBaseCents, commissionBPS)
	if channel.FeeRules.MinCommissionCents > 0 && commissionCents < channel.FeeRules.MinCommissionCents {
		commissionCents = channel.FeeRules.MinCommissionCents
	}

	breakdown := []PricingBreakdownItem{
		{Label: label, AmountCents: commissionCents, BPS: ptrBPS(commissionBPS)},
		{Label: "Tarifa fixa do canal", AmountCents: fixedFeeCents},
	}

	optionFeeCents := int64(0)
	for _, option := range channel.FeeRules.Options {
		enabled := option.DefaultEnabled
		if options.EnabledOptionCodes != nil {
			if explicit, ok := options.EnabledOptionCodes[option.Code]; ok {
				enabled = explicit
			}
		}
		if !enabled {
			continue
		}

		amount := int64(0)
		switch option.Type {
		case FeeOptionPercentage:
			amount = percentCeil(feeBaseCents, option.BPS)
		case FeeOptionPercentageWithCap:
			amount = percentCeil(feeBaseCents, option.BPS)
			if option.CapCents != nil && amount > *option.CapCents {
				amount = *option.CapCents
			}
		case FeeOptionFixedAmount:
			amount = option.FixedAmountCents
		}
		optionFeeCents += amount
		breakdown = append(breakdown, PricingBreakdownItem{Label: option.Label, AmountCents: amount, BPS: ptrBPS(option.BPS)})
	}

	return channelFeeResult{
		commissionCents: commissionCents,
		fixedFeeCents:   fixedFeeCents,
		optionFeeCents:  optionFeeCents,
		breakdown:       breakdown,
	}
}

func calculateManualCosts(costs []ManualCost, feeBaseCents int64) (int64, int64, []PricingBreakdownItem) {
	fixedTotal := int64(0)
	percentTotal := int64(0)
	breakdown := make([]PricingBreakdownItem, 0, len(costs))
	for _, cost := range costs {
		if !cost.Enabled {
			continue
		}
		label := strings.TrimSpace(cost.Name)
		if label == "" {
			label = "Custo manual"
		}
		switch cost.Type {
		case CostTypeFixedAmount:
			fixedTotal += cost.AmountCents
			breakdown = append(breakdown, PricingBreakdownItem{Label: label, AmountCents: cost.AmountCents})
		case CostTypePercentage:
			amount := percentCeil(feeBaseCents, cost.BPS)
			percentTotal += amount
			breakdown = append(breakdown, PricingBreakdownItem{Label: label, AmountCents: amount, BPS: ptrBPS(cost.BPS)})
		}
	}
	return fixedTotal, percentTotal, breakdown
}

func calculateLogisticCost(cost *VariableCost, feeBaseCents int64) (int64, int64, []PricingBreakdownItem) {
	if cost == nil {
		return 0, 0, nil
	}
	switch cost.Type {
	case CostTypeFixedAmount:
		return cost.AmountCents, 0, []PricingBreakdownItem{{Label: "Logística", AmountCents: cost.AmountCents}}
	case CostTypePercentage:
		amount := percentCeil(feeBaseCents, cost.BPS)
		return 0, amount, []PricingBreakdownItem{{Label: "Logística", AmountCents: amount, BPS: ptrBPS(cost.BPS)}}
	default:
		return 0, 0, nil
	}
}

func validatePricingInput(input PricingInput) error {
	if input.ProductCostCents < 0 ||
		input.SellerDiscountBPS < 0 ||
		input.AdsBPS < 0 ||
		input.FixedCostsBPS < 0 ||
		input.TaxBPS < 0 ||
		input.ExtraFeesBPS < 0 {
		return ErrInvalidInput
	}
	if input.SellerDiscountBPS > bpsBase {
		return ErrInvalidInput
	}
	for _, cost := range input.ManualCosts {
		if cost.AmountCents < 0 || cost.BPS < 0 {
			return ErrInvalidInput
		}
	}
	if input.LogisticCost != nil && (input.LogisticCost.AmountCents < 0 || input.LogisticCost.BPS < 0) {
		return ErrInvalidInput
	}
	if input.ChannelOptions.OverrideCommissionBPS != nil && *input.ChannelOptions.OverrideCommissionBPS < 0 {
		return ErrInvalidInput
	}
	if input.ChannelOptions.OverrideFixedFeeCents != nil && *input.ChannelOptions.OverrideFixedFeeCents < 0 {
		return ErrInvalidInput
	}
	return nil
}

func percentCeil(amountCents int64, bps int64) int64 {
	if amountCents <= 0 || bps <= 0 {
		return 0
	}
	return (amountCents*bps + bpsBase - 1) / bpsBase
}

func percentFloor(amountCents int64, bps int64) int64 {
	if amountCents <= 0 || bps <= 0 {
		return 0
	}
	return amountCents * bps / bpsBase
}

func ptrBPS(bps int64) *int64 {
	if bps <= 0 {
		return nil
	}
	return &bps
}
