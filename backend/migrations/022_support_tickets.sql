-- Customer support tickets and their chronological correspondence.

BEGIN;

CREATE SEQUENCE support_ticket_number_seq
  START WITH 1000
  INCREMENT BY 1;

CREATE TABLE support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number BIGINT NOT NULL DEFAULT nextval('support_ticket_number_seq'),
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject VARCHAR(160) NOT NULL,
  category TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'awaiting_admin',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT support_tickets_number_unique UNIQUE (ticket_number),
  CONSTRAINT support_tickets_category_check CHECK (
    category IN ('order', 'account', 'payment', 'return', 'other')
  ),
  CONSTRAINT support_tickets_status_check CHECK (
    status IN ('awaiting_admin', 'awaiting_customer', 'resolved')
  )
);

CREATE TABLE support_ticket_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  author_id VARCHAR NOT NULL REFERENCES users(id),
  body TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT support_ticket_messages_body_check CHECK (
    char_length(body) BETWEEN 1 AND 4000
  )
);

CREATE INDEX support_tickets_user_updated_idx
  ON support_tickets (user_id, updated_at DESC);
CREATE INDEX support_tickets_admin_queue_idx
  ON support_tickets (status, updated_at DESC);
CREATE INDEX support_ticket_messages_ticket_time_idx
  ON support_ticket_messages (ticket_id, created_at, id);

COMMIT;
