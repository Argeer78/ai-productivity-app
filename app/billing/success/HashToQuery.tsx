"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function HashToQuery() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") return;

    const { hash, pathname, search } = window.location;
    if (!hash || hash.length < 2) return;

    const params = new URLSearchParams(hash.slice(1));
    const sid = params.get("session_id") || params.get("sessionId");
    if (!sid) return;

    const url = new URL(window.location.href);
    url.hash = "";
    if (!url.searchParams.get("session_id")) {
      url.searchParams.set("session_id", sid);
      router.replace(pathname + url.search);
    }
  }, [router]);

  return null;
}
