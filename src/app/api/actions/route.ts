import { randomUUID } from "node:crypto";
import { commandSchema } from "@/domain/commands";
import { applyCommand } from "@/domain/engine";
import { repository } from "@/server/repository";
import { assertLocalRequest, errorResponse, readJson } from "@/server/http";

export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    assertLocalRequest(request);
    const command = commandSchema.parse(await readJson(request));
    const store = repository().update((previous) =>
      applyCommand(previous, command, {
        now: new Date().toISOString(),
        id: randomUUID,
      }),
    );
    return Response.json({ store });
  } catch (error) {
    return errorResponse(error);
  }
}
