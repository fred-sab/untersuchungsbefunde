(() => {
  /** @typedef {{ text: string, isDefault: boolean }} Option */
  /** @typedef {{ title: string, options: Option[], defaultIndex: number }} Dimension */

  const formEl = document.getElementById("form");
  const outputEl = document.getElementById("output");
  const copyBtn = document.getElementById("copyBtn");
  const resetBtn = document.getElementById("resetBtn");
  const statusEl = document.getElementById("status");

  /** @type {Dimension[]} */
  let dimensions = [];
  /** Stores defaults so reset is stable even if user edits DOM. */
  let defaultsByName = new Map();

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
   * Supports the README rules: top-level "- Title" creates a dimension,
   * indented "- [x] text" / "- [ ] text" create options.
   * Ignores anything outside this list structure (e.g. headings like "### Lunge").
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

      // Dimension: "- Title" but NOT "- [x]" / "- [ ]"
      const dimMatch = trimmed.match(/^- (?!\[[ xX]\] )(.*)$/);
      if (dimMatch) {
        const title = dimMatch[1].trim();
        if (!title) continue;
        current = { title, options: [], defaultIndex: 0 };
        dims.push(current);
        continue;
      }

      // Option: "- [x] text" or "- [ ] text" (must have a current dimension)
      const optMatch = trimmed.match(/^- \[([ xX])\] (.*)$/);
      if (optMatch && current) {
        const isDefault = optMatch[1].toLowerCase() === "x";
        const text = (optMatch[2] || "").trim();
        if (!text) continue;

        const idx = current.options.length;
        current.options.push({ text, isDefault });

        // first [x] wins; otherwise stays 0
        if (isDefault && current.options.every((o, i) => i === idx || !o.isDefault)) {
          current.defaultIndex = idx;
        }
      }
    }

    // Ensure defaultIndex consistent when multiple [x] appear:
    for (const d of dims) {
      const firstX = d.options.findIndex((o) => o.isDefault);
      d.defaultIndex = firstX >= 0 ? firstX : 0;
    }

    // Filter dimensions without options
    return dims.filter((d) => d.options.length > 0);
  }

  function renderForm(dims) {
    formEl.innerHTML = "";
    defaultsByName = new Map();

    for (const dim of dims) {
      const name = `dim_${slugify(dim.title)}_${Math.random().toString(16).slice(2)}`;
      defaultsByName.set(name, String(dim.defaultIndex));

      const fieldset = document.createElement("fieldset");
      fieldset.className = "dimension";

      const legend = document.createElement("legend");
      legend.textContent = dim.title;
      fieldset.appendChild(legend);

      dim.options.forEach((opt, idx) => {
        const id = `${name}_${idx}`;

        const label = document.createElement("label");
        label.className = "option";
        label.htmlFor = id;

        const input = document.createElement("input");
        input.type = "radio";
        input.name = name;
        input.id = id;
        input.value = String(idx);
        input.checked = idx === dim.defaultIndex;

        const span = document.createElement("span");
        span.innerHTML = escapeHtml(opt.text);

        label.appendChild(input);
        label.appendChild(span);
        fieldset.appendChild(label);
      });

      formEl.appendChild(fieldset);
    }
  }

  function getGeneratedText() {
    const lines = [];
    const fieldsets = Array.from(formEl.querySelectorAll("fieldset.dimension"));

    for (const fs of fieldsets) {
      const checked = fs.querySelector('input[type="radio"]:checked');
      if (!checked) continue;

      const label = fs.querySelector(`label.option[for="${CSS.escape(checked.id)}"] span`);
      const text = label ? label.textContent : "";
      if (text) lines.push(text);
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
    // Fallback
    outputEl.focus();
    outputEl.select();
    document.execCommand("copy");
    outputEl.setSelectionRange(0, 0);
  }

  function resetToDefaults() {
    const fieldsets = Array.from(formEl.querySelectorAll("fieldset.dimension"));
    for (const fs of fieldsets) {
      const input = fs.querySelector('input[type="radio"]');
      if (!input) continue;
      const name = input.name;
      const defaultIdx = defaultsByName.get(name);
      if (defaultIdx == null) continue;

      const toCheck = fs.querySelector(`input[type="radio"][name="${CSS.escape(name)}"][value="${CSS.escape(defaultIdx)}"]`);
      if (toCheck) toCheck.checked = true;
    }
    updateOutput();
  }

  async function init() {
    try {
      setStatus("Loading options.md…");
      const res = await fetch("options.md", { cache: "no-store" });
      if (!res.ok) throw new Error(`Failed to load options.md (${res.status})`);
      const md = await res.text();

      dimensions = parseOptionsMd(md);
      if (!dimensions.length) {
        setStatus("No dimensions/options found in options.md. Check formatting.", "error");
        return;
      }

      renderForm(dimensions);
      updateOutput();
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
