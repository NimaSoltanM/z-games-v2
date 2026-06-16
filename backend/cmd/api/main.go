package main

import (
	"log"
	"os"

	"github.com/joho/godotenv"
	"github.com/soltanmohammdi/z-games/internal/database"
	"github.com/soltanmohammdi/z-games/internal/server"
)

func main() {
	if err := godotenv.Load(); err != nil {
		log.Fatal("error loading .env file")
	}

	// Fail fast on missing/weak secrets. An empty JWT_SECRET would sign tokens
	// with an empty key, making every auth token trivially forgeable.
	if secret := os.Getenv("JWT_SECRET"); len(secret) < 32 {
		log.Fatal("JWT_SECRET must be set and at least 32 characters")
	}
	if os.Getenv("DATABASE_URL") == "" {
		log.Fatal("DATABASE_URL must be set")
	}
	if os.Getenv("ZARINPAL_MERCHANT_ID") == "" {
		log.Fatal("ZARINPAL_MERCHANT_ID must be set (any UUID works for the sandbox)")
	}
	// Account credentials are encrypted at rest with this key. Losing or changing
	// it makes every already-delivered credential unreadable, so it must be set,
	// backed up, and stored outside the database (and its backups).
	if os.Getenv("CREDENTIALS_KEY") == "" {
		log.Fatal("CREDENTIALS_KEY must be set (base64-encoded 32 bytes for AES-256)")
	}

	db, err := database.Connect()
	if err != nil {
		log.Fatalf("database connection failed: %v", err)
	}
	defer db.Close()

	app := server.NewApp(db)

	port := os.Getenv("PORT")
	if port == "" {
		port = "3002"
	}

	log.Printf("Server running on :%s", port)
	log.Fatal(app.Listen(":" + port))
}
