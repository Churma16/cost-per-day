package domain

import "time"

// Setting represents one user-owned key-value configuration preference such as language or currency.
type Setting struct {
	UserID    string    `json:"-"`
	Key       string    `json:"key"`
	Value     string    `json:"value"`
	UpdatedAt time.Time `json:"updatedAt,omitempty"`
}
