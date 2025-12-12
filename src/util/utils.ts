
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

