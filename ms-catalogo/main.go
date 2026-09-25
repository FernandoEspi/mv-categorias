package main

import (
	"context"
	"encoding/json"
	"html/template"
	"log"
	"net/http"
	"os"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type dish struct {
	ID          primitive.ObjectID `bson:"_id,omitempty" json:"id,omitempty"`
	Nombre      string             `bson:"nombre" json:"nombre"`
	Precio      float64            `bson:"precio" json:"precio"`
	Descripcion string             `bson:"descripcion,omitempty" json:"descripcion,omitempty"`
}

type review struct {
	UsuarioID   string `bson:"usuarioId" json:"usuarioId"`
	Comentario  string `bson:"comentario" json:"comentario"`
	Calificacion int    `bson:"calificacion" json:"calificacion"`
}

type restaurant struct {
	ID       primitive.ObjectID `bson:"_id,omitempty" json:"id,omitempty"`
	Nombre   string             `bson:"nombre" json:"nombre"`
	Distrito string             `bson:"distrito" json:"distrito"`
	Platos   []dish             `bson:"platos" json:"platos"`
	Resenas  []review           `bson:"reseñas" json:"reseñas"`
}

type service struct {
	collection *mongo.Collection
}

func mongoURI() string {
	if value := os.Getenv("MONGO_URI"); value != "" {
		return value
	}
	return "mongodb://localhost:27017/cloudeats_catalogo"
}

func writeJSON(writer http.ResponseWriter, status int, value any) {
	writer.Header().Set("Content-Type", "application/json")
	writer.WriteHeader(status)
	if err := json.NewEncoder(writer).Encode(value); err != nil {
		log.Printf("warning: writing JSON response failed: %v", err)
	}
}

func (api service) health(writer http.ResponseWriter, request *http.Request) {
	writeJSON(writer, http.StatusOK, map[string]any{"status": "UP", "timestamp": time.Now()})
}

func (api service) listRestaurants(writer http.ResponseWriter, request *http.Request) {
	ctx, cancel := context.WithTimeout(request.Context(), 10*time.Second)
	defer cancel()

	cursor, err := api.collection.Find(ctx, bson.M{})
	if err != nil {
		writeJSON(writer, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	defer cursor.Close(ctx)

	restaurants := make([]restaurant, 0)
	if err := cursor.All(ctx, &restaurants); err != nil {
		writeJSON(writer, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(writer, http.StatusOK, restaurants)
}

func (api service) createRestaurant(writer http.ResponseWriter, request *http.Request) {
	var value restaurant
	if err := json.NewDecoder(request.Body).Decode(&value); err != nil {
		writeJSON(writer, http.StatusBadRequest, map[string]string{"error": "JSON invalido"})
		return
	}
	if value.Nombre == "" || value.Distrito == "" {
		writeJSON(writer, http.StatusBadRequest, map[string]string{"error": "nombre y distrito son obligatorios"})
		return
	}

	ctx, cancel := context.WithTimeout(request.Context(), 10*time.Second)
	defer cancel()
	result, err := api.collection.InsertOne(ctx, value)
	if err != nil {
		writeJSON(writer, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}
	value.ID = result.InsertedID.(primitive.ObjectID)
	writeJSON(writer, http.StatusCreated, value)
}

func (api service) dishByID(writer http.ResponseWriter, request *http.Request) {
	dishID, err := primitive.ObjectIDFromHex(request.PathValue("dishId"))
	if err != nil {
		writeJSON(writer, http.StatusNotFound, map[string]string{"message": "Plato no encontrado"})
		return
	}

	ctx, cancel := context.WithTimeout(request.Context(), 10*time.Second)
	defer cancel()
	var value restaurant
	err = api.collection.FindOne(ctx, bson.M{"platos._id": dishID}, options.FindOne().SetProjection(bson.M{"platos.$": 1})).Decode(&value)
	if err == mongo.ErrNoDocuments || len(value.Platos) == 0 {
		writeJSON(writer, http.StatusNotFound, map[string]string{"message": "Plato no encontrado"})
		return
	}
	if err != nil {
		writeJSON(writer, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	valueDish := value.Platos[0]
	writeJSON(writer, http.StatusOK, map[string]any{"id": valueDish.ID, "nombre": valueDish.Nombre, "precio": valueDish.Precio})
}

func (api service) favoriteByUser(writer http.ResponseWriter, request *http.Request) {
	userID := request.PathValue("userId")
	ctx, cancel := context.WithTimeout(request.Context(), 10*time.Second)
	defer cancel()

	var value restaurant
	err := api.collection.FindOne(ctx, bson.M{"reseñas.usuarioId": userID}, options.FindOne().SetProjection(bson.M{"nombre": 1, "distrito": 1, "reseñas": 1})).Decode(&value)
	if err == mongo.ErrNoDocuments {
		writeJSON(writer, http.StatusNotFound, map[string]string{"message": "Restaurante favorito no encontrado"})
		return
	}
	if err != nil {
		writeJSON(writer, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	calificacion := 0
	for _, item := range value.Resenas {
		if item.UsuarioID == userID {
			calificacion = item.Calificacion
			break
		}
	}
	writeJSON(writer, http.StatusOK, map[string]any{"id": value.ID, "nombre": value.Nombre, "distrito": value.Distrito, "calificacion": calificacion})
}

func openAPIHandler(writer http.ResponseWriter, request *http.Request) {
	writeJSON(writer, http.StatusOK, map[string]any{
		"openapi": "3.0.0",
		"info":    map[string]string{"title": "Catalogo Service API", "version": "1.0.0"},
		"paths": map[string]any{
			"/health": map[string]any{"get": map[string]string{"summary": "Health check"}},
			"/api/restaurantes": map[string]any{
				"get":  map[string]string{"summary": "Lista restaurantes"},
				"post": map[string]string{"summary": "Crea un restaurante"},
			},
			"/api/restaurantes/platos/{dishId}": map[string]any{"get": map[string]string{"summary": "Obtiene un plato"}},
			"/api/restaurantes/favorito/{userId}": map[string]any{"get": map[string]string{"summary": "Obtiene el restaurante asociado al usuario"}},
		},
	})
}

func docsHandler(writer http.ResponseWriter, request *http.Request) {
	writer.Header().Set("Content-Type", "text/html; charset=utf-8")
	template.Must(template.New("docs").Parse(`<!doctype html><html><head><title>Catalogo Service API</title><link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css"></head><body><div id="swagger-ui"></div><script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script><script>window.onload=()=>SwaggerUIBundle({url:'/openapi.json',dom_id:'#swagger-ui'});</script></body></html>`)).Execute(writer, nil)
}

func main() {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	client, err := mongo.Connect(ctx, options.Client().ApplyURI(mongoURI()))
	if err != nil {
		log.Fatal(err)
	}
	if err := client.Ping(ctx, nil); err != nil {
		log.Fatal(err)
	}

	api := service{collection: client.Database("cloudeats_catalogo").Collection("restaurants")}
	mux := http.NewServeMux()
	mux.HandleFunc("GET /health", api.health)
	mux.HandleFunc("GET /api/restaurantes", api.listRestaurants)
	mux.HandleFunc("POST /api/restaurantes", api.createRestaurant)
	mux.HandleFunc("GET /api/restaurantes/platos/{dishId}", api.dishByID)
	mux.HandleFunc("GET /api/restaurantes/favorito/{userId}", api.favoriteByUser)
	mux.HandleFunc("GET /docs", docsHandler)
	mux.HandleFunc("GET /openapi.json", openAPIHandler)

	port := envOrDefault("PORT", "3002")
	log.Printf("catalog-service running on port %s", port)
	log.Fatal(http.ListenAndServe(":"+port, mux))
}

func envOrDefault(name, fallback string) string {
	if value := os.Getenv(name); value != "" {
		return value
	}
	return fallback
}