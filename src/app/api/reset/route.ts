import { repository } from "@/server/repository";
import { assertLocalRequest, errorResponse, readJson } from "@/server/http";

export async function POST(request: Request) {
  try {
    assertLocalRequest(request);
    const body = await readJson(request);
    if (body.confirm !== "DELETE MY LOCAL DATA")
      throw new Error("Type DELETE MY LOCAL DATA to confirm.");
    return Response.json({ store: repository().reset() });
  } catch (error) {
    return errorResponse(error);
  }
}
