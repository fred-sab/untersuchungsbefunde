# Untersuchungsbefunde

This is a UI tool to help doctors for reporting the findings of their examinations.
It allows to easily generate a text by selecting minimally problems noticed.

It relies on the file `options.md` for content.

It is deployed at https://fred-sab.github.io/untersuchungsbefunde.

## options.md format

`options.md` is Markdown content describing **Sections** (via headings), containing **Dimensions** (top-level list items), containing **Options** (checkbox list items).

### Structure

- A **Section** starts at a Markdown heading (`## ...`, `### ...`, etc.).
  - Each heading becomes one tab in the UI.
- A **Dimension** is a top-level list item *without* a checkbox: `- Title`
- An **Option** is an indented list item *with* a checkbox:
  - `- [x] text` marks the **default** option for the dimension
  - `- [ ] text` marks a non-default option

### Option text: `display#output` (optional)

Option text can optionally contain a `#` to separate:

- `displayText#outputText`

Meaning:

- `displayText` is what the UI shows next to the checkbox
- `outputText` is what is emitted into the generated report

If there is no `#`, the same text is used for display and output.

Example:

```md
- Sekret
  - [x] Oropharynx unauffällig.
  - [ ] Rachensekret#Sekretstrasse im Oropharynx.
```

### Defaults

- Exactly one option per dimension *should* be marked as default via `[x]`.
  - If none is marked, the first option is treated as default.
  - If multiple are marked, the first `[x]` is treated as default.

### Minimal example (with sections)

```md
### Lunge
- Atmungsfrequenz
  - [x] AF im normalen Bereich.
  - [ ] AF erhöht.

### Ohren
- Gehörgang
  - [x] Gehörgänge reizlos, frei.
  - [ ] Gehörgang durch Cerumen verlegt.
```

## Web UI behavior

The web page:

1. Loads `options.md` (same directory as the web page, fetched via HTTP).
2. Splits it into **sections** by Markdown headings and renders one **tab** per section.
3. For the currently active tab:
   - Renders each **dimension**.
   - Shows **only the non-default options** as checkboxes (the default is implicit).
4. Generated text rules (in file order):
   - If you check one or more options in a dimension, **all checked options** are included (one line per checked option).
   - If you check nothing in a dimension, the **default option’s outputText** is included.
   - If a dimension has *no non-default options* (i.e. only a single default), its default line is **always included** and the dimension is not shown as selectable UI.
5. Output formatting:
   - The generated text is the selected lines joined with `\n` (one finding per line).
6. Buttons:
   - **Copy** copies the generated text to clipboard.
   - **Reset** clears all checkboxes (returns to defaults everywhere).

Notes:

- The intention is to keep “normal findings” as defaults and only click deviations/problems.
- Switching tabs changes which dimensions you can edit; the generated text reflects the active section.
