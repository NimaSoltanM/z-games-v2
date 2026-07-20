package main

import (
	"context"
	"errors"
	"log"
	"os"

	"github.com/joho/godotenv"
	"github.com/soltanmohammdi/z-games/internal/database"
)

func main() {
	if err := godotenv.Load(); err != nil && !errors.Is(err, os.ErrNotExist) {
		log.Fatalf("load .env: %v", err)
	}
	if os.Getenv("DATABASE_URL") == "" {
		log.Fatal("DATABASE_URL must be set")
	}

	db, err := database.Connect()
	if err != nil {
		log.Fatalf("database connection failed: %v", err)
	}
	defer db.Close()

	if err := database.ValidateSchema(context.Background(), db); err != nil {
		log.Fatalf("database schema validation failed: %v", err)
	}
	log.Print("Database schema is current")
}
