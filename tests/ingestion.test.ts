import assert from "node:assert/strict";
import { test } from "node:test";
import { createSeedStore } from "../src/data/seed";
import {
  ingestionSchema,
  isDuplicate,
  validateEvidence,
  validateSourceText,
} from "../src/domain/ingestion";
import {
  isPublicAddress,
  validatePublicUrl,
  extractReadable,
} from "../src/server/extraction";
import { DemoProvider } from "../src/server/ai";

const article =
  "Scientific models simplify complex systems by preserving relationships relevant to a particular question. A useful model allows predictions to be compared with observations. Its assumptions should be stated clearly, because a model that works in one setting can fail when the surrounding conditions change. Comparison with alternative models helps reveal which simplifications matter and which evidence would distinguish competing explanations.";

test("ingestion validates substantial text, metadata, and generic filler", () => {
  assert.equal(validateSourceText(article), article);
  assert.throws(() => validateSourceText("Too short."));
  assert.throws(() =>
    validateSourceText(
      "Believe in yourself and unlock your potential. ".repeat(8),
    ),
  );
  assert.equal(
    ingestionSchema.safeParse({ kind: "url", url: "not a URL" }).success,
    false,
  );
  assert.equal(
    ingestionSchema.safeParse({ kind: "text", title: "Models", text: article })
      .success,
    true,
  );
});
test("duplicate detection tolerates punctuation and detects near identical claims", () => {
  const ideas = createSeedStore().ideas;
  assert.equal(
    isDuplicate({ title: "GOODHARTS LAW!", oneSentence: "different" }, ideas),
    true,
  );
  assert.equal(
    isDuplicate(
      { title: "A distinct title", oneSentence: ideas[0].oneSentence },
      ideas,
    ),
    true,
  );
  assert.equal(
    isDuplicate(
      {
        title: "A new mechanism",
        oneSentence: "This is an unrelated claim about cellular metabolism.",
      },
      ideas,
    ),
    false,
  );
});
test("supporting evidence must be a real contiguous source extract", () => {
  validateEvidence(article, article.slice(0, 100));
  assert.throws(() =>
    validateEvidence(
      article,
      "An unsupported claim that does not appear in this text.",
    ),
  );
});
test("public URL validation blocks private hosts, credentials, ports, and non-HTTP schemes", () => {
  for (const url of [
    "http://localhost/",
    "http://127.0.0.1",
    "http://10.0.0.1",
    "http://169.254.169.254",
    "http://[::1]",
    "http://2130706433",
    "http://192.168.1.1",
    "http://user:pass@example.com",
    "https://example.com:8443",
    "file:///etc/passwd",
    "http://machine.local",
  ])
    assert.throws(() => validatePublicUrl(url), url);
  assert.equal(
    validatePublicUrl("https://example.com/article").hostname,
    "example.com",
  );
  for (const address of [
    "127.0.0.1",
    "10.1.2.3",
    "172.16.1.1",
    "192.168.1.1",
    "100.64.0.1",
    "::1",
    "::ffff:127.0.0.1",
    "fc00::1",
    "fe80::1",
  ])
    assert.equal(isPublicAddress(address), false, address);
  assert.equal(isPublicAddress("8.8.8.8"), true);
});
test("readable extraction preserves article text, title and attribution", () => {
  const result = extractReadable(
    `<html><head><title>Models and limits</title><meta name="author" content="Test Author"></head><body><article><h1>Models and limits</h1><p>${article}</p><p>${article}</p></article></body></html>`,
    "https://example.com/models",
  );
  assert.ok(result.rawText.includes("Scientific models"));
  assert.equal(result.title, "Models and limits");
  assert.equal(result.author, "Test Author");
  assert.equal(result.url, "https://example.com/models");
});
test("no-key provider drafts from source and labels Ask as stored material", async () => {
  const provider = new DemoProvider();
  const store = createSeedStore();
  const source = {
    ...store.sources[0],
    rawText: article,
    title: "Models and limits",
  };
  const draft = await provider.generateIdea(source);
  assert.equal(draft.interpretation, "source_extract");
  validateEvidence(article, draft.evidence);
  const answer = await provider.answer("What is a concrete example?", {
    idea: store.ideas[0],
    source: store.sources[0],
    related: [],
    known: false,
    savedIdeas: [],
    history: [],
  });
  assert.ok(answer.includes("From your stored material"));
  assert.ok(answer.includes(store.ideas[0].example!));
});
