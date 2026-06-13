const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3002"

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${API_URL}${path}`, {
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      ...options,
    })
  } catch {
    throw new Error("خطا در اتصال به سرور. لطفاً اتصال اینترنت خود را بررسی کنید")
  }
  const data = await res.json()
  if (!res.ok) throw new Error(data.message ?? "خطایی رخ داده است")
  return data as T
}
