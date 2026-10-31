export function extractQuestions(text) {
  if (!text) return [];

  const questions = [];

  // Split transcript into sentences
  const sentences = text.match(/[^.!?]+[.!?]?/g) || [];

  const questionPatterns = [
    /^(what|why|when|where|who|whom|whose|which|how)\b/i,
    /^(can|could|would|will|do|does|did|is|are|was|were|have|has)\b/i,
    /^(explain|describe|define|tell me about|walk me through)\b/i,
  ];

  for (const sentence of sentences) {
    const cleaned = sentence.trim();

    if (!cleaned || cleaned.length < 5) continue;

    const isQuestion =
      cleaned.includes("?") ||
      questionPatterns.some((pattern) => pattern.test(cleaned));

    if (isQuestion) {
      questions.push(cleaned);
    }
  }

  return questions;
}

export function normalizeQuestion(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
