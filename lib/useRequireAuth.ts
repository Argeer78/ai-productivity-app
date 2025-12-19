// lib/useRequireAuth.ts
import { useAuthModal } from "@/app/components/AuthModal";

export function useRequireAuth(user: any) {
  const { open } = useAuthModal();

  return function requireAuth(cb?: () => void) {
    if (!user) {
      open();
      return false;
    }
    cb?.();
    return true;
  };
}
