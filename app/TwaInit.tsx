"use client";
import { useEffect } from "react";
import { initTwaPortListener } from "@/lib/twaIntegrity";

export default function TwaInit() {
  useEffect(() => {
    initTwaPortListener();
  }, []);
  return null;
}
