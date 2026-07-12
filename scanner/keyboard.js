// Keyboard-navigation audit — checks axe can't do because they need real
// keypresses: visible focus indicators, keyboard traps, and a skip link.
// Results are returned as axe-shaped violations so scoring, the quest board
// and badges pick them up with no dashboard changes.

const MAX_TABS = 25;

/** Serialise document.activeElement, comparing focused vs blurred styles. */
function captureActiveElement() {
  const el = document.activeElement;
  if (!el || el === document.body || el === document.documentElement) return null;

  const selectorFor = (e) => {
    const tag = e.tagName.toLowerCase();
    if (e.id) return `${tag}#${e.id}`;
    const cls =
      typeof e.className === "string"
        ? e.className.trim().split(/\s+/).slice(0, 2).join(".")
        : "";
    return cls ? `${tag}.${cls}` : tag;
  };
  const indicator = (s) =>
    [s.outlineStyle, s.outlineWidth, s.outlineColor, s.boxShadow, s.borderColor, s.backgroundColor].join("|");

  const rect = el.getBoundingClientRect();
  const style = getComputedStyle(el);
  const focused = indicator(style);
  // Blur to read the resting style, then restore focus. The last input was a
  // real Tab keypress, so :focus-visible styling is retained on re-focus.
  el.blur();
  const blurred = indicator(getComputedStyle(el));
  el.focus();

  return {
    selector: selectorFor(el),
    html: (el.outerHTML || "").slice(0, 200),
    href: el.getAttribute ? el.getAttribute("href") || "" : "",
    text: (el.textContent || "").trim().slice(0, 60),
    visibleIndicator: focused !== blurred,
    onScreen: rect.width > 0 && rect.height > 0 && style.visibility !== "hidden",
  };
}

function violation({ id, impact, wcagTags, description, help, helpUrl, nodes }) {
  return { id, impact, wcagTags, description, help, helpUrl, nodes };
}

/**
 * Tab through the page and return keyboard violations:
 *   keyboard-focus-visible  — focusable elements with no visible focus style
 *   keyboard-trap           — focus stuck on one element
 *   keyboard-skip-link      — no skip-to-content link at the top of tab order
 */
export async function auditKeyboard(page) {
  await page.evaluate(() => {
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    window.scrollTo(0, 0);
  });

  const stops = [];
  let trapped = null;
  let repeats = 0;
  for (let i = 0; i < MAX_TABS; i++) {
    await page.keyboard.press("Tab");
    const stop = await page.evaluate(captureActiveElement);
    if (!stop) break; // focus returned to <body> — end of the tab order

    const prev = stops[stops.length - 1];
    if (prev && stop.selector === prev.selector) {
      if (++repeats >= 3) {
        trapped = stop;
        break;
      }
    } else {
      repeats = 0;
      stops.push(stop);
    }
  }

  const violations = [];

  const invisible = stops.filter((s) => s.onScreen && !s.visibleIndicator);
  if (invisible.length) {
    violations.push(
      violation({
        id: "keyboard-focus-visible",
        impact: "serious",
        wcagTags: ["wcag2aa", "wcag247"],
        description:
          "Ensure every keyboard-focusable element shows a visible focus indicator",
        help: "Focusable elements must have a visible focus indicator",
        helpUrl: "https://www.w3.org/WAI/WCAG21/Understanding/focus-visible.html",
        nodes: invisible.map((s) => ({
          selector: s.selector,
          html: s.html,
          failureSummary:
            "Fix any of the following:\n  Element receives keyboard focus but its styles do not change (no outline, box-shadow, border or background difference)",
        })),
      })
    );
  }

  if (trapped) {
    violations.push(
      violation({
        id: "keyboard-trap",
        impact: "critical",
        wcagTags: ["wcag2a", "wcag212"],
        description: "Ensure keyboard focus is never trapped on a single element",
        help: "Keyboard focus must not be trapped",
        helpUrl: "https://www.w3.org/WAI/WCAG21/Understanding/no-keyboard-trap.html",
        nodes: [
          {
            selector: trapped.selector,
            html: trapped.html,
            failureSummary:
              "Fix the following:\n  Pressing Tab repeatedly leaves focus on this element — keyboard users cannot move past it",
          },
        ],
      })
    );
  }

  const first = stops[0];
  const hasSkipLink =
    first && first.href.startsWith("#") && /skip|main|content/i.test(first.text);
  if (stops.length > 0 && !hasSkipLink) {
    violations.push(
      violation({
        id: "keyboard-skip-link",
        impact: "moderate",
        wcagTags: ["best-practice", "wcag241"],
        description:
          "Ensure the first tab stop is a skip link so keyboard users can bypass repeated navigation",
        help: "Page should start with a skip-to-content link",
        helpUrl: "https://www.w3.org/WAI/WCAG21/Understanding/bypass-blocks.html",
        nodes: [
          {
            selector: first ? first.selector : "body",
            html: first ? first.html : "",
            failureSummary:
              "Fix the following:\n  The first Tab press lands here instead of on a 'Skip to content' link",
          },
        ],
      })
    );
  }

  return violations;
}
