package domain

// GuestMigrationResult summarizes one authenticated import of local guest data.
type GuestMigrationResult struct {
	ImportedItems            int  `json:"importedItems"`
	ImportedPlannedPurchases int  `json:"importedPlannedPurchases"`
	AlreadyImported          bool `json:"alreadyImported"`
}
