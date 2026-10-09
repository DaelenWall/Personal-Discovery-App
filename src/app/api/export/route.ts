import { repository } from "@/server/repository";

export const dynamic = "force-dynamic";
export async function GET() {
  return Response.json(repository().read(), {
    headers: {
      "Content-Disposition": 'attachment; filename="personal-discovery.json"',
      "Cache-Control": "no-store",
    },
  });
}
