import { repository } from "@/server/repository";
import { resolveAIConfiguration } from "@/server/ai-configuration";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  const { status } = resolveAIConfiguration();
  return Response.json(
    {
      store: repository().read(),
      aiMode: status.configured ? "openai" : "demo",
      aiStatus: status,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
