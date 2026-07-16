-- The application has always promoted SUPER_ADMIN_PHONE to this role, but the
-- historical migration chain did not guarantee that the enum value existed.
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'super_admin';
