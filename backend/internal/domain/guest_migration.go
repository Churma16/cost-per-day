package domain

// GuestMigrationResult summarizes one authenticated import of local guest data.
type GuestMigrationResult struct {
	ImportedItems            int  `json:"importedItems"`
	ImportedPlannedPurchases int  `json:"importedPlannedPurchases"`
	ImportedValueEquivalents int  `json:"importedValueEquivalents"`
	AlreadyImported          bool `json:"alreadyImported"`
}
