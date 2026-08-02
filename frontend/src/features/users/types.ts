import type { Pagination } from "@/features/orders"

export type UserRole = "user" | "admin" | "super_admin"

export type AdminUser = {
  phone: string
  first_name: string | null
  last_name: string | null
  role: UserRole
  created_at: string
}

export type UsersPage = {
  users: AdminUser[]
  pagination: Pagination
}

export type UsersQuery = {
  page?: number
}
