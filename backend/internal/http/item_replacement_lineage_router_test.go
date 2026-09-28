package http_test

import (
	"fmt"
	"net/http"
	"testing"
)

func TestItemReplacementLineageHTTP(t *testing.T) {
	router := setupUserIsolationRouter()
	const userA = "user-a"
	const userB = "user-b"

	createHistorical := performUserRequest(
		router,
		http.MethodPost,
		"/api/items",
		userA,
		`{"name":"Previous Headphones","price":100,"purchaseDate":"2026-09-01T12:00:00Z"}`,
	)
	if createHistorical.Code != http.StatusCreated {
		t.Fatalf("create historical item: status %d body %s", createHistorical.Code, createHistorical.Body.String())
	}
	historicalData := parseResponseBody(t, createHistorical).Data.(map[string]any)
	historicalID := historicalData["id"].(string)

	retireHistorical := performUserRequest(
		router,
		http.MethodPut,
		"/api/items/"+historicalID,
		userA,
		`{"name":"Previous Headphones","price":100,"purchaseDate":"2026-09-01T12:00:00Z","status":"retired","endedAt":"2026-09-10T12:00:00Z"}`,
	)
	if retireHistorical.Code != http.StatusOK {
		t.Fatalf("retire historical item: status %d body %s", retireHistorical.Code, retireHistorical.Body.String())
	}

	createReplacement := performUserRequest(
		router,
		http.MethodPost,
		"/api/items",
		userA,
		fmt.Sprintf(`{"name":"New Headphones","price":200,"purchaseDate":"2026-09-11T12:00:00Z","replacesItemId":%q}`, historicalID),
	)
	if createReplacement.Code != http.StatusCreated {
		t.Fatalf("create replacement item: status %d body %s", createReplacement.Code, createReplacement.Body.String())
	}
	createEnvelope := parseResponseBody(t, createReplacement)
	if createEnvelope.Meta.Code != http.StatusCreated {
		t.Fatalf("expected canonical meta.code 201, got %d", createEnvelope.Meta.Code)
	}
	replacementData := createEnvelope.Data.(map[string]any)
	if replacementData["replacesItemId"] != historicalID {
		t.Fatalf("expected replacesItemId %q, got %v", historicalID, replacementData["replacesItemId"])
	}
	replacementID := replacementData["id"].(string)

	reactivateHistorical := performUserRequest(
		router,
		http.MethodPut,
		"/api/items/"+historicalID,
		userA,
		`{"name":"Previous Headphones","price":100,"purchaseDate":"2026-09-01T12:00:00Z","status":"active"}`,
	)
	if reactivateHistorical.Code != http.StatusBadRequest {
		t.Fatalf("expected referenced historical item reactivation to return 400, got %d body %s", reactivateHistorical.Code, reactivateHistorical.Body.String())
	}
	if parseResponseBody(t, reactivateHistorical).Meta.Message != "item cannot be reactivated while referenced by replacement lineage" {
		t.Fatalf("unexpected reactivation validation response: %s", reactivateHistorical.Body.String())
	}

	preserveReplacement := performUserRequest(
		router,
		http.MethodPut,
		"/api/items/"+replacementID,
		userA,
		`{"name":"Renamed Headphones","price":200,"purchaseDate":"2026-09-11T12:00:00Z","status":"active"}`,
	)
	if preserveReplacement.Code != http.StatusOK {
		t.Fatalf("preserve replacement link: status %d body %s", preserveReplacement.Code, preserveReplacement.Body.String())
	}
	preserveData := parseResponseBody(t, preserveReplacement).Data.(map[string]any)
	if preserveData["replacesItemId"] != historicalID {
		t.Fatalf("expected omitted replacesItemId to preserve %q, got %v", historicalID, preserveData["replacesItemId"])
	}

	clearReplacement := performUserRequest(
		router,
		http.MethodPut,
		"/api/items/"+replacementID,
		userA,
		`{"name":"Renamed Headphones","price":200,"purchaseDate":"2026-09-11T12:00:00Z","status":"active","replacesItemId":null}`,
	)
	if clearReplacement.Code != http.StatusOK {
		t.Fatalf("clear replacement link: status %d body %s", clearReplacement.Code, clearReplacement.Body.String())
	}
	clearData := parseResponseBody(t, clearReplacement).Data.(map[string]any)
	if _, exists := clearData["replacesItemId"]; exists {
		t.Fatalf("expected cleared replacesItemId to be omitted, got %v", clearData["replacesItemId"])
	}

	crossUserCreate := performUserRequest(
		router,
		http.MethodPost,
		"/api/items",
		userB,
		fmt.Sprintf(`{"name":"User B Headphones","price":200,"purchaseDate":"2026-09-11T12:00:00Z","replacesItemId":%q}`, historicalID),
	)
	if crossUserCreate.Code != http.StatusNotFound {
		t.Fatalf("expected cross-user replacement target to return 404, got %d body %s", crossUserCreate.Code, crossUserCreate.Body.String())
	}
	crossUserEnvelope := parseResponseBody(t, crossUserCreate)
	if crossUserEnvelope.Meta.Message != "item not found" {
		t.Fatalf("cross-user replacement leaked distinct error: %s", crossUserCreate.Body.String())
	}

	activeTarget := performUserRequest(
		router,
		http.MethodPost,
		"/api/items",
		userA,
		`{"name":"Still Active","price":50,"purchaseDate":"2026-09-02T12:00:00Z"}`,
	)
	if activeTarget.Code != http.StatusCreated {
		t.Fatalf("create active target: status %d body %s", activeTarget.Code, activeTarget.Body.String())
	}
	activeTargetID := parseResponseBody(t, activeTarget).Data.(map[string]any)["id"].(string)

	activeTargetLink := performUserRequest(
		router,
		http.MethodPost,
		"/api/items",
		userA,
		fmt.Sprintf(`{"name":"Invalid Replacement","price":80,"purchaseDate":"2026-09-12T12:00:00Z","replacesItemId":%q}`, activeTargetID),
	)
	if activeTargetLink.Code != http.StatusBadRequest {
		t.Fatalf("expected active replacement target to return 400, got %d body %s", activeTargetLink.Code, activeTargetLink.Body.String())
	}
	if parseResponseBody(t, activeTargetLink).Meta.Message != "replacement relationship requires a completed historical item" {
		t.Fatalf("unexpected active-target validation response: %s", activeTargetLink.Body.String())
	}
}
