const rowsEl = document.getElementById("rows");
const addRowBtn = document.getElementById("addRowBtn");
const combinedTextEl = document.getElementById("combinedText");

function getRowElements() {
  return Array.from(rowsEl.querySelectorAll(".row"));
}

function getRowFromChild(el) {
  return el?.closest?.(".row") ?? null;
}

function getTextareaInRow(row) {
  return row?.querySelector?.("textarea") ?? null;
}

function getIncludeCheckboxInRow(row) {
  return row?.querySelector?.(".includeCheckbox") ?? null;
}

function updateCombinedText() {
  if (!combinedTextEl) return;

  const values = getRowElements()
    .filter((row) => {
      const include = getIncludeCheckboxInRow(row);
      return !include || include.checked; // if missing, treat as included
    })
    .map((row) => getTextareaInRow(row)?.value?.trim() ?? "")
    .filter(Boolean);

  combinedTextEl.value = values.join("\n");
}

function wireRow(row) {
  const textarea = getTextareaInRow(row);
  const include = getIncludeCheckboxInRow(row);
  const deleteBtn = row.querySelector(".deleteRowBtn");

  if (textarea) textarea.addEventListener("input", updateCombinedText);
  if (include) include.addEventListener("change", updateCombinedText);

  if (deleteBtn) {
    deleteBtn.addEventListener("click", () => {
      row.remove();
      updateCombinedText();
    });
  }
}

function createRow(index) {
  const row = document.createElement("div");
  row.className = "row";

  const includeLabel = document.createElement("label");
  includeLabel.className = "includeToggle";
  includeLabel.title = "Include this row in Combined (Ctrl/⌘+I)";

  const includeCheckbox = document.createElement("input");
  includeCheckbox.className = "includeCheckbox";
  includeCheckbox.type = "checkbox";
  includeCheckbox.checked = true;

  includeLabel.appendChild(includeCheckbox);
  includeLabel.appendChild(document.createTextNode("Include"));

  const textarea = document.createElement("textarea");
  textarea.name = `text-${index}`;
  textarea.placeholder = "Enter text...";

  const deleteBtn = document.createElement("button");
  deleteBtn.className = "deleteRowBtn";
  deleteBtn.type = "button";
  deleteBtn.title = "Delete row";
  deleteBtn.setAttribute("aria-label", "Delete row");
  deleteBtn.textContent = "×";

  row.appendChild(includeLabel);
  row.appendChild(textarea);
  row.appendChild(deleteBtn);

  wireRow(row);
  return row;
}

function addRow({ focus = true } = {}) {
  const index = rowsEl.querySelectorAll("textarea").length + 1;
  const row = createRow(index);
  rowsEl.appendChild(row);
  if (focus) row.querySelector("textarea")?.focus();
  updateCombinedText();
}

function focusRowByDelta(currentRow, delta) {
  const rows = getRowElements();
  const i = rows.indexOf(currentRow);
  if (i === -1) return;

  const next = rows[i + delta];
  if (!next) return;

  getTextareaInRow(next)?.focus();
}

// Initial wiring for existing rows
getRowElements().forEach(wireRow);

addRowBtn.addEventListener("click", () => addRow());

// Keyboard shortcuts (work when focus is inside a row textarea or include checkbox)
document.addEventListener("keydown", (e) => {
  const isMac = navigator.platform.toLowerCase().includes("mac");
  const mod = isMac ? e.metaKey : e.ctrlKey;

  if (!mod) return;
  const active = document.activeElement;
  const row = getRowFromChild(active);
  if (!row) return;

  // ⌘/Ctrl+I toggles include for current row
  if (e.key.toLowerCase() === "i") {
    e.preventDefault();
    const include = getIncludeCheckboxInRow(row);
    if (include) {
      include.checked = !include.checked;
      updateCombinedText();
    }
    return;
  }

  // ⌘/Ctrl+Enter adds a new row
  if (e.key === "Enter") {
    e.preventDefault();
    addRow({ focus: true });
    return;
  }

  // ⌘/Ctrl+ArrowUp/ArrowDown navigates rows
  if (e.key === "ArrowUp") {
    e.preventDefault();
    focusRowByDelta(row, -1);
    return;
  }

  if (e.key === "ArrowDown") {
    e.preventDefault();
    focusRowByDelta(row, +1);
    return;
  }
});

updateCombinedText();
