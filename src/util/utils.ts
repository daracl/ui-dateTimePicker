
export function escapeHtml(value: unknown): string {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[char]!));
}

export function closestElement(el: HTMLElement, checkElement: Element) {
  let currentEl: HTMLElement | null = el;
  while (currentEl) {
    if (currentEl == checkElement) {
      return true;
    }

    currentEl = currentEl.parentElement;
  }

  return false;
}

