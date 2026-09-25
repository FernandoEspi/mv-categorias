package main

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"
)

type serviceConfig struct {
	usersURL   string
	catalogURL string
	ordersURL  string
}

type dashboardResponse struct {
	User             any `json:"usuario"`
	FavoriteRestaurant any `json:"restauranteFavorito"`
	Orders           any `json:"historialPedidos"`
}

var config = serviceConfig{
	usersURL:   envOrDefault("MS1_USUARIOS_URL", "http://localhost:8001"),
	catalogURL: envOrDefault("MS2_CATALOGO_URL", "http://localhost:3002"),
	ordersURL:  envOrDefault("MS3_PEDIDOS_URL", "http://localhost:8000"),
}

var httpClient = &http.Client{Timeout: 4 * time.Second}

var secretKey = envOrDefault("SECRET_KEY", "tu_secreto_super_seguro")

func envOrDefault(name, fallback string) string {
	if value := os.Getenv(name); value != "" {
		return value
	}
	return fallback
}

func fetchJSON(url string, authorization string, fallback any) any {
	request, err := http.NewRequest(http.MethodGet, url, nil)
	if err != nil {
		log.Printf("warning: request to %s failed: %v; using fallback", url, err)
		return fallback
	}
	request.Header.Set("Authorization", authorization)
	response, err := httpClient.Do(request)
	if err != nil || response.StatusCode != http.StatusOK {
		if response != nil {
			response.Body.Close()
		}
		log.Printf("warning: request to %s failed: %v; using fallback", url, err)
		return fallback
	}
	defer response.Body.Close()

	body, err := io.ReadAll(response.Body)
	if err != nil {
		log.Printf("warning: reading %s failed: %v; using fallback", url, err)
		return fallback
	}

	var data any
	if err := json.Unmarshal(body, &data); err != nil {
		log.Printf("warning: invalid JSON from %s: %v; using fallback", url, err)
		return fallback
	}
	return data
}

func healthHandler(writer http.ResponseWriter, request *http.Request) {
	writeJSON(writer, http.StatusOK, map[string]string{"status": "UP"})
}

func validateToken(request *http.Request) (map[string]any, error) {
	parts := strings.Split(request.Header.Get("Authorization"), " ")
	if len(parts) != 2 || parts[0] != "Bearer" {
		return nil, fmt.Errorf("bearer token required")
	}
	tokenParts := strings.Split(parts[1], ".")
	if len(tokenParts) != 3 {
		return nil, fmt.Errorf("invalid token")
	}
	unsignedToken := tokenParts[0] + "." + tokenParts[1]
	mac := hmac.New(sha256.New, []byte(secretKey))
	_, _ = mac.Write([]byte(unsignedToken))
	expectedSignature := base64.RawURLEncoding.EncodeToString(mac.Sum(nil))
	if !hmac.Equal([]byte(expectedSignature), []byte(tokenParts[2])) {
		return nil, fmt.Errorf("invalid signature")
	}
	claimsJSON, err := base64.RawURLEncoding.DecodeString(tokenParts[1])
	if err != nil {
		return nil, fmt.Errorf("invalid claims")
	}
	var claims map[string]any
	if err := json.Unmarshal(claimsJSON, &claims); err != nil {
		return nil, fmt.Errorf("invalid claims")
	}
	if expiration, ok := claims["exp"].(float64); ok && time.Now().Unix() >= int64(expiration) {
		return nil, fmt.Errorf("expired token")
	}
	return claims, nil
}

func sameUserID(claimValue any, requestedID string) bool {
	switch value := claimValue.(type) {
	case float64:
		return strconv.FormatInt(int64(value), 10) == requestedID
	case string:
		return value == requestedID
	default:
		return false
	}
}

