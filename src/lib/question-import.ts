// Parser for pasted TSV/CSV question banks.
// Expected headers (order flexible, case/space/underscore-insensitive):
//   question, choice_a..choice_f (or a..f), correct (A-F), explanation

export type ParsedRow = {
  rowNumber: number; // 1-indexed row in the pasted body (excluding header)
  prompt: string;
  explanation: string | null;
  choices: { text: string; is_correct: boolean }[]; // 2-6 items
};

export type ParseResult = {
  rows: ParsedRow[];
  errors: { row: number; message: string }[];
};

const CHOICE_LETTERS = ["a", "b", "c", "d", "e", "f"] as const;

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/[\s_-]+/g, "");
}

function mapHeader(h: string): string | null {
  const n = normalizeHeader(h);
  if (["question", "prompt", "q"].includes(n)) return "prompt";
  if (["correct", "answer", "correctanswer", "key"].includes(n)) return "correct";
  if (["explanation", "explain", "why", "rationale"].includes(n)) return "explanation";
  // choice_a, choicea, a, optiona, choice1
  const letterMatch = n.match(/^(?:choice|option)?([a-f])$/);
  if (letterMatch) return `choice_${letterMatch[1]}`;
  const numMatch = n.match(/^(?:choice|option)([1-6])$/);
  if (numMatch) {
    const idx = parseInt(numMatch[1], 10) - 1;
    return `choice_${CHOICE_LETTERS[idx]}`;
  }
  return null;
}

// Split a single line/record honoring quoted fields.
// Returns fields for one record; supports embedded newlines inside quotes.
function parseDelimited(input: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let i = 0;
  let inQuotes = false;
  while (i < input.length) {
    const ch = input[i];
    if (inQuotes) {
      if (ch === '"') {
        if (input[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += ch;
      i++;
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (ch === delimiter) {
      row.push(field);
      field = "";
      i++;
      continue;
    }
    if (ch === "\r") {
      i++;
      continue;
    }
    if (ch === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      i++;
      continue;
    }
    field += ch;
    i++;
  }
  // Trailing field
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim().length > 0));
}

function detectDelimiter(firstLine: string): string {
  const tabs = (firstLine.match(/\t/g) || []).length;
  const commas = (firstLine.match(/,/g) || []).length;
  return tabs >= commas && tabs > 0 ? "\t" : ",";
}

export function parseQuestionBank(input: string): ParseResult {
  const errors: { row: number; message: string }[] = [];
  const trimmed = input.trim();
  if (!trimmed) return { rows: [], errors: [{ row: 0, message: "Empty input" }] };

  const firstLine = trimmed.split(/\r?\n/, 1)[0];
  const delimiter = detectDelimiter(firstLine);
  const records = parseDelimited(trimmed, delimiter);
  if (records.length < 2) {
    return { rows: [], errors: [{ row: 0, message: "Need a header row plus at least one question" }] };
  }

  const headerCells = records[0];
  const mapped = headerCells.map(mapHeader);
  const promptIdx = mapped.indexOf("prompt");
  const correctIdx = mapped.indexOf("correct");
  const explanationIdx = mapped.indexOf("explanation");
  const choiceIdxByLetter = new Map<string, number>();
  CHOICE_LETTERS.forEach((letter) => {
    const idx = mapped.indexOf(`choice_${letter}`);
    if (idx !== -1) choiceIdxByLetter.set(letter, idx);
  });

  if (promptIdx === -1) errors.push({ row: 1, message: "Missing 'question' column" });
  if (correctIdx === -1) errors.push({ row: 1, message: "Missing 'correct' column" });
  if (choiceIdxByLetter.size < 2) errors.push({ row: 1, message: "Need at least two choice columns (choice_a, choice_b, ...)" });
  if (errors.length > 0) return { rows: [], errors };

  const rows: ParsedRow[] = [];
  for (let r = 1; r < records.length; r++) {
    const cells = records[r];
    const rowNumber = r; // 1-indexed body row
    const prompt = (cells[promptIdx] ?? "").trim();
    if (!prompt) {
      errors.push({ row: rowNumber, message: "Empty question" });
      continue;
    }
    const correctRaw = (cells[correctIdx] ?? "").trim().toLowerCase();
    if (!correctRaw) {
      errors.push({ row: rowNumber, message: "Missing correct answer" });
      continue;
    }
    const correctLetters = new Set(
      correctRaw
        .split(/[,\s/|]+/)
        .map((c) => c[0])
        .filter((c) => c && CHOICE_LETTERS.includes(c as (typeof CHOICE_LETTERS)[number])),
    );
    if (correctLetters.size === 0) {
      errors.push({ row: rowNumber, message: `Correct answer must be A-F (got "${cells[correctIdx]}")` });
      continue;
    }

    const choices: ParsedRow["choices"] = [];
    for (const letter of CHOICE_LETTERS) {
      const idx = choiceIdxByLetter.get(letter);
      if (idx === undefined) continue;
      const text = (cells[idx] ?? "").trim();
      if (!text) continue;
      choices.push({ text, is_correct: correctLetters.has(letter) });
    }
    if (choices.length < 2) {
      errors.push({ row: rowNumber, message: "Need at least 2 non-empty choices" });
      continue;
    }
    if (!choices.some((c) => c.is_correct)) {
      errors.push({ row: rowNumber, message: `Correct letter "${correctRaw}" points to an empty choice` });
      continue;
    }

    const explanation =
      explanationIdx !== -1 ? (cells[explanationIdx] ?? "").trim() || null : null;

    rows.push({ rowNumber, prompt, explanation, choices });
  }
  return { rows, errors };
}

export const IMPORT_TEMPLATE_HEADER =
  "question\tchoice_a\tchoice_b\tchoice_c\tchoice_d\tcorrect\texplanation";
