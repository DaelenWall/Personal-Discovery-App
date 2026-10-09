import type { AIProvider, AskContext, GeneratedDraft } from "../server/ai";
import type { Source } from "./types";

export class DemoProvider implements AIProvider {
  mode = "demo" as const;
  async generateIdea(source: Source): Promise<GeneratedDraft> {
    const sentences = source.rawText
      .replace(/\s+/g, " ")
      .match(/[^.!?]+[.!?]+|[^.!?]+$/g) ?? [source.rawText];
    const excerpt = sentences.slice(0, 5).join("").trim().slice(0, 1400);
    return {
      title: source.title,
      oneSentence: sentences[0].trim().slice(0, 500),
      shortExplanation: excerpt,
      deeperExplanation:
        "Demo mode preserves an extract rather than generating an unsupported explanation. Read the full source below and add your own notes.",
      whyItMatters:
        "Review whether this source adds a useful mechanism, example, or connection to your existing knowledge.",
      example: "No generated example in demo mode.",
      counterpoint:
        "This extract has not been fact-checked. The source may omit relevant evidence or alternatives.",
      concepts: [source.title],
      topics: ["User sources"],
      evidence: excerpt,
      interpretation: "source_extract",
    };
  }
  async answer(question: string, context: AskContext) {
    const lower = question.toLowerCase();
    const relevant = /example|concrete|apply/.test(lower)
      ? context.idea.example
      : /limit|counter|wrong|critici/.test(lower)
        ? context.idea.counterpoint
        : /why|mechanism|how/.test(lower)
          ? context.idea.deeperExplanation
          : context.idea.shortExplanation;
    return `From your stored material:\n\n${relevant ?? context.idea.shortExplanation}\n\n${context.idea.interpretation === "source_extract" ? "Source extract" : "Editorial interpretation"}: ${context.source.title}${context.source.url ? `\n${context.source.url}` : ""}\n\nConnect OpenAI in Settings for new explanations and follow-up answers. This response retrieves an existing explanation.`;
  }
}
