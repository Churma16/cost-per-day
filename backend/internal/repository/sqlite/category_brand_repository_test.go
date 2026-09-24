package sqlite_test

import (
	"context"
	"path/filepath"
	"testing"

	"cost-per-day/backend/internal/domain"
	sqliterepository "cost-per-day/backend/internal/repository/sqlite"
)

func TestCategoryAndBrandRepository_FindOrCreateAndList(t *testing.T) {
	ctx := context.Background()
	tempDirectory := t.TempDir()
	databasePath := filepath.Join(tempDirectory, "test.db")

	databaseConnection, err := sqliterepository.Open(ctx, databasePath)
	if err != nil {
		t.Fatalf("open database: %v", err)
	}
	defer databaseConnection.Close()

	gormDB, err := sqliterepository.NewGORM(databaseConnection)
	if err != nil {
		t.Fatalf("initialize gorm: %v", err)
	}

	categoryRepo := sqliterepository.NewCategoryRepository(gormDB)
	brandRepo := sqliterepository.NewBrandRepository(gormDB)

	userA := "user_a"
	userB := "user_b"
	_, err = databaseConnection.ExecContext(ctx, "INSERT INTO users (id, created_at, updated_at) VALUES (?, '2026-01-01', '2026-01-01'), (?, '2026-01-01', '2026-01-01')", userA, userB)
	if err != nil {
		t.Fatalf("insert test users: %v", err)
	}

	// 1. FindOrCreate for userA
	cat1, err := categoryRepo.FindOrCreate(ctx, userA, "TWS")
	if err != nil {
		t.Fatalf("create category: %v", err)
	}
	if cat1.ID <= 0 || cat1.Name != "TWS" {
		t.Fatalf("unexpected category: %+v", cat1)
	}

	// 2. Case-insensitive find returns existing
	cat1Lower, err := categoryRepo.FindOrCreate(ctx, userA, "tws")
	if err != nil {
		t.Fatalf("find category case-insensitive: %v", err)
	}
	if cat1Lower.ID != cat1.ID {
		t.Fatalf("expected same category ID %d, got %d", cat1.ID, cat1Lower.ID)
	}

	// 3. User isolation: User B creating "TWS" gets their own ID
	catB, err := categoryRepo.FindOrCreate(ctx, userB, "TWS")
	if err != nil {
		t.Fatalf("create user B category: %v", err)
	}
	if catB.ID == cat1.ID {
		t.Fatalf("expected different category IDs across users, got %d", catB.ID)
	}

	// 4. Brands FindOrCreate
	brand1, err := brandRepo.FindOrCreate(ctx, userA, "Sony")
	if err != nil {
		t.Fatalf("create brand: %v", err)
	}
	brand1Lower, err := brandRepo.FindOrCreate(ctx, userA, "  sony  ")
	if err != nil {
		t.Fatalf("find brand trimmed: %v", err)
	}
	if brand1Lower.ID != brand1.ID {
		t.Fatalf("expected same brand ID %d, got %d", brand1.ID, brand1Lower.ID)
	}

	// 5. Item with category and brand
	itemRepo := sqliterepository.NewItemRepository(databaseConnection)
	itemCategory := cat1.Name
	itemBrand := brand1.Name
	createdItem, err := itemRepo.Create(ctx, userA, domain.Item{
		Name:         "Sony WF-1000XM5",
		Price:        350,
		PurchaseDate: "2026-01-01T12:00:00Z",
		Status:       domain.ItemStatusActive,
		CategoryID:   &cat1.ID,
		BrandID:      &brand1.ID,
	})
	if err != nil {
		t.Fatalf("create item with category and brand: %v", err)
	}

	// 6. List items joins category and brand names
	items, err := itemRepo.List(ctx, userA)
	if err != nil {
		t.Fatalf("list items: %v", err)
	}
	if len(items) != 1 {
		t.Fatalf("expected 1 item, got %d", len(items))
	}
	if items[0].Category == nil || *items[0].Category != itemCategory {
		t.Fatalf("expected category %q, got %v", itemCategory, items[0].Category)
	}
	if items[0].Brand == nil || *items[0].Brand != itemBrand {
		t.Fatalf("expected brand %q, got %v", itemBrand, items[0].Brand)
	}

	// 7. GetByID joins category and brand names
	fetchedItem, err := itemRepo.GetByID(ctx, userA, createdItem.ID)
	if err != nil {
		t.Fatalf("get item by id: %v", err)
	}
	if fetchedItem.Category == nil || *fetchedItem.Category != itemCategory {
		t.Fatalf("expected category %q, got %v", itemCategory, fetchedItem.Category)
	}
	if fetchedItem.Brand == nil || *fetchedItem.Brand != itemBrand {
		t.Fatalf("expected brand %q, got %v", itemBrand, fetchedItem.Brand)
	}
}
