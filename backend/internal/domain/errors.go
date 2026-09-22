package domain

import "errors"

var (
	// ErrItemNotFound indicates that the requested item does not exist.
	ErrItemNotFound = errors.New("item not found")

	// ErrSettingNotFound indicates that the requested setting key does not exist.
	ErrSettingNotFound = errors.New("setting not found")

	// ErrEmptyItemName indicates that an item name was omitted or only contains whitespace.
	ErrEmptyItemName = errors.New("item name cannot be empty")

	// ErrInvalidItemPrice indicates that an item price is non-positive or non-finite.
	ErrInvalidItemPrice = errors.New("item price must be greater than zero")

	// ErrUnsupportedItemPrice indicates that an item price cannot be represented at supported precision or range.
	ErrUnsupportedItemPrice = errors.New("item price is outside supported range")

	// ErrInvalidPurchaseDate indicates that an item purchase date does not follow a valid ISO 8601 or RFC 3339 format.
	ErrInvalidPurchaseDate = errors.New("invalid purchase date")

	// ErrEmptySettingKey indicates that a setting key was empty or whitespace.
	ErrEmptySettingKey = errors.New("setting key cannot be empty")

	// ErrEmptySettingValue indicates that a setting value was empty or whitespace.
	ErrEmptySettingValue = errors.New("setting value cannot be empty")
)
