const BAD_WORDS = ["slur1", "slur2", "offensiveword", "abuseword"];

export function containsBlockedWords(input: string) {
  const normalized = input.toLowerCase();
  return BAD_WORDS.some((word) => normalized.includes(word));
}

export function validatePollContent(title: string, options: string[]) {
  if (containsBlockedWords(title)) {
    return "Poll title contains blocked words.";
  }

  const badOption = options.find((option) => containsBlockedWords(option));
  if (badOption) {
    return "One of the poll options contains blocked words.";
  }

  return null;
}
