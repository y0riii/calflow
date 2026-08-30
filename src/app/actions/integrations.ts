"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "./authentication";
import { revalidatePath } from "next/cache";

export async function disconnectIntegrationAction(provider: "google" | "zoom") {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, message: "Unauthorized" };
    }

    await prisma.oauthAccount.deleteMany({
      where: {
        userId: parseInt(user.id),
        provider,
      },
    });

    revalidatePath("/profile");
    return { success: true };
  } catch (err) {
    console.error("Disconnect error:", err);
    return { success: false, message: "Failed to disconnect integration." };
  }
}

export async function getConnectedIntegrationsAction() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, integrations: [], details: {} };
    }

    const accounts = await prisma.oauthAccount.findMany({
      where: { userId: parseInt(user.id) },
      select: { provider: true, providerAccount: true },
    });

    const details: Record<string, { email: string }> = {};
    accounts.forEach((a) => {
      details[a.provider] = {
        email: a.providerAccount && a.providerAccount !== 'zoom' && a.providerAccount !== 'google' ? a.providerAccount : user.email,
      };
    });

    return {
      success: true,
      integrations: accounts.map((a) => a.provider),
      details,
    };
  } catch (err) {
    return { success: false, integrations: [], details: {} };
  }
}
