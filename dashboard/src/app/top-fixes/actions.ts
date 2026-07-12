"use server";

import { revalidatePath } from "next/cache";
import { saveClaim, removeClaim } from "@/lib/quests";

export async function claimQuest(formData: FormData): Promise<void> {
  const ruleId = String(formData.get("ruleId") ?? "").trim();
  const owner = String(formData.get("owner") ?? "")
    .trim()
    .slice(0, 40);
  if (ruleId && owner) saveClaim(ruleId, owner);
  revalidatePath("/top-fixes");
  revalidatePath("/");
}

export async function releaseQuest(formData: FormData): Promise<void> {
  const ruleId = String(formData.get("ruleId") ?? "").trim();
  if (ruleId) removeClaim(ruleId);
  revalidatePath("/top-fixes");
  revalidatePath("/");
}
