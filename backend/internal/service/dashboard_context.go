package service

import (
	"fmt"
	"math"
	"strings"
	"time"

	"cost-per-day/backend/internal/domain"
)

// DashboardContext encapsulates all user data required by insight providers for a single request.
// Providers compute their insights purely from this shared context without re-querying repositories.
type DashboardContext struct {
	UserID         string
	Items          []domain.Item
	ActiveItems    []domain.Item
	Equivalents    []domain.ValueEquivalent
	Settings       map[string]string
	Language       string
	CurrencyCode   string
	TotalDailyCost float64
	Now            time.Time
}

// FormatCurrency formats a monetary amount using the context's currency code and conventions.
func (dashboardContext DashboardContext) FormatCurrency(amount float64) string {
	normalizedCurrency := strings.ToUpper(strings.TrimSpace(dashboardContext.CurrencyCode))
	if normalizedCurrency == "" {
		normalizedCurrency = "USD"
	}

	roundedAmount := math.Round(amount*100) / 100

	switch normalizedCurrency {
	case "IDR":
		// IDR amounts are whole numbers with dot thousands separators.
		wholeNumber := int64(math.Round(amount))
		return fmt.Sprintf("Rp %s", formatWithThousandsSeparator(wholeNumber, '.'))
	case "USD":
		return fmt.Sprintf("$%s", formatFloatWithThousandsSeparator(roundedAmount, ',', '.'))
	case "EUR":
		return fmt.Sprintf("€%s", formatFloatWithThousandsSeparator(roundedAmount, '.', ','))
	case "GBP":
		return fmt.Sprintf("£%s", formatFloatWithThousandsSeparator(roundedAmount, ',', '.'))
	default:
		return fmt.Sprintf("%s %s", normalizedCurrency, formatFloatWithThousandsSeparator(roundedAmount, ',', '.'))
	}
}

func formatWithThousandsSeparator(integerValue int64, separator rune) string {
	isNegative := integerValue < 0
	if isNegative {
		integerValue = -integerValue
	}

	rawString := fmt.Sprintf("%d", integerValue)
	length := len(rawString)
	if length <= 3 {
		if isNegative {
			return "-" + rawString
		}
		return rawString
	}

	var formattedBuilder strings.Builder
	remainder := length % 3
	if remainder > 0 {
		formattedBuilder.WriteString(rawString[:remainder])
	}

	for index := remainder; index < length; index += 3 {
		if formattedBuilder.Len() > 0 {
			formattedBuilder.WriteRune(separator)
		}
		formattedBuilder.WriteString(rawString[index : index+3])
	}

	if isNegative {
		return "-" + formattedBuilder.String()
	}
	return formattedBuilder.String()
}

func formatFloatWithThousandsSeparator(floatValue float64, thousandsSeparator rune, decimalSeparator rune) string {
	isNegative := floatValue < 0
	if isNegative {
		floatValue = -floatValue
	}

	integerPart := int64(math.Floor(floatValue))
	fractionalPart := int64(math.Round((floatValue - math.Floor(floatValue)) * 100))
	if fractionalPart >= 100 {
		integerPart++
		fractionalPart = 0
	}

	formattedInteger := formatWithThousandsSeparator(integerPart, thousandsSeparator)
	formattedString := fmt.Sprintf("%s%c%02d", formattedInteger, decimalSeparator, fractionalPart)

	if isNegative {
		return "-" + formattedString
	}
	return formattedString
}
