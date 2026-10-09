import { resolveAIConfiguration } from "@/server/ai-configuration";

export const dynamic = "force-dynamic";
export async function GET() {
  const { status } = resolveAIConfiguration();
  return Response.json(
    { aiMode: status.configured ? "openai" : "demo", aiStatus: status },
    { headers: { "Cache-Control": "no-store" } },
  );
}
