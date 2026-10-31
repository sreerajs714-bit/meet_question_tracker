export async function saveQuestion(question) {
  const result = await chrome.storage.local.get("questions");

  const questions = result.questions || [];

  const exists = questions.some(
    (item) => item.normalized === question.normalized,
  );

  if (exists) return false;

  questions.push(question);

  await chrome.storage.local.set({ questions });

  return true;
}

export async function getQuestions() {
  const result = await chrome.storage.local.get("questions");

  return result.questions || [];
}
