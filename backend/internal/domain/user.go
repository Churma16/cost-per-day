package domain

import "time"

// LegacyUserID is the deterministic owner assigned to data created before multi-user support.
const LegacyUserID = "legacy"

// User represents a local application user. GoogleSub is persistence-only and is never serialized to API clients.
type User struct {
	ID          string    `json:"id"`
	GoogleSub   string    `json:"-"`
	Email       string    `json:"email,omitempty"`
	DisplayName string    `json:"displayName,omitempty"`
	AvatarURL   string    `json:"avatarUrl,omitempty"`
	CreatedAt   time.Time `json:"createdAt,omitempty"`
	UpdatedAt   time.Time `json:"updatedAt,omitempty"`
}

// Session represents an application-owned authenticated session. Only the hash of the opaque browser token is persisted.
type Session struct {
	TokenHash string
	UserID    string
	CreatedAt time.Time
	ExpiresAt time.Time
}
