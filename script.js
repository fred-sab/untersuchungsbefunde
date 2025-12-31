const rowsEl = document.getElementById("rows");
const addRowBtn = document.getElementById("addRowBtn");

function createRow(index) {
  const row = document.createElement("div");
  row.className = "row";

  const textarea = document.createElement("textarea");
  textarea.name = `text-${index}`;
  textarea.placeholder = "Enter text...";

  const deleteBtn = document.createElement("button");
  deleteBtn.className = "deleteRowBtn";
  deleteBtn.type = "button";
  deleteBtn.title = "Delete row";
  deleteBtn.setAttribute("aria-label", "Delete row");
  deleteBtn.textContent = "×";
  deleteBtn.addEventListener("click", () => row.remove());

  row.appendChild(textarea);
  row.appendChild(deleteBtn);
  return row;
}

function addRow() {
  const index = rowsEl.querySelectorAll("textarea").length + 1;
  const row = createRow(index);
  rowsEl.appendChild(row);
  row.querySelector("textarea").focus();
}

rowsEl.querySelectorAll(".row").forEach((row) => {
  const deleteBtn = row.querySelector(".deleteRowBtn");
  if (deleteBtn) {
    deleteBtn.addEventListener("click", () => row.remove());
  }
});

addRowBtn.addEventListener("click", addRow);
