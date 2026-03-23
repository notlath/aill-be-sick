/**
 * Utility functions for cleaning and processing BERT/Transformer model tokens
 * for display in the insights modal.
 *
 * BERT tokenizers produce special tokens and subword tokens that are confusing
 * for end users. This module provides utilities to clean them up for display.
 */

export interface TokenWithImportance {
  token: string;
  importance: number;
}

/**
 * Special tokens used by BERT and similar transformer models that should
 * be filtered out from user-facing displays.
 */
const SPECIAL_TOKENS = new Set([
  "[CLS]",
  "[SEP]",
  "[PAD]",
  "[UNK]",
  "[MASK]",
  "<s>",
  "</s>",
  "<pad>",
  "<unk>",
  "<mask>",
]);

/**
 * Checks if a token is a BERT special token that should be filtered out.
 */
export function isSpecialToken(token: string): boolean {
  return SPECIAL_TOKENS.has(token.toUpperCase()) || SPECIAL_TOKENS.has(token);
}

/**
 * Checks if a token is a BERT subword token (starts with ##).
 */
export function isSubwordToken(token: string): boolean {
  return token.startsWith("##");
}

/**
 * Cleans a single token by removing the ## prefix if present.
 */
export function cleanSubwordToken(token: string): string {
  return token.startsWith("##") ? token.slice(2) : token;
}

/**
 * Merges BERT subword tokens (tokens starting with ##) with their preceding tokens.
 * For example: ["head", "##ache"] becomes ["headache"] with combined importance.
 *
 * The importance of merged tokens is calculated as the maximum of all merged parts,
 * since any highly-important subword indicates the full word was important.
 */
export function mergeSubwordTokens(
  tokens: string[],
  importances: number[]
): TokenWithImportance[] {
  const result: TokenWithImportance[] = [];

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    const importance = importances[i] ?? 0;

    // Skip special tokens entirely
    if (isSpecialToken(token)) {
      continue;
    }

    if (isSubwordToken(token)) {
      // Merge with previous token if exists
      if (result.length > 0) {
        const prev = result[result.length - 1];
        prev.token += cleanSubwordToken(token);
        // Use max importance for merged tokens
        prev.importance = Math.max(prev.importance, importance);
      } else {
        // Orphan subword (no previous token to merge with)
        result.push({
          token: cleanSubwordToken(token),
          importance,
        });
      }
    } else {
      // Regular token
      result.push({
        token,
        importance,
      });
    }
  }

  return result;
}

/**
 * Normalizes importance values to a 0-1 range for display purposes.
 */
export function normalizeImportances(importances: number[]): number[] {
  if (importances.length === 0) return [];

  const min = Math.min(...importances);
  const max = Math.max(...importances);
  const range = max - min;

  // Avoid division by zero if all values are the same
  if (range === 0) {
    return importances.map(() => 0.5);
  }

  return importances.map((v) => (v - min) / range);
}

/**
 * Gets the top N tokens by importance score.
 * Useful for generating plain-English explanations.
 */
export function getTopTokens(
  tokens: TokenWithImportance[],
  n: number = 5
): TokenWithImportance[] {
  return [...tokens]
    .sort((a, b) => b.importance - a.importance)
    .slice(0, n);
}

/**
 * Processes raw BERT tokens and importances into a clean, user-friendly format.
 * This is the main function to use for preparing tokens for display.
 *
 * @param tokens - Raw token strings from the model
 * @param importances - Raw importance values from SHAP
 * @returns Cleaned and merged tokens with normalized importances
 */
export function processTokensForDisplay(
  tokens: string[],
  importances: number[]
): TokenWithImportance[] {
  // First merge subwords and filter special tokens
  const merged = mergeSubwordTokens(tokens, importances);

  // Normalize importances for display
  const normalizedImportances = normalizeImportances(
    merged.map((t) => t.importance)
  );

  return merged.map((t, i) => ({
    token: t.token,
    importance: normalizedImportances[i],
  }));
}

/**
 * Filters out common stop words and punctuation that aren't clinically relevant.
 * Use this for the plain-English explanation generator to focus on meaningful words.
 */
const STOP_WORDS = new Set([
  "the",
  "a",
  "an",
  "and",
  "or",
  "but",
  "is",
  "are",
  "was",
  "were",
  "be",
  "been",
  "being",
  "have",
  "has",
  "had",
  "do",
  "does",
  "did",
  "will",
  "would",
  "could",
  "should",
  "may",
  "might",
  "must",
  "shall",
  "can",
  "need",
  "dare",
  "to",
  "of",
  "in",
  "for",
  "on",
  "with",
  "at",
  "by",
  "from",
  "up",
  "about",
  "into",
  "over",
  "after",
  "beneath",
  "under",
  "above",
  "i",
  "me",
  "my",
  "myself",
  "we",
  "our",
  "ours",
  "ourselves",
  "you",
  "your",
  "yours",
  "yourself",
  "yourselves",
  "he",
  "him",
  "his",
  "himself",
  "she",
  "her",
  "hers",
  "herself",
  "it",
  "its",
  "itself",
  "they",
  "them",
  "their",
  "theirs",
  "themselves",
  "what",
  "which",
  "who",
  "whom",
  "this",
  "that",
  "these",
  "those",
  "am",
  "been",
  "being",
  "very",
  "just",
  "also",
  "now",
  "so",
  "than",
  "too",
  "only",
  "same",
  ".",
  ",",
  "!",
  "?",
  ";",
  ":",
  "'",
  "\"",
  "-",
  "(",
  ")",
  "[",
  "]",
  "{",
  "}",
]);

/**
 * Checks if a token is a stop word or punctuation.
 */
export function isStopWord(token: string): boolean {
  return STOP_WORDS.has(token.toLowerCase()) || token.length <= 1;
}

/**
 * Gets the top N clinically-relevant tokens (excluding stop words).
 * Use this for generating plain-English explanations.
 */
export function getTopClinicalTokens(
  tokens: TokenWithImportance[],
  n: number = 5
): TokenWithImportance[] {
  return tokens
    .filter((t) => !isStopWord(t.token))
    .sort((a, b) => b.importance - a.importance)
    .slice(0, n);
}
