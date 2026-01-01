# Untersuchungsbefunde

This is a UI tool to help doctors for reporting the findings of their examinations.
It allows to easily generate a text by selecting minimally problems noticed.

It relies on the file `options.md` for content.

## options.md format

`options.md` is a Markdown list describing **dimensions** (sections) and their **choices**.

Example:

```md
- Klopfschmerz
	- [x] Kein Klopfschmerz über NNH.
	- [ ] Klopfschmerz rechts frontalis.
	- [ ] Klopfschmerz links frontalis.
	- [ ] Klopfschmerz rechts maxillaris.
	- [ ] Klopfschmerz links maxillaris.
```

Rules:

- A **dimension** is a top-level `- Title` list item (no checkbox).
- Each dimension contains indented list items with checkboxes `- [x] text` or `- [ ] text`.
- Exactly one option per dimension should be marked as default via `[x]`.
  - If none is marked, the first option is treated as default.
  - If multiple are marked, the first `[x]` is treated as default.
- Option text is the exact string after the checkbox, trimmed.

## Web UI behavior

The web page must:

1. Load `options.md` (same directory as the web page, fetched via HTTP).
2. Parse it into dimensions and options following the rules above.
3. Render a form:
   - Each dimension is shown with its title.
   - Under each title, show the options as a single-choice group (radio buttons).
   - The default (`[x]`) is pre-selected on first load.
4. Provide live output generation:
   - Concatenate the currently selected option text from each dimension (in file order).
   - Join with line breaks (one finding per line).
   - Show this generated text in a read-only `<textarea>` (or similar).
5. Provide copy/reset helpers:
   - “Copy” button copies the generated text to clipboard.
   - “Reset” button restores all selections back to defaults.

Notes:

- The intention is to keep “normal findings” as defaults and only change items where a problem was noticed.
- The generated text should update immediately when any selection changes.
