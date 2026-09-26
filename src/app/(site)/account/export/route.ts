import { getCurrentUser } from "@/server/auth/session";
import { exportUserData } from "@/server/services/accounts";
import { audit } from "@/server/services/audit";

/** Data subject access request: download everything we hold about the signed-in user. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const data = await exportUserData(user.id);
  await audit({ actorId: user.id, action: "user.data_export", entityType: "user", entityId: user.id });
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="queensy-data-${new Date().toISOString().slice(0, 10)}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
