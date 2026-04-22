export const AUTH_PRESENCE_COOKIE = "bedflow_auth_present";

export function isSafeRelativePath(path: string | null | undefined): path is string {
  if (!path) {
    return false;
  }

  return path.startsWith("/") && !path.startsWith("//") && !path.startsWith("/\\");
}

export function sanitizeRedirectPath(
  path: string | null | undefined,
  fallback: string = "/"
): string {
  if (!isSafeRelativePath(path)) {
    return fallback;
  }

  return path;
}

export function getSafeNextPath(
  next: string | null | undefined,
  fallback: string = "/"
): string {
  return sanitizeRedirectPath(next, fallback);
}

export function buildLoginRedirectPath(
  currentPathWithQuery: string,
  loginPath: string = "/auth/login"
): string {
  const safeCurrentPath = sanitizeRedirectPath(currentPathWithQuery, "/");
  return `${loginPath}?next=${encodeURIComponent(safeCurrentPath)}`;
}
