const SAME_APP_ORIGIN = "http://aeroops.local";

export function safeSameAppReturnDestination(
  value: FormDataEntryValue | string | null | undefined,
  fallback: string,
): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) {
    return fallback;
  }

  try {
    const parsed = new URL(value, SAME_APP_ORIGIN);

    if (
      parsed.origin !== SAME_APP_ORIGIN ||
      parsed.username ||
      parsed.password ||
      !parsed.pathname.startsWith("/")
    ) {
      return fallback;
    }

    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}

export function withSameAppReturnMessage(
  destination: string,
  key: "error" | "message" | "submitted",
  value: string,
): string {
  const parsed = new URL(destination, SAME_APP_ORIGIN);
  parsed.searchParams.delete("error");
  parsed.searchParams.delete("message");
  parsed.searchParams.delete("submitted");
  parsed.searchParams.set(key, value);

  return `${parsed.pathname}${parsed.search}${parsed.hash}`;
}
