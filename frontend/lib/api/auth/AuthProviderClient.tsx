"use client";

import { useRouter } from "next/navigation";
import { AuthProvider } from "./authContext";
import { Routes } from "../FrontendRoutes";
import { buildLoginRedirectPath } from "@/lib/api/auth/redirect";

export function AuthProviderClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  return (
    <AuthProvider
      onLogout={() => {
        console.log("User logged out");
        const next = buildLoginRedirectPath(
          `${window.location.pathname}${window.location.search}`,
          Routes.login
        );
        router.replace(next);
      }}
    >
      {children}
    </AuthProvider>
  );
}
