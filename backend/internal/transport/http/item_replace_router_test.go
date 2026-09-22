package http_test

import (
	"bytes"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestItemsAPIReplaceCollection(t *testing.T) {
	routerInstance := setupTestRouter()

	seedRequest, _ := http.NewRequest(
		http.MethodPost,
		"/api/items",
		bytes.NewBufferString(`{"name":"Original","price":100,"purchaseDate":"2026-09-20T12:00:00Z"}`),
	)
	seedRequest.Header.Set("Content-Type", "application/json")
	seedRecorder := httptest.NewRecorder()
	routerInstance.ServeHTTP(seedRecorder, seedRequest)
	if seedRecorder.Code != http.StatusCreated {
		t.Fatalf("failed to seed item, status: %d, body: %s", seedRecorder.Code, seedRecorder.Body.String())
	}

	replaceRequest, _ := http.NewRequest(
		http.MethodPut,
		"/api/items/replace",
		bytes.NewBufferString(`[
			{"name":"First","price":200,"purchaseDate":"2026-09-21T12:00:00Z"},
			{"name":"Second","price":300,"purchaseDate":"2026-09-22T12:00:00Z"}
		]`),
	)
	replaceRequest.Header.Set("Content-Type", "application/json")
	replaceRecorder := httptest.NewRecorder()
	routerInstance.ServeHTTP(replaceRecorder, replaceRequest)

	if replaceRecorder.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d, body: %s", replaceRecorder.Code, replaceRecorder.Body.String())
	}

	replaceEnvelope := parseResponseBody(t, replaceRecorder)
	replacedItems, isSlice := replaceEnvelope.Data.([]any)
	if !isSlice || len(replacedItems) != 2 {
		t.Fatalf("expected two replacement items, got: %v", replaceEnvelope.Data)
	}

	listRequest, _ := http.NewRequest(http.MethodGet, "/api/items", nil)
	listRecorder := httptest.NewRecorder()
	routerInstance.ServeHTTP(listRecorder, listRequest)
	listEnvelope := parseResponseBody(t, listRecorder)
	storedItems, isSlice := listEnvelope.Data.([]any)
	if !isSlice || len(storedItems) != 2 {
		t.Fatalf("expected two stored replacement items, got: %v", listEnvelope.Data)
	}

	firstItem, firstIsMap := storedItems[0].(map[string]any)
	secondItem, secondIsMap := storedItems[1].(map[string]any)
	if !firstIsMap || !secondIsMap {
		t.Fatalf("expected item objects, got: %v", storedItems)
	}
	if firstItem["name"] != "First" || secondItem["name"] != "Second" {
		t.Fatalf("unexpected replacement data: %v", storedItems)
	}
}

func TestItemsAPIRejectsInvalidReplacementWithoutChangingData(t *testing.T) {
	routerInstance := setupTestRouter()

	seedRequest, _ := http.NewRequest(
		http.MethodPost,
		"/api/items",
		bytes.NewBufferString(`{"name":"Original","price":100,"purchaseDate":"2026-09-20T12:00:00Z"}`),
	)
	seedRequest.Header.Set("Content-Type", "application/json")
	seedRecorder := httptest.NewRecorder()
	routerInstance.ServeHTTP(seedRecorder, seedRequest)

	replaceRequest, _ := http.NewRequest(
		http.MethodPut,
		"/api/items/replace",
		bytes.NewBufferString(`[
			{"name":"Valid","price":200,"purchaseDate":"2026-09-21T12:00:00Z"},
			{"name":"Invalid","price":0,"purchaseDate":"2026-09-22T12:00:00Z"}
		]`),
	)
	replaceRequest.Header.Set("Content-Type", "application/json")
	replaceRecorder := httptest.NewRecorder()
	routerInstance.ServeHTTP(replaceRecorder, replaceRequest)

	if replaceRecorder.Code != http.StatusBadRequest {
		t.Fatalf("expected status 400, got %d, body: %s", replaceRecorder.Code, replaceRecorder.Body.String())
	}

	listRequest, _ := http.NewRequest(http.MethodGet, "/api/items", nil)
	listRecorder := httptest.NewRecorder()
	routerInstance.ServeHTTP(listRecorder, listRequest)
	listEnvelope := parseResponseBody(t, listRecorder)
	storedItems := listEnvelope.Data.([]any)
	if len(storedItems) != 1 {
		t.Fatalf("expected original dataset to remain, got: %v", storedItems)
	}
	originalItem := storedItems[0].(map[string]any)
	if originalItem["name"] != "Original" {
		t.Fatalf("expected original item to remain, got: %v", originalItem)
	}
}