func dashboardHandler(writer http.ResponseWriter, request *http.Request) {
	userID := request.URL.Query().Get("userId")
	if userID == "" {
		writeJSON(writer, http.StatusBadRequest, map[string]string{"detail": "userId is required"})
		return
	}
	claims, err := validateToken(request)
	if err != nil {
		writeJSON(writer, http.StatusUnauthorized, map[string]string{"detail": err.Error()})
		return
	}
	role, _ := claims["role"].(string)
	if role != "admin" && role != "cliente" {
		writeJSON(writer, http.StatusForbidden, map[string]string{"detail": "rol sin acceso al dashboard"})
		return
	}
	if role != "admin" && !sameUserID(claims["user_id"], userID) {
		writeJSON(writer, http.StatusForbidden, map[string]string{"detail": "solo puedes consultar tu propio historial"})
		return
	}

	var userData, favoriteRestaurant, ordersHistory any
	var waitGroup sync.WaitGroup
	waitGroup.Add(3)

	go func() {
		defer waitGroup.Done()
		userData = fetchJSON(
			fmt.Sprintf("%s/api/usuarios/%s", config.usersURL, userID),
			requestAuthorization(request),
			map[string]string{"id": userID, "nombre": "Usuario Demo", "email": "demo@cloudeats.com"},
		)
	}()
	go func() {
		defer waitGroup.Done()
		favoriteRestaurant = fetchJSON(
			fmt.Sprintf("%s/api/restaurantes/favorito/%s", config.catalogURL, userID),
			requestAuthorization(request),
			map[string]string{"id": "rest-1", "nombre": "Bembos Test", "distrito": "Miraflores"},
		)
	}()
	go func() {
		defer waitGroup.Done()
		ordersHistory = fetchJSON(
			fmt.Sprintf("%s/api/pedidos/usuario/%s", config.ordersURL, userID),
			requestAuthorization(request),
			map[string]any{"orders": []any{}},
		)
	}()
	waitGroup.Wait()

	writeJSON(writer, http.StatusOK, dashboardResponse{
		User:                userData,
		FavoriteRestaurant: favoriteRestaurant,
		Orders:              ordersHistory,
	})
}

func openAPIHandler(writer http.ResponseWriter, request *http.Request) {
	writeJSON(writer, http.StatusOK, map[string]any{
		"openapi": "3.0.0",
		"info": map[string]string{
			"title":   "Agregador Service API",
			"version": "1.0.0",
		},
		"paths": map[string]any{
			"/health": map[string]any{"get": map[string]string{"summary": "Health check"}},
			"/api/dashboard": map[string]any{"get": map[string]any{
				"summary": "Agrega datos del dashboard de un usuario",
				"parameters": []map[string]any{{"name": "userId", "in": "query", "required": true, "schema": map[string]string{"type": "string"}}},
				"security": []map[string][]string{{"bearerAuth": {}}},
			}},
		},
		"components": map[string]any{
			"securitySchemes": map[string]any{
				"bearerAuth": map[string]string{"type": "http", "scheme": "bearer"},
			},
		},
	})
}

func docsHandler(writer http.ResponseWriter, request *http.Request) {
	writer.Header().Set("Content-Type", "text/html; charset=utf-8")
	fmt.Fprint(writer, `<!doctype html>
<html lang="en">
<head><title>Agregador Service API</title><link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css"></head>
<body><div id="swagger-ui"></div>
<script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
<script>window.onload = () => SwaggerUIBundle({url: '/openapi.json', dom_id: '#swagger-ui'});</script>
</body></html>`)
}

func writeJSON(writer http.ResponseWriter, status int, value any) {
	writer.Header().Set("Content-Type", "application/json")
	writer.WriteHeader(status)
	if err := json.NewEncoder(writer).Encode(value); err != nil {
		log.Printf("warning: writing JSON response failed: %v", err)
	}
}

func main() {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /health", healthHandler)
	mux.HandleFunc("GET /api/dashboard", dashboardHandler)
	mux.HandleFunc("GET /docs", docsHandler)
	mux.HandleFunc("GET /openapi.json", openAPIHandler)

	log.Println("history-service running on port 3004")
	if err := http.ListenAndServe(":3004", mux); err != nil {
		log.Fatal(err)
	}
}

func requestAuthorization(request *http.Request) string {
	return request.Header.Get("Authorization")
}