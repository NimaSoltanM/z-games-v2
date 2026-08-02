package users

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gofiber/fiber/v3"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/soltanmohammdi/z-games/internal/shared/middleware"
	"github.com/soltanmohammdi/z-games/internal/testdb"
)

func insertUser(t *testing.T, db *pgxpool.Pool, id, phone, role string, createdAt time.Time) {
	t.Helper()
	_, err := db.Exec(context.Background(), `
		INSERT INTO users (id, phone, first_name, last_name, role, created_at)
		VALUES ($1, $2, $3, $4, $5::user_role, $6)
	`, id, phone, "First "+id, "Last "+id, role, createdAt)
	if err != nil {
		t.Fatalf("insert user: %v", err)
	}
}

func TestListUsersNewestFirstAndPaginated(t *testing.T) {
	db := testdb.New(t)
	base := time.Now().Truncate(time.Second)
	insertUser(t, db, "u1", "09120000001", "user", base)
	insertUser(t, db, "u2", "09120000002", "admin", base.Add(time.Minute))
	insertUser(t, db, "u3", "09120000003", "super_admin", base.Add(2*time.Minute))

	firstPage, total, err := listUsers(context.Background(), db, 2, 0)
	if err != nil {
		t.Fatal(err)
	}
	if total != 3 || len(firstPage) != 2 {
		t.Fatalf("total=%d len=%d, want 3/2", total, len(firstPage))
	}
	if firstPage[0].Phone != "09120000003" || firstPage[1].Phone != "09120000002" {
		t.Fatalf("unexpected first page order: %+v", firstPage)
	}

	secondPage, _, err := listUsers(context.Background(), db, 2, 2)
	if err != nil {
		t.Fatal(err)
	}
	if len(secondPage) != 1 || secondPage[0].Phone != "09120000001" {
		t.Fatalf("unexpected second page: %+v", secondPage)
	}
}

func TestUsersEndpointRequiresSuperAdmin(t *testing.T) {
	t.Setenv("JWT_SECRET", "test-secret-test-secret-test-secret-1234")
	db := testdb.New(t)
	now := time.Now()
	insertUser(t, db, "user", "09120000001", "user", now)
	insertUser(t, db, "admin", "09120000002", "admin", now)
	insertUser(t, db, "super", "09120000003", "super_admin", now)

	app := fiber.New()
	RegisterRoutes(app, db)

	for _, tc := range []struct {
		name string
		id   string
		want int
	}{
		{name: "user forbidden", id: "user", want: fiber.StatusForbidden},
		{name: "admin forbidden", id: "admin", want: fiber.StatusForbidden},
		{name: "superadmin allowed", id: "super", want: fiber.StatusOK},
	} {
		t.Run(tc.name, func(t *testing.T) {
			token, err := middleware.SignAuthToken(tc.id, "unused")
			if err != nil {
				t.Fatal(err)
			}
			req := httptest.NewRequest(http.MethodGet, "/admin/users", nil)
			req.AddCookie(&http.Cookie{Name: "auth_token", Value: token})
			res, err := app.Test(req)
			if err != nil {
				t.Fatal(err)
			}
			defer res.Body.Close()
			if res.StatusCode != tc.want {
				t.Fatalf("status=%d, want %d", res.StatusCode, tc.want)
			}
		})
	}
}
