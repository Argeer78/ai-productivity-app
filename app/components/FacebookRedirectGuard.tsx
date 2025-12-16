"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { isFacebookInAppBrowser } from "@/lib/isInAppBrowser";

export default function FacebookRedirectGuard() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!isFacebookInAppBrowser()) return;

    // Already on the help page → do nothing
    if (pathname === "/open-in-browser") return;

    // Prevent redirect loop
    const alreadyRedirected = sessionStorage.getItem("fb_redirected");
    if (alreadyRedirected) return;

    sessionStorage.setItem("fb_redirected", "1");
    router.replace("/open-in-browser");
  }, [pathname, router]);

  return null;
}
