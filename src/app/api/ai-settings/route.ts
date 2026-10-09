import OpenAI from "openai";
import { z } from "zod";
import {
  resolveAIConfiguration,
  saveAIConfiguration,
} from "@/server/ai-configuration";
import { assertLocalRequest, errorResponse, readJson } from "@/server/http";
import { describeAIError } from "@/server/ai";

const schema = z.object({
  action: z.enum(["save", "test"]),
  apiKey: z.string().trim().max(512).optional(),
  model: z.string().trim().min(1).max(200),
});

export async function POST(request: Request) {
  try {
    assertLocalRequest(request);
    const input = schema.parse(await readJson(request));
    const current = resolveAIConfiguration();
    const apiKey = input.apiKey || current.apiKey;
    if (!apiKey || apiKey.length < 10)
      throw new Error("Enter your OpenAI API key in Settings.");
    if (input.action === "test") {
      try {
        const client = new OpenAI({ apiKey, timeout: 15_000, maxRetries: 0 });
        await client.models.retrieve(input.model);
        return Response.json({
          message:
            "API key and model access verified. You can now ask a question after saving.",
        });
      } catch (error) {
        return Response.json(
          { error: describeAIError(error) },
          { status: 502 },
        );
      }
    }
    saveAIConfiguration({ apiKey, model: input.model });
    return Response.json({
      aiMode: "openai",
      aiStatus: resolveAIConfiguration().status,
      message: "AI setup saved locally. Ask is ready without restarting.",
    });
  } catch (error) {
    return errorResponse(error);
  }
}
