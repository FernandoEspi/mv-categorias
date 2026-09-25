package main

import (
	"context"
	"fmt"
	"log"
	"math/rand"
	"os"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type dish struct {
	ID          primitive.ObjectID `bson:"_id,omitempty"`
	Nombre      string             `bson:"nombre"`
	Precio      float64            `bson:"precio"`
	Descripcion string             `bson:"descripcion"`
}

type review struct {
	UsuarioID   string `bson:"usuarioId"`
	Comentario  string `bson:"comentario"`
	Calificacion int    `bson:"calificacion"`
}

type restaurant struct {
	Nombre   string   `bson:"nombre"`
	Distrito string   `bson:"distrito"`
	Platos   []dish   `bson:"platos"`
	Resenas  []review `bson:"reseñas"`
}

func main() {
	total := 20000
	if value := os.Getenv("SEED_TOTAL_RESTAURANTS"); value != "" {
		fmt.Sscanf(value, "%d", &total)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
	defer cancel()
	client, err := mongo.Connect(ctx, options.Client().ApplyURI(envOrDefault("MONGO_URI", "mongodb://localhost:27017/cloudeats_catalogo")))
	if err != nil {
		log.Fatal(err)
	}
	defer client.Disconnect(ctx)
	collection := client.Database("cloudeats_catalogo").Collection("restaurants")
	if _, err := collection.DeleteMany(ctx, bson.M{}); err != nil {
		log.Fatal(err)
	}

	districts := []string{"Miraflores", "San Isidro", "Surco", "Barranco", "La Molina", "San Borja", "Lima Cercado"}
	dishes := []string{"Lomo Saltado", "Ceviche", "Aji de Gallina", "Pollo a la Brasa", "Tallarines", "Arroz Chaufa"}
	docs := make([]any, 0, 500)
	for index := 0; index < total; index++ {
		items := []dish{{
			ID: primitive.NewObjectID(), Nombre: dishes[index%len(dishes)], Precio: float64(15 + rand.Intn(80)), Descripcion: "Plato de prueba",
		}}
		docs = append(docs, restaurant{
			Nombre: fmt.Sprintf("Restaurante Seed %05d", index+1), Distrito: districts[index%len(districts)], Platos: items,
			Resenas: []review{{UsuarioID: fmt.Sprintf("seed-user-%05d", index+1), Comentario: "Resena de prueba", Calificacion: 3 + index%3}},
		})
		if len(docs) == 500 || index == total-1 {
			if _, err := collection.InsertMany(ctx, docs); err != nil {
				log.Fatal(err)
			}
			fmt.Printf("Restaurantes insertados: %d/%d\n", index+1, total)
			docs = docs[:0]
		}
	}
}

func envOrDefault(name, fallback string) string {
	if value := os.Getenv(name); value != "" {
		return value
	}
	return fallback
}