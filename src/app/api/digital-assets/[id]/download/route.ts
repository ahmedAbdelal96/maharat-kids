import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { getPrismaClient } from "@/database/prisma";
import { getCurrentUser } from "@/modules/auth/server/queries";
import { privateDigitalStorage } from "@/modules/digital/infrastructure/private-storage";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await getCurrentUser();
  const user = actor.success ? actor.data?.user : null;
  if (!user || user.type !== "CUSTOMER") return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const { id } = await params;
  const db = getPrismaClient();
  const entitlement = await db.digitalEntitlement.findFirst({ where: { digitalAssetId: id, userId: user.id, status: "ACTIVE", digitalAsset: { status: "ACTIVE" } }, include: { digitalAsset: true } });
  if (!entitlement) return NextResponse.json({ error: "DIGITAL_ACCESS_DENIED" }, { status: 403 });
  try {
    const bytes = await privateDigitalStorage.get(entitlement.digitalAsset.storageKey);
    const checksum = createHash("sha256").update(bytes).digest("hex");
    if (checksum !== entitlement.digitalAsset.checksum) return NextResponse.json({ error: "DIGITAL_ASSET_INTEGRITY_FAILED" }, { status: 503 });
    const ipHash = createHash("sha256").update(request.headers.get("x-forwarded-for") ?? "unknown").digest("hex");
    const userAgentHash = createHash("sha256").update(request.headers.get("user-agent") ?? "unknown").digest("hex");
    await db.digitalDownloadEvent.create({ data: { entitlementId: entitlement.id, userId: user.id, digitalAssetId: id, ipHash, userAgentHash } });
    const filename = (entitlement.digitalAsset.displayNameEn || "digital-book").replace(/[^a-z0-9-_]+/gi, "-").replace(/^-|-$/g, "") || "digital-book";
    const asciiFilename = `${filename}.pdf`;
    const encodedFilename = encodeURIComponent(`${entitlement.digitalAsset.displayNameEn || entitlement.digitalAsset.displayNameAr || "digital-book"}.pdf`);
    return new NextResponse(Buffer.from(bytes), { headers: { "Content-Type": "application/pdf", "Content-Length": String(bytes.byteLength), "Content-Disposition": `attachment; filename="${asciiFilename}"; filename*=UTF-8''${encodedFilename}`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
  } catch { return NextResponse.json({ error: "DIGITAL_ASSET_UNAVAILABLE" }, { status: 503 }); }
}
