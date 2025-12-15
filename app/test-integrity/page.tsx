"use client";

import { requestIntegrityTokenFromTwa } from "@/lib/twaIntegrity";
import { useEffect } from "react";

function OriginDebug() {
  useEffect(() => {
    console.log("origin:", window.location.origin);
    console.log("href:", window.location.href);
  }, []);
  return null;
}

export default function TestIntegrityPage() {
  async function test() {
    try {
      const token = await requestIntegrityTokenFromTwa();
      console.log("Integrity token:", token.slice(0, 30), "...");
      alert("Integrity token received ✅ (check console)");
    } catch (e: any) {
      console.error(e);
      alert(e?.message || "Error getting integrity token");
    }
  }

  return (
    <div style={{ padding: 16 }}>
      <OriginDebug />
      <button onClick={test}>Test Integrity Token</button>
    </div>
  );
}
