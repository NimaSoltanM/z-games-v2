// Package support implements private, asynchronous customer support tickets.
package support

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/soltanmohammdi/z-games/internal/shared/audit"
)

const (
	pageSize      = 20
	maxSubjectLen = 160
	maxMessageLen = 4000
)

var (
	ErrTicketNotFound  = errors.New("SUPPORT_TICKET_NOT_FOUND")
	ErrInvalidSubject  = errors.New("SUPPORT_INVALID_SUBJECT")
	ErrInvalidMessage  = errors.New("SUPPORT_INVALID_MESSAGE")
	ErrInvalidCategory = errors.New("SUPPORT_INVALID_CATEGORY")
	ErrInvalidStatus   = errors.New("SUPPORT_INVALID_STATUS")
)

var validCategories = map[string]bool{
	"order": true, "account": true, "payment": true, "return": true, "other": true,
}

var validStatuses = map[string]bool{
	"awaiting_admin": true, "awaiting_customer": true, "resolved": true,
}

type TicketRow struct {
	ID           string    `json:"id"`
	TicketNumber int64     `json:"ticket_number"`
	Subject      string    `json:"subject"`
	Category     string    `json:"category"`
	Status       string    `json:"status"`
	MessageCount int       `json:"message_count"`
	LastMessage  string    `json:"last_message"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
	UserName     string    `json:"user_name,omitempty"`
	UserPhone    string    `json:"user_phone,omitempty"`
}

type Message struct {
	ID         string    `json:"id"`
	AuthorID   string    `json:"author_id"`
	AuthorRole string    `json:"author_role"`
	AuthorName string    `json:"author_name"`
	Body       string    `json:"body"`
	CreatedAt  time.Time `json:"created_at"`
}

type TicketDetail struct {
	TicketRow
	Messages []Message `json:"messages"`
}

type adminFilter struct {
	Status string
	Search string
	Limit  int
	Offset int
}

func validateText(value string, max int, kind error) (string, error) {
	value = strings.TrimSpace(value)
	if value == "" || len([]rune(value)) > max {
		return "", kind
	}
	return value, nil
}

func createTicket(ctx context.Context, db *pgxpool.Pool, userID, subject, category, body string) (string, error) {
	var err error
	if subject, err = validateText(subject, maxSubjectLen, ErrInvalidSubject); err != nil {
		return "", err
	}
	if body, err = validateText(body, maxMessageLen, ErrInvalidMessage); err != nil {
		return "", err
	}
	if !validCategories[category] {
		return "", ErrInvalidCategory
	}

	tx, err := db.Begin(ctx)
	if err != nil {
		return "", fmt.Errorf("createTicket begin: %w", err)
	}
	defer tx.Rollback(ctx)

	var id string
	if err := tx.QueryRow(ctx, `
		INSERT INTO support_tickets (user_id, subject, category)
		VALUES ($1, $2, $3)
		RETURNING id
	`, userID, subject, category).Scan(&id); err != nil {
		return "", fmt.Errorf("createTicket insert: %w", err)
	}
	if _, err := tx.Exec(ctx, `
		INSERT INTO support_ticket_messages (ticket_id, author_id, body)
		VALUES ($1, $2, $3)
	`, id, userID, body); err != nil {
		return "", fmt.Errorf("createTicket message: %w", err)
	}
	if err := tx.Commit(ctx); err != nil {
		return "", fmt.Errorf("createTicket commit: %w", err)
	}
	return id, nil
}

func listUserTickets(ctx context.Context, db *pgxpool.Pool, userID string, limit, offset int) ([]TicketRow, int, error) {
	var total int
	if err := db.QueryRow(ctx, "SELECT COUNT(*) FROM support_tickets WHERE user_id = $1", userID).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("listUserTickets count: %w", err)
	}
	rows, err := db.Query(ctx, `
		SELECT t.id, t.ticket_number, t.subject, t.category, t.status,
		       (SELECT COUNT(*)::int FROM support_ticket_messages WHERE ticket_id = t.id),
		       COALESCE((SELECT body FROM support_ticket_messages WHERE ticket_id = t.id ORDER BY created_at DESC, id DESC LIMIT 1), ''),
		       t.created_at, t.updated_at
		FROM support_tickets t
		WHERE t.user_id = $1
		ORDER BY t.updated_at DESC, t.id DESC
		LIMIT $2 OFFSET $3
	`, userID, limit, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("listUserTickets query: %w", err)
	}
	defer rows.Close()
	items := []TicketRow{}
	for rows.Next() {
		var row TicketRow
		if err := rows.Scan(&row.ID, &row.TicketNumber, &row.Subject, &row.Category, &row.Status,
			&row.MessageCount, &row.LastMessage, &row.CreatedAt, &row.UpdatedAt); err != nil {
			return nil, 0, fmt.Errorf("listUserTickets scan: %w", err)
		}
		items = append(items, row)
	}
	return items, total, rows.Err()
}

func getTicket(ctx context.Context, db *pgxpool.Pool, ticketID, userID string, admin bool) (*TicketDetail, error) {
	query := `
		SELECT t.id, t.ticket_number, t.subject, t.category, t.status,
		       (SELECT COUNT(*)::int FROM support_ticket_messages WHERE ticket_id = t.id),
		       COALESCE((SELECT body FROM support_ticket_messages WHERE ticket_id = t.id ORDER BY created_at DESC, id DESC LIMIT 1), ''),
		       t.created_at, t.updated_at,
		       TRIM(COALESCE(u.first_name, '') || ' ' || COALESCE(u.last_name, '')),
		       u.phone
		FROM support_tickets t
		JOIN users u ON u.id = t.user_id
		WHERE t.id = $1`
	args := []any{ticketID}
	if !admin {
		query += " AND t.user_id = $2"
		args = append(args, userID)
	}

	var detail TicketDetail
	err := db.QueryRow(ctx, query, args...).Scan(
		&detail.ID, &detail.TicketNumber, &detail.Subject, &detail.Category, &detail.Status,
		&detail.MessageCount, &detail.LastMessage, &detail.CreatedAt, &detail.UpdatedAt,
		&detail.UserName, &detail.UserPhone,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("getTicket: %w", err)
	}

	rows, err := db.Query(ctx, `
		SELECT m.id, m.author_id, u.role::text,
		       TRIM(COALESCE(u.first_name, '') || ' ' || COALESCE(u.last_name, '')),
		       m.body, m.created_at
		FROM support_ticket_messages m
		JOIN users u ON u.id = m.author_id
		WHERE m.ticket_id = $1
		ORDER BY m.created_at, m.id
	`, ticketID)
	if err != nil {
		return nil, fmt.Errorf("getTicket messages: %w", err)
	}
	defer rows.Close()
	detail.Messages = []Message{}
	for rows.Next() {
		var message Message
		if err := rows.Scan(&message.ID, &message.AuthorID, &message.AuthorRole, &message.AuthorName, &message.Body, &message.CreatedAt); err != nil {
			return nil, fmt.Errorf("getTicket message scan: %w", err)
		}
		detail.Messages = append(detail.Messages, message)
	}
	return &detail, rows.Err()
}

func addReply(ctx context.Context, db *pgxpool.Pool, ticketID, authorID, body string, admin bool) error {
	var err error
	if body, err = validateText(body, maxMessageLen, ErrInvalidMessage); err != nil {
		return err
	}
	tx, err := db.Begin(ctx)
	if err != nil {
		return fmt.Errorf("addReply begin: %w", err)
	}
	defer tx.Rollback(ctx)

	var ownerID string
	if err := tx.QueryRow(ctx, "SELECT user_id FROM support_tickets WHERE id = $1 FOR UPDATE", ticketID).Scan(&ownerID); errors.Is(err, pgx.ErrNoRows) {
		return ErrTicketNotFound
	} else if err != nil {
		return fmt.Errorf("addReply load: %w", err)
	}
	if !admin && ownerID != authorID {
		return ErrTicketNotFound
	}
	if _, err := tx.Exec(ctx, `
		INSERT INTO support_ticket_messages (ticket_id, author_id, body)
		VALUES ($1, $2, $3)
	`, ticketID, authorID, body); err != nil {
		return fmt.Errorf("addReply insert: %w", err)
	}
	status := "awaiting_admin"
	if admin {
		status = "awaiting_customer"
	}
	if _, err := tx.Exec(ctx, "UPDATE support_tickets SET status = $1, updated_at = NOW() WHERE id = $2", status, ticketID); err != nil {
		return fmt.Errorf("addReply update: %w", err)
	}
	if admin {
		if err := audit.Record(ctx, tx, audit.Entry{
			AdminID: authorID, Action: audit.ActionSupportReply, TargetType: "support_ticket", TargetID: ticketID,
			Metadata: map[string]any{"status": status},
		}); err != nil {
			return fmt.Errorf("addReply audit: %w", err)
		}
	}
	return tx.Commit(ctx)
}

func listAdminTickets(ctx context.Context, db *pgxpool.Pool, f adminFilter) ([]TicketRow, int, error) {
	where := []string{"1=1"}
	args := []any{}
	n := 1
	if f.Status != "" {
		if !validStatuses[f.Status] {
			return nil, 0, ErrInvalidStatus
		}
		where = append(where, fmt.Sprintf("t.status = $%d", n))
		args = append(args, f.Status)
		n++
	}
	if f.Search != "" {
		where = append(where, fmt.Sprintf("(t.subject ILIKE $%d OR u.phone ILIKE $%d OR TRIM(COALESCE(u.first_name, '') || ' ' || COALESCE(u.last_name, '')) ILIKE $%d OR t.ticket_number::text = $%d)", n, n, n, n))
		args = append(args, "%"+f.Search+"%")
		n++
	}
	clause := strings.Join(where, " AND ")
	var total int
	if err := db.QueryRow(ctx, "SELECT COUNT(*) FROM support_tickets t JOIN users u ON u.id = t.user_id WHERE "+clause, args...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("listAdminTickets count: %w", err)
	}
	query := fmt.Sprintf(`
		SELECT t.id, t.ticket_number, t.subject, t.category, t.status,
		       (SELECT COUNT(*)::int FROM support_ticket_messages WHERE ticket_id = t.id),
		       COALESCE((SELECT body FROM support_ticket_messages WHERE ticket_id = t.id ORDER BY created_at DESC, id DESC LIMIT 1), ''),
		       t.created_at, t.updated_at,
		       TRIM(COALESCE(u.first_name, '') || ' ' || COALESCE(u.last_name, '')), u.phone
		FROM support_tickets t
		JOIN users u ON u.id = t.user_id
		WHERE %s
		ORDER BY CASE WHEN t.status = 'awaiting_admin' THEN 0 WHEN t.status = 'awaiting_customer' THEN 1 ELSE 2 END,
		         t.updated_at DESC, t.id DESC
		LIMIT $%d OFFSET $%d
	`, clause, n, n+1)
	args = append(args, f.Limit, f.Offset)
	rows, err := db.Query(ctx, query, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("listAdminTickets query: %w", err)
	}
	defer rows.Close()
	items := []TicketRow{}
	for rows.Next() {
		var row TicketRow
		if err := rows.Scan(&row.ID, &row.TicketNumber, &row.Subject, &row.Category, &row.Status,
			&row.MessageCount, &row.LastMessage, &row.CreatedAt, &row.UpdatedAt, &row.UserName, &row.UserPhone); err != nil {
			return nil, 0, fmt.Errorf("listAdminTickets scan: %w", err)
		}
		items = append(items, row)
	}
	return items, total, rows.Err()
}

func setStatus(ctx context.Context, db *pgxpool.Pool, ticketID, adminID, status string) error {
	if !validStatuses[status] {
		return ErrInvalidStatus
	}
	tx, err := db.Begin(ctx)
	if err != nil {
		return fmt.Errorf("setStatus begin: %w", err)
	}
	defer tx.Rollback(ctx)
	tag, err := tx.Exec(ctx, "UPDATE support_tickets SET status = $1, updated_at = NOW() WHERE id = $2", status, ticketID)
	if err != nil {
		return fmt.Errorf("setStatus update: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrTicketNotFound
	}
	if err := audit.Record(ctx, tx, audit.Entry{
		AdminID: adminID, Action: audit.ActionSupportStatus, TargetType: "support_ticket", TargetID: ticketID,
		Metadata: map[string]any{"status": status},
	}); err != nil {
		return fmt.Errorf("setStatus audit: %w", err)
	}
	return tx.Commit(ctx)
}
