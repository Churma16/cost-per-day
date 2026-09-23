package http_test

import (
	"bytes"
	"math"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestItemsAPIOwnershipTargetsAndBenchmarks(t *testing.T) {
	routerInstance := setupTestRouter()

	// 1. Create item with cost_per_day target
	createTargetRequest, _ := http.NewRequest(
		http.MethodPost,
		"/api/items",
		bytes.NewBufferString(`{
			"name": "Headphones",
			"price": 2400000,
			"purchaseDate": "2026-09-01T12:00:00Z",
			"targetType": "cost_per_day",
			"targetValue": 4000
		}`),
	)
	createTargetRequest.Header.Set("Content-Type", "application/json")
	createRecorder := httptest.NewRecorder()
	routerInstance.ServeHTTP(createRecorder, createTargetRequest)
	if createRecorder.Code != http.StatusCreated {
		t.Fatalf("create item with target: status %d body %s", createRecorder.Code, createRecorder.Body.String())
	}

	createEnvelope := parseResponseBody(t, createRecorder)
	createdItem := createEnvelope.Data.(map[string]any)
	itemID := createdItem["id"].(string)

	if createdItem["targetType"] != "cost_per_day" {
		t.Fatalf("expected targetType cost_per_day, got %v", createdItem["targetType"])
	}
	if createdItem["targetCostPerDay"].(float64) != 4000 {
		t.Fatalf("expected targetCostPerDay 4000, got %v", createdItem["targetCostPerDay"])
	}
	if createdItem["targetDurationDays"].(float64) != 600 {
		t.Fatalf("expected targetDurationDays 600, got %v", createdItem["targetDurationDays"])
	}

	// 2. Querying benchmark on active item should return 400 Bad Request
	activeBenchmarkReq, _ := http.NewRequest(
		http.MethodGet,
		"/api/items/"+itemID+"/replacement-benchmark?price=3000000",
		nil,
	)
	activeBenchmarkRec := httptest.NewRecorder()
	routerInstance.ServeHTTP(activeBenchmarkRec, activeBenchmarkReq)
	if activeBenchmarkRec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 for active item benchmark, got %d body %s", activeBenchmarkRec.Code, activeBenchmarkRec.Body.String())
	}

	// 3. Retire item with completed lifecycle (e.g. ended at 2026-09-11 -> 10 days)
	retireRequest, _ := http.NewRequest(
		http.MethodPut,
		"/api/items/"+itemID,
		bytes.NewBufferString(`{
			"name": "Headphones",
			"price": 2400000,
			"purchaseDate": "2026-09-01T12:00:00Z",
			"status": "retired",
			"endedAt": "2026-09-11T12:00:00Z",
			"targetType": "cost_per_day",
			"targetValue": 4000
		}`),
	)
	retireRequest.Header.Set("Content-Type", "application/json")
	retireRecorder := httptest.NewRecorder()
	routerInstance.ServeHTTP(retireRecorder, retireRequest)
	if retireRecorder.Code != http.StatusOK {
		t.Fatalf("retire item: status %d body %s", retireRecorder.Code, retireRecorder.Body.String())
	}

	retireEnvelope := parseResponseBody(t, retireRecorder)
	retiredItem := retireEnvelope.Data.(map[string]any)
	if retiredItem["ownershipDays"].(float64) != 10 {
		t.Fatalf("expected 10 ownership days, got %v", retiredItem["ownershipDays"])
	}

	// 4. Query benchmark on completed item
	// Price: 2.400.000, 10 days -> final cost/day = 240.000. Target cost/day = 4.000.
	// Candidate price: 3.000.000
	// Match previous: ceil(3.000.000 / 240.000) = 13 days
	// Beat previous: 13 days
	// Match target: ceil(3.000.000 / 4.000) = 750 days
	benchmarkReq, _ := http.NewRequest(
		http.MethodGet,
		"/api/items/"+itemID+"/replacement-benchmark?price=3000000",
		nil,
	)
	benchmarkRec := httptest.NewRecorder()
	routerInstance.ServeHTTP(benchmarkRec, benchmarkReq)
	if benchmarkRec.Code != http.StatusOK {
		t.Fatalf("benchmark request failed: status %d body %s", benchmarkRec.Code, benchmarkRec.Body.String())
	}

	benchmarkEnvelope := parseResponseBody(t, benchmarkRec)
	benchmarkData := benchmarkEnvelope.Data.(map[string]any)

	if benchmarkData["daysToMatchPrevious"].(float64) != 13 {
		t.Fatalf("expected 13 days to match previous, got %v", benchmarkData["daysToMatchPrevious"])
	}
	if benchmarkData["daysToBeatPrevious"].(float64) != 13 {
		t.Fatalf("expected 13 days to beat previous, got %v", benchmarkData["daysToBeatPrevious"])
	}
	if benchmarkData["hasTarget"] != true {
		t.Fatalf("expected hasTarget true, got %v", benchmarkData["hasTarget"])
	}
	if math.Abs(benchmarkData["targetCostPerDay"].(float64)-4000) > 0.0001 {
		t.Fatalf("expected target cost/day 4000, got %v", benchmarkData["targetCostPerDay"])
	}
	if benchmarkData["daysToMatchTarget"].(float64) != 750 {
		t.Fatalf("expected 750 days to match target, got %v", benchmarkData["daysToMatchTarget"])
	}

	// 5. Invalid price parameter validation
	invalidPriceReq, _ := http.NewRequest(
		http.MethodGet,
		"/api/items/"+itemID+"/replacement-benchmark?price=-10",
		nil,
	)
	invalidPriceRec := httptest.NewRecorder()
	routerInstance.ServeHTTP(invalidPriceRec, invalidPriceReq)
	if invalidPriceRec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 for negative price, got %d", invalidPriceRec.Code)
	}

	missingPriceReq, _ := http.NewRequest(
		http.MethodGet,
		"/api/items/"+itemID+"/replacement-benchmark",
		nil,
	)
	missingPriceRec := httptest.NewRecorder()
	routerInstance.ServeHTTP(missingPriceRec, missingPriceReq)
	if missingPriceRec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 for missing price, got %d", missingPriceRec.Code)
	}

	// 6. Benchmark sold item with zero net cost (salePrice == price)
	soldCreateBody := `{"name":"Sold Lens","price":500000,"purchaseDate":"2026-09-01T12:00:00Z"}`
	soldCreateReq, _ := http.NewRequest(http.MethodPost, "/api/items", bytes.NewBufferString(soldCreateBody))
	soldCreateReq.Header.Set("Content-Type", "application/json")
	soldCreateRec := httptest.NewRecorder()
	routerInstance.ServeHTTP(soldCreateRec, soldCreateReq)
	soldCreateEnv := parseResponseBody(t, soldCreateRec)
	soldItemID := soldCreateEnv.Data.(map[string]any)["id"].(string)

	soldUpdateBody := `{"name":"Sold Lens","price":500000,"purchaseDate":"2026-09-01T12:00:00Z","status":"sold","endedAt":"2026-09-11T12:00:00Z","salePrice":500000}`
	soldUpdateReq, _ := http.NewRequest(http.MethodPut, "/api/items/"+soldItemID, bytes.NewBufferString(soldUpdateBody))
	soldUpdateReq.Header.Set("Content-Type", "application/json")
	soldUpdateRec := httptest.NewRecorder()
	routerInstance.ServeHTTP(soldUpdateRec, soldUpdateReq)

	soldBenchmarkReq, _ := http.NewRequest(
		http.MethodGet,
		"/api/items/"+soldItemID+"/replacement-benchmark?price=600000",
		nil,
	)
	soldBenchmarkRec := httptest.NewRecorder()
	routerInstance.ServeHTTP(soldBenchmarkRec, soldBenchmarkReq)
	if soldBenchmarkRec.Code != http.StatusOK {
		t.Fatalf("expected 200 for sold benchmark, got %d", soldBenchmarkRec.Code)
	}
	soldBenchmarkEnv := parseResponseBody(t, soldBenchmarkRec)
	soldBenchmarkData := soldBenchmarkEnv.Data.(map[string]any)
	if soldBenchmarkData["isUnmatchable"] != true {
		t.Fatalf("expected isUnmatchable true, got %v", soldBenchmarkData["isUnmatchable"])
	}
	if soldBenchmarkData["daysToMatchPrevious"] != nil {
		t.Fatalf("expected daysToMatchPrevious nil, got %v", soldBenchmarkData["daysToMatchPrevious"])
	}
}
