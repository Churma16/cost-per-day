package domain

import "errors"

var (
	// ErrUserIdentityRequired indicates that a user-owned operation was attempted without an authenticated user identity.
	ErrUserIdentityRequired = errors.New("authenticated user identity is required")

	// ErrUserNotFound indicates that the requested local user does not exist.
	ErrUserNotFound = errors.New("user not found")

	// ErrSessionNotFound indicates that an application session is missing, expired, or invalid.
	ErrSessionNotFound = errors.New("session not found")

	// ErrInvalidExternalIdentity indicates that an external identity cannot be mapped to a local user.
	ErrInvalidExternalIdentity = errors.New("invalid external identity")

	// ErrItemNotFound indicates that the requested item does not exist for the current user.
	ErrItemNotFound = errors.New("item not found")

	// ErrSettingNotFound indicates that the requested setting key does not exist for the current user.
	ErrSettingNotFound = errors.New("setting not found")

	// ErrEmptyItemName indicates that an item name was omitted or only contains whitespace.
	ErrEmptyItemName = errors.New("item name cannot be empty")

	// ErrInvalidItemPrice indicates that an item price is non-positive or non-finite.
	ErrInvalidItemPrice = errors.New("item price must be greater than zero")

	// ErrUnsupportedItemPrice indicates that an item price cannot be represented at supported precision or range.
	ErrUnsupportedItemPrice = errors.New("item price is outside supported range")

	// ErrInvalidPurchaseDate indicates that an item purchase date does not follow a valid ISO 8601 or RFC 3339 format.
	ErrInvalidPurchaseDate = errors.New("invalid purchase date")

	// ErrInvalidItemStatus indicates that the requested lifecycle state is unsupported.
	ErrInvalidItemStatus = errors.New("invalid item status")

	// ErrMissingItemEndDate indicates that a completed lifecycle is missing its required end date.
	ErrMissingItemEndDate = errors.New("ended_at is required for non-active items")

	// ErrInvalidItemEndDate indicates that an ownership end date is not a supported date.
	ErrInvalidItemEndDate = errors.New("invalid ended_at")

	// ErrItemEndBeforePurchase indicates that an ownership end date predates purchase.
	ErrItemEndBeforePurchase = errors.New("ended_at cannot be earlier than purchase_date")

	// ErrItemEndInFuture indicates that a completed lifecycle has an end date after today.
	ErrItemEndInFuture = errors.New("ended_at cannot be in the future")

	// ErrInvalidSalePrice indicates that a sold item is missing a valid non-negative sale price.
	ErrInvalidSalePrice = errors.New("sold items require a valid non-negative sale price")

	// ErrUnexpectedSalePrice indicates that sale price was supplied for a state where it is not meaningful.
	ErrUnexpectedSalePrice = errors.New("sale price is only allowed for sold items")

	// ErrEmptySettingKey indicates that a setting key was empty or whitespace.
	ErrEmptySettingKey = errors.New("setting key cannot be empty")

	// ErrEmptySettingValue indicates that a setting value was empty or whitespace.
	ErrEmptySettingValue = errors.New("setting value cannot be empty")

	// ErrValueEquivalentNotFound indicates that the requested value equivalent was not found for the user.
	ErrValueEquivalentNotFound = errors.New("value equivalent not found")

	// ErrEmptyValueEquivalentName indicates that a value equivalent name was empty or whitespace.
	ErrEmptyValueEquivalentName = errors.New("value equivalent name cannot be empty")

	// ErrInvalidValueEquivalentAmount indicates that a value equivalent amount is non-positive or non-finite.
	ErrInvalidValueEquivalentAmount = errors.New("value equivalent amount must be greater than zero")

	// ErrUnsupportedValueEquivalentAmount indicates that a value equivalent amount is outside supported range or precision.
	ErrUnsupportedValueEquivalentAmount = errors.New("value equivalent amount is outside supported range")

	// ErrInvalidValueEquivalentCurrency indicates that a value equivalent currency code is missing or unsupported.
	ErrInvalidValueEquivalentCurrency = errors.New("value equivalent currency code is invalid")

	// ErrPlannedPurchaseNotFound indicates that the requested planned purchase does not exist for the current user.
	ErrPlannedPurchaseNotFound = errors.New("planned purchase not found")

	// ErrEmptyPlannedPurchaseName indicates that a planned purchase name was omitted or only contains whitespace.
	ErrEmptyPlannedPurchaseName = errors.New("planned purchase name cannot be empty")

	// ErrInvalidPlannedPurchasePrice indicates that a planned purchase target price is non-positive or non-finite.
	ErrInvalidPlannedPurchasePrice = errors.New("planned purchase target price must be greater than zero")

	// ErrUnsupportedPlannedPurchasePrice indicates that a planned purchase target price is outside supported range or precision.
	ErrUnsupportedPlannedPurchasePrice = errors.New("planned purchase target price is outside supported range")

	// ErrInvalidPlannedPurchaseCurrency indicates that a planned purchase currency code is missing or unsupported.
	ErrInvalidPlannedPurchaseCurrency = errors.New("planned purchase currency code is invalid")

	// ErrInvalidTargetDate indicates that a planned purchase target date is malformed or not in the future.
	ErrInvalidTargetDate = errors.New("target date must be in the future")

	// ErrInvalidContributionAmount indicates that a contribution amount is non-positive or non-finite.
	ErrInvalidContributionAmount = errors.New("contribution amount must be greater than zero")

	// ErrUnsupportedContributionAmount indicates that a contribution amount is outside supported range or precision.
	ErrUnsupportedContributionAmount = errors.New("contribution amount is outside supported range")

	// ErrInvalidContributionCadence indicates that a contribution cadence is not one of daily, weekly, or monthly.
	ErrInvalidContributionCadence = errors.New("invalid contribution cadence")

	// ErrMissingContributionCadence indicates that a contribution amount was supplied without a cadence.
	ErrMissingContributionCadence = errors.New("contribution cadence is required when contribution amount is provided")

	// ErrMissingContributionAmount indicates that a contribution cadence was supplied without an amount.
	ErrMissingContributionAmount = errors.New("contribution amount is required when contribution cadence is provided")

	// ErrMissingOwnershipTargetType indicates that target value was supplied without target type.
	ErrMissingOwnershipTargetType = errors.New("ownership target type is required when target value is provided")

	// ErrMissingOwnershipTargetValue indicates that target type was supplied without target value.
	ErrMissingOwnershipTargetValue = errors.New("ownership target value is required when target type is provided")

	// ErrInvalidOwnershipTargetType indicates that target type is neither cost_per_day nor duration.
	ErrInvalidOwnershipTargetType = errors.New("invalid ownership target type")

	// ErrInvalidOwnershipTargetValue indicates that target value is non-positive or non-finite.
	ErrInvalidOwnershipTargetValue = errors.New("ownership target value must be greater than zero")

	// ErrUnsupportedOwnershipTargetValue indicates that target value is outside supported range or precision.
	ErrUnsupportedOwnershipTargetValue = errors.New("ownership target value is outside supported range")

	// ErrInvalidBenchmarkPrice indicates that candidate replacement price is non-positive or non-finite.
	ErrInvalidBenchmarkPrice = errors.New("replacement benchmark price must be greater than zero")

	// ErrUnsupportedBenchmarkPrice indicates that candidate replacement price is outside supported range or precision.
	ErrUnsupportedBenchmarkPrice = errors.New("replacement benchmark price is outside supported range")

	// ErrBenchmarkItemNotCompleted indicates that benchmark was attempted on an active item.
	ErrBenchmarkItemNotCompleted = errors.New("replacement benchmark requires a completed historical item")
)

