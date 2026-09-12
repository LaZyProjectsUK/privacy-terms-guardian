const HIGHLIGHT_CLASS = "privacy-guardian-highlight";

/**
 * Finds the text node containing `clause` (or its first ~80 chars, since
 * AI-quoted clauses can be trimmed) and wraps it in a highlight span.
 */
export function highlightClause(clause: string): boolean {
  const needle = clause.slice(0, 80).trim();
  if (!needle) return false;

  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let node: Node | null;
  while ((node = walker.nextNode())) {
    const text = node.textContent ?? "";
    const index = text.indexOf(needle);
    if (index === -1) continue;

    const range = document.createRange();
    range.setStart(node, index);
    range.setEnd(node, Math.min(index + needle.length, text.length));

    const mark = document.createElement("mark");
    mark.className = HIGHLIGHT_CLASS;
    mark.style.backgroundColor = "#ffe08a";
    range.surroundContents(mark);
    mark.scrollIntoView({ behavior: "smooth", block: "center" });
    return true;
  }
  return false;
}

export function clearHighlights(): void {
  document.querySelectorAll(`.${HIGHLIGHT_CLASS}`).forEach((el) => {
    const parent = el.parentNode;
    if (!parent) return;
    while (el.firstChild) parent.insertBefore(el.firstChild, el);
    parent.removeChild(el);
  });
}
