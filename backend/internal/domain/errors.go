package domain

import "errors"

var (
	// ErrUserIdentityRequired indicates that a user-owned operation was attempted without an authenticated user identity.
	ErrUserIdentityRequired = errors.New("authenticated user identity is required")

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
)
