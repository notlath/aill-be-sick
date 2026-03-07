const DEFAULT_BACKEND_URL = "http://127.0.0.1:10000";
const HAS_PROTOCOL_REGEX = /^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//;

const stripTrailingSlash = (value: string): string =>
  value.endsWith("/") ? value.slice(0, -1) : value;

export const getBackendUrl = (): string => {
  const rawValue =
    process.env.NEXT_PUBLIC_BACKEND_URL?.trim() || DEFAULT_BACKEND_URL;
  const candidate = HAS_PROTOCOL_REGEX.test(rawValue)
    ? rawValue
    : `http://${rawValue}`;

  try {
    const parsed = new URL(candidate);

    // Avoid localhost IPv6 resolution timeouts in server-side Node fetches.
    if (typeof window === "undefined" && parsed.hostname === "localhost") {
      parsed.hostname = "127.0.0.1";
    }

    return stripTrailingSlash(parsed.toString());
  } catch {
    return stripTrailingSlash(rawValue);
  }
};
