(() => {
  /** @typedef {{ displayText: string, outputText: string, isDefault: boolean }} Option */
  /** @typedef {{ title: string, options: Option[], defaultIndex: number }} Dimension */
  /** @typedef {{ key: string, title: string, dimensions: Dimension[] }} Section */

  const formEl = document.getElementById("form");
  const outputEl = document.getElementById("output");
  const copyBtn = document.getElementById("copyBtn");
  const resetBtn = document.getElementById("resetBtn");
  const statusEl = document.getElementById("status");
  const tabsEl = document.getElementById("tabs");

  /** @type {Section[]} */
  let sections = [];
  /** @type {string | null} */
  let activeSectionKey = null;

  /** @type {Dimension[]} */
  let dimensions = [];
  /** Stores defaults so reset is stable even if user edits DOM. */
  let defaultsByName = new Map();
  /** Lines that should always be included (dimensions with no selectable non-default options). */
  let alwaysIncludedLines = [];

  function setStatus(msg, type = "info") {
    if (!statusEl) return;
    statusEl.textContent = msg || "";
    statusEl.dataset.type = type;
  }

  function escapeHtml(s) {
    return s
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function slugify(s) {
    return s
      .toLowerCase()
      .trim()
      .replaceAll(/[^\p{L}\p{N}]+/gu, "-")
      .replaceAll(/^-+|-+$/g, "");
  }

  /**
   * Existing parser: from a markdown fragment (with only list content) -> dimensions/options
   * @param {string} md
   * @returns {Dimension[]}
   */
  function parseOptionsMd(md) {
    const lines = md.replaceAll("\r\n", "\n").split("\n");

    /** @type {Dimension[]} */
    const dims = [];
    /** @type {Dimension | null} */
    let current = null;

    for (const rawLine of lines) {
      const line = rawLine.replaceAll("\t", "    "); // normalize tabs
      const trimmed = line.trim();
      if (!trimmed) continue;

      const dimMatch = trimmed.match(/^- (?!\[[ xX]\] )(.*)$/);
      if (dimMatch) {
        const title = dimMatch[1].trim();
        if (!title) continue;
        current = { title, options: [], defaultIndex: 0 };
        dims.push(current);
        continue;
      }

      const optMatch = trimmed.match(/^- \[([ xX])\] (.*)$/);
      if (optMatch && current) {
        const isDefault = optMatch[1].toLowerCase() === "x";
        const text = (optMatch[2] || "").trim();
        if (!text) continue;

        let displayText, outputText;
        const hashIndex = text.indexOf("#");
        if (hashIndex > 0 && hashIndex < text.length - 1) {
          const beforeHash = text.substring(0, hashIndex).trim();
          const afterHash = text.substring(hashIndex + 1).trim();
          if (beforeHash && afterHash) {
            displayText = beforeHash;
            outputText = afterHash;
          } else {
            displayText = text;
            outputText = text;
          }
        } else {
          displayText = text;
          outputText = text;
        }

        current.options.push({ displayText, outputText, isDefault });
      }
    }

    for (const d of dims) {
      const firstX = d.options.findIndex((o) => o.isDefault);
      d.defaultIndex = firstX >= 0 ? firstX : 0;
    }

    return dims.filter((d) => d.options.length > 0);
  }

  /**
   * NEW: Split the full options.md into sections based on markdown titles.
   * A section starts at a heading like "### Title" and includes following lines until next heading.
   * If there is list content before the first heading, it goes into a "General" section.
   * @param {string} md
   * @returns {Section[]}
   */
  function parseSections(md) {
    const lines = md.replaceAll("\r\n", "\n").split("\n");

    /** @type {{ title: string, key: string, body: string[] }[]} */
    const rawSections = [];
    let current = { title: "General", key: "general", body: [] };

    for (const line of lines) {
      const m = line.trim().match(/^#{2,6}\s+(.*)$/); // e.g. ### Lunge
      if (m) {
        // commit previous
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

  function renderTabs() {
    if (!tabsEl) return;
    tabsEl.innerHTML = "";

    for (const s of sections) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "tab";
      btn.textContent = s.title;
      btn.setAttribute("role", "tab");
      btn.setAttribute("aria-selected", String(s.key === activeSectionKey));
      btn.addEventListener("click", () => {
        setActiveSection(s.key);
      });
      tabsEl.appendChild(btn);
    }
  }

  function setActiveSection(key) {
    activeSectionKey = key;
    const sec = sections.find((s) => s.key === key);
    if (!sec) return;

    dimensions = sec.dimensions;
    renderTabs();
    renderForm(dimensions);
    updateOutput();
  }

  function renderForm(dims) {
    formEl.innerHTML = "";
    defaultsByName = new Map();
    alwaysIncludedLines = [];

    for (const dim of dims) {
      const defaultText = dim.options[dim.defaultIndex]?.outputText || "";
      const nonDefaultOptions = dim.options.filter((_, idx) => idx !== dim.defaultIndex);

      if (nonDefaultOptions.length === 0) {
        if (defaultText) alwaysIncludedLines.push(defaultText);
        continue;
      }

      const name = `dim_${slugify(dim.title)}_${Math.random().toString(16).slice(2)}`;
      defaultsByName.set(name, defaultText);

      const fieldset = document.createElement("fieldset");
      fieldset.className = "dimension";
      fieldset.dataset.name = name;

      const legend = document.createElement("legend");
      legend.textContent = dim.title;
      fieldset.appendChild(legend);

      dim.options.forEach((opt, idx) => {
        if (idx === dim.defaultIndex) return;

        const id = `${name}_${idx}`;

        const label = document.createElement("label");
        label.className = "option";
        label.htmlFor = id;

        const input = document.createElement("input");
        input.type = "checkbox";
        input.name = name;
        input.id = id;
        input.value = String(idx);
        input.checked = false;
        input.dataset.outputText = opt.outputText;

        const span = document.createElement("span");
        span.innerHTML = escapeHtml(opt.displayText);

        label.appendChild(input);
        label.appendChild(span);
        fieldset.appendChild(label);
      });

      formEl.appendChild(fieldset);
    }
  }

  function getGeneratedText() {
    const lines = [];
    for (const l of alwaysIncludedLines) lines.push(l);

    const fieldsets = Array.from(formEl.querySelectorAll("fieldset.dimension"));
    for (const fs of fieldsets) {
      const name = fs.dataset.name || "";
      const checked = Array.from(fs.querySelectorAll('input[type="checkbox"]:checked'));

      if (checked.length > 0) {
        for (const cb of checked) {
          const text = cb.dataset.outputText || "";
          if (text) lines.push(text);
        }
      } else {
        const defaultText = defaultsByName.get(name) || "";
        if (defaultText) lines.push(defaultText);
      }
    }

    return lines.join("\n");
  }

  function updateOutput() {
    outputEl.value = getGeneratedText();
  }

  async function copyToClipboard(text) {
    if (!text) return;
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }
    outputEl.focus();
    outputEl.select();
    document.execCommand("copy");
    outputEl.setSelectionRange(0, 0);
  }

  function resetToDefaults() {
    const checks = Array.from(formEl.querySelectorAll('input[type="checkbox"]'));
    for (const cb of checks) cb.checked = false;
    updateOutput();
  }

  async function init() {
    try {
      setStatus("Loading options.md…");
      const res = await fetch("options.md", { cache: "no-store" });
      if (!res.ok) throw new Error(`Failed to load options.md (${res.status})`);
      const md = await res.text();

      sections = parseSections(md);
      if (!sections.length) {
        setStatus("No dimensions/options found in options.md. Check formatting.", "error");
        return;
      }

      activeSectionKey = sections[0].key;
      renderTabs();
      setActiveSection(activeSectionKey);
      setStatus("");
    } catch (err) {
      setStatus(err?.message || "Failed to initialize.", "error");
    }
  }

  formEl.addEventListener("change", () => updateOutput());

  copyBtn.addEventListener("click", async () => {
    try {
      await copyToClipboard(outputEl.value);
      setStatus("Copied to clipboard.", "success");
      setTimeout(() => setStatus(""), 1200);
    } catch (e) {
      setStatus("Copy failed.", "error");
    }
  });

  resetBtn.addEventListener("click", () => resetToDefaults());

  init();
})();
