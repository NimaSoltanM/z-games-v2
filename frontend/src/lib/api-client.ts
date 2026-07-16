const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3002"

export async function apiFetch<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${API_URL}${path}`, {
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      ...options,
    })
  } catch {
    throw new Error(
      "خطا در اتصال به سرور. لطفاً اتصال اینترنت خود را بررسی کنید"
    )
  }
  let data: unknown
  try {
    data = await res.json()
  } catch {
    if (!res.ok) {
      throw new Error("پاسخ نامعتبر از سرور دریافت شد. لطفاً دوباره تلاش کنید")
    }
    throw new Error("پاسخ سرور قابل پردازش نیست")
  }
  if (!res.ok) {
    const message =
      typeof data === "object" &&
      data !== null &&
      "message" in data &&
      typeof data.message === "string"
        ? data.message
        : "خطایی رخ داده است"
    throw new Error(message)
  }
  return data as T
}
