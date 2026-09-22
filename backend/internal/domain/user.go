package domain

import "time"

// LegacyUserID is the deterministic owner assigned to data created before multi-user support.
const LegacyUserID = "legacy"

// User represents a local application user. Authentication-provider identities are mapped separately.
type User struct {
	ID        string    `json:"id"`
	CreatedAt time.Time `json:"createdAt,omitempty"`
	UpdatedAt time.Time `json:"updatedAt,omitempty"`
}
