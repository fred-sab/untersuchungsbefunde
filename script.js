(() => {
  /** @typedef {{ displayText: string, outputText: string, isDefault: boolean }} Option */
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

        // Split on # to get displayText and outputText
        // If # is present, text before # is for display, text after # is for output
        // If no #, or if either part is empty, use the original text for both
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

        const idx = current.options.length;
        current.options.push({ displayText, outputText, isDefault });

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
      // Store the default outputText (not shown in UI) for output generation.
      defaultsByName.set(name, dim.options[dim.defaultIndex]?.outputText || "");

      const fieldset = document.createElement("fieldset");
      fieldset.className = "dimension";
      fieldset.dataset.name = name;

      const legend = document.createElement("legend");
      legend.textContent = dim.title;
      fieldset.appendChild(legend);

      // Only render problem options (non-default) as checkboxes.
      dim.options.forEach((opt, idx) => {
        if (idx === dim.defaultIndex) return; // hide default option in UI

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
        // Store outputText on the input element for later retrieval
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
    const fieldsets = Array.from(formEl.querySelectorAll("fieldset.dimension"));

    for (const fs of fieldsets) {
      const name = fs.dataset.name || "";
      const checked = Array.from(fs.querySelectorAll('input[type="checkbox"]:checked'));

      if (checked.length > 0) {
        for (const cb of checked) {
          // Get the outputText from the input element's dataset
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
    // Fallback
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
