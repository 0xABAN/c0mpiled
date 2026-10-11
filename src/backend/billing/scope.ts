import "server-only";

import { eq } from "drizzle-orm";
import { z } from "zod";
import { unlocks } from "@/backend/db";
import { providerConfig } from "./contracts";

export function billingConfig() {
  const config = providerConfig(process.env.MONETIZATION_APP_ID, process.env.MONETIZATION_ENDPOINT);
  // One explicitly approved, immutable product for the live pilot; no runtime publishing.
  const liveProductId = config.mode === "live" ? z.uuid().parse(process.env.MONETIZATION_LIVE_PRODUCT_ID) : null;
  return { ...config, liveProductId };
}

/** Apply to every contact, file, search, and earnings query: test purchases never count as real. */
export function activeUnlocks() {
  return eq(unlocks.billingMode, billingConfig().mode);
}
