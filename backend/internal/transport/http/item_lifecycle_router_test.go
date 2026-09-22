package http_test

import (
	"bytes"
	"math"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestItemsAPILifecycle(t *testing.T) {
	routerInstance := setupTestRouter()

	createRequest, _ := http.NewRequest(
		http.MethodPost,
		"/api/items",
		bytes.NewBufferString(`{"name":"Phone","price":100,"purchaseDate":"2026-09-01T12:00:00Z"}`),
	)
	createRequest.Header.Set("Content-Type", "application/json")
	createRecorder := httptest.NewRecorder()
	routerInstance.ServeHTTP(createRecorder, createRequest)
	if createRecorder.Code != http.StatusCreated {
		t.Fatalf("create item: status %d body %s", createRecorder.Code, createRecorder.Body.String())
	}

	createEnvelope := parseResponseBody(t, createRecorder)
	createdItem := createEnvelope.Data.(map[string]any)
	itemID := createdItem["id"].(string)
	if createdItem["status"] != "active" {
		t.Fatalf("expected new item to be active, got %v", createdItem["status"])
	}

	sellRequest, _ := http.NewRequest(
		http.MethodPut,
		"/api/items/"+itemID,
		bytes.NewBufferString(`{
			"name":"Phone",
			"price":100,
			"purchaseDate":"2026-09-01T12:00:00Z",
			"status":"sold",
			"endedAt":"2026-09-11T12:00:00Z",
			"salePrice":40
		}`),
	)
	sellRequest.Header.Set("Content-Type", "application/json")
	sellRecorder := httptest.NewRecorder()
	routerInstance.ServeHTTP(sellRecorder, sellRequest)
	if sellRecorder.Code != http.StatusOK {
		t.Fatalf("sell item: status %d body %s", sellRecorder.Code, sellRecorder.Body.String())
	}

	sellEnvelope := parseResponseBody(t, sellRecorder)
	soldItem := sellEnvelope.Data.(map[string]any)
	if soldItem["status"] != "sold" {
		t.Fatalf("expected sold status, got %v", soldItem["status"])
	}
	if soldItem["ownershipDays"] != float64(10) {
		t.Fatalf("expected 10 ownership days, got %v", soldItem["ownershipDays"])
	}
	if math.Abs(soldItem["grossCostPerDay"].(float64)-10) > 0.0000001 {
		t.Fatalf("expected gross final cost/day 10, got %v", soldItem["grossCostPerDay"])
	}
	if math.Abs(soldItem["netOwnershipCost"].(float64)-60) > 0.0000001 {
		t.Fatalf("expected net ownership cost 60, got %v", soldItem["netOwnershipCost"])
	}
	if math.Abs(soldItem["netCostPerDay"].(float64)-6) > 0.0000001 {
		t.Fatalf("expected net cost/day 6, got %v", soldItem["netCostPerDay"])
	}

	listRequest, _ := http.NewRequest(http.MethodGet, "/api/items", nil)
	listRecorder := httptest.NewRecorder()
	routerInstance.ServeHTTP(listRecorder, listRequest)
	listEnvelope := parseResponseBody(t, listRecorder)
	listedItems := listEnvelope.Data.([]any)
	if len(listedItems) != 1 {
		t.Fatalf("expected sold item to remain in history, got %v", listedItems)
	}
	listedSoldItem := listedItems[0].(map[string]any)
	if listedSoldItem["grossCostPerDay"] != soldItem["grossCostPerDay"] {
		t.Fatalf("expected final cost/day to remain frozen")
	}

	invalidRequest, _ := http.NewRequest(
		http.MethodPut,
		"/api/items/"+itemID,
		bytes.NewBufferString(`{
			"name":"Phone",
			"price":100,
			"purchaseDate":"2026-09-01T12:00:00Z",
			"status":"lost",
			"endedAt":"2026-08-31T12:00:00Z"
		}`),
	)
	invalidRequest.Header.Set("Content-Type", "application/json")
	invalidRecorder := httptest.NewRecorder()
	routerInstance.ServeHTTP(invalidRecorder, invalidRequest)
	if invalidRecorder.Code != http.StatusBadRequest {
		t.Fatalf("expected invalid lifecycle status 400, got %d body %s", invalidRecorder.Code, invalidRecorder.Body.String())
	}

	invalidEnvelope := parseResponseBody(t, invalidRecorder)
	if invalidEnvelope.Meta.Message != "ended_at cannot be earlier than purchase_date" {
		t.Fatalf("unexpected lifecycle validation message: %s", invalidEnvelope.Meta.Message)
	}
}
