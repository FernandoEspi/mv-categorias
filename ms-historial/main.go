package main

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
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

func envOrDefault(name, fallback string) string {
	if value := os.Getenv(name); value != "" {
		return value
	}
	return fallback
}

func fetchJSON(url string, fallback any) any {
	response, err := httpClient.Get(url)
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

func dashboardHandler(writer http.ResponseWriter, request *http.Request) {
	userID := request.URL.Query().Get("userId")
	if userID == "" {
		writeJSON(writer, http.StatusBadRequest, map[string]string{"detail": "userId is required"})
		return
	}

	var userData, favoriteRestaurant, ordersHistory any
	var waitGroup sync.WaitGroup
	waitGroup.Add(3)

	go func() {
		defer waitGroup.Done()
		userData = fetchJSON(
			fmt.Sprintf("%s/api/usuarios/%s", config.usersURL, userID),
			map[string]string{"id": userID, "nombre": "Usuario Demo", "email": "demo@cloudeats.com"},
		)
	}()
	go func() {
		defer waitGroup.Done()
		favoriteRestaurant = fetchJSON(
			fmt.Sprintf("%s/api/restaurantes/favorito/%s", config.catalogURL, userID),
			map[string]string{"id": "rest-1", "nombre": "Bembos Test", "distrito": "Miraflores"},
		)
	}()
	go func() {
		defer waitGroup.Done()
		ordersHistory = fetchJSON(
			fmt.Sprintf("%s/api/pedidos/usuario/%s", config.ordersURL, userID),
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
			}},
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