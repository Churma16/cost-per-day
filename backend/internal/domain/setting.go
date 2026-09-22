package domain

import "time"

// Setting represents a key-value configuration preference such as language or currency.
type Setting struct {
	Key       string    `json:"key"`
	Value     string    `json:"value"`
	UpdatedAt time.Time `json:"updatedAt,omitempty"`
}
