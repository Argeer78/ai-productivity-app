"use client";

import { requestIntegrityTokenFromTwa } from "@/lib/twaIntegrity";

export default function TestIntegrityPage() {
  async function test() {
    try {
      const token = await requestIntegrityTokenFromTwa();
      console.log("Integrity token:", token.slice(0, 30), "...");
      alert("Integrity token received ✅ (check console)");
    } catch (e: any) {
      console.error(e);
      alert(e.message || "Error getting integrity token");
    }
  }

  return (
    <button onClick={test}>
      Test Integrity Token
    </button>
  );
}
