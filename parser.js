/** @typedef {{ displayText: string, outputText: string, isDefault: boolean }} Option */
/** @typedef {{ title: string, options: Option[], defaultIndex: number }} Dimension */
/** @typedef {{ key: string, title: string, dimensions: Dimension[] }} Section */

export function slugify(s) {
  return String(s)
    .toLowerCase()
    .trim()
    .replaceAll(/[^\p{L}\p{N}]+/gu, "-")
    .replaceAll(/^-+|-+$/g, "");
}

/**
 * From a markdown fragment (with only list content) -> dimensions/options
 * @param {string} md
 * @returns {Dimension[]}
 */
export function parseOptionsMd(md) {
  const lines = md.replaceAll("\r\n", "\n").split("\n");

  /** @type {Dimension[]} */
  const dims = [];
  /** @type {Dimension | null} */
  let current = null;

  const isDimensionLine = (trimmed) => /^- (?!\[[ xX]\] )(.*)$/.test(trimmed);
  const getDimensionTitle = (trimmed) => (trimmed.match(/^- (?!\[[ xX]\] )(.*)$/)?.[1] || "").trim();
  const matchOptionLine = (trimmed) => trimmed.match(/^- \[([ xX])\] (.*)$/);

  const parseOptionText = (text) => {
    const t = (text || "").trim();
    if (!t) return null;

    const hashIndex = t.indexOf("#");
    if (hashIndex <= 0 || hashIndex >= t.length - 1) return { displayText: t, outputText: t };

    const displayText = t.substring(0, hashIndex).trim();
    const outputText = t.substring(hashIndex + 1).trim();
    if (!displayText || !outputText) return { displayText: t, outputText: t };

    return { displayText, outputText };
  };

  for (const rawLine of lines) {
    const trimmed = rawLine.replaceAll("\t", "    ").trim();
    if (!trimmed) continue;

    if (isDimensionLine(trimmed)) {
      const title = getDimensionTitle(trimmed);
      if (!title) continue;
      current = { title, options: [], defaultIndex: 0 };
      dims.push(current);
      continue;
    }

    const m = matchOptionLine(trimmed);
    if (!m || !current) continue;

    const isDefault = (m[1] || "").toLowerCase() === "x";
    const parsed = parseOptionText(m[2]);
    if (!parsed) continue;

    current.options.push({ ...parsed, isDefault });
  }

  for (const d of dims) {
    const firstX = d.options.findIndex((o) => o.isDefault);
    d.defaultIndex = firstX >= 0 ? firstX : 0;
  }

  return dims.filter((d) => d.options.length > 0);
}

/**
 * Split the full options.md into sections based on markdown titles.
 * @param {string} md
 * @returns {Section[]}
 */
export function parseSections(md) {
  const lines = md.replaceAll("\r\n", "\n").split("\n");

  /** @type {{ title: string, key: string, body: string[] }[]} */
  const rawSections = [];
  let current = { title: "General", key: "general", body: [] };

  for (const line of lines) {
    const m = line.trim().match(/^#{2,6}\s+(.*)$/);
    if (m) {
      if (current.body.some((l) => l.trim())) rawSections.push(current);
      const title = (m[1] || "").trim();
      current = { title: title || "Untitled", key: slugify(title || "Untitled"), body: [] };
      continue;
    }
    current.body.push(line);
  }
  if (current.body.some((l) => l.trim())) rawSections.push(current);

  /** @type {Section[]} */
  const result = [];
  for (const s of rawSections) {
    const dims = parseOptionsMd(s.body.join("\n"));
    if (dims.length) result.push({ key: s.key, title: s.title, dimensions: dims });
  }
  return result;
}
