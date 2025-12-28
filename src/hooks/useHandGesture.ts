// src/hooks/useHandGesture.ts
/**
 * Detects hand-based button press (pinching on a UI element)
 * Returns true if hand is pinching over the button area
 */
export function useHandGesture(
  cursorX: number,
  cursorY: number,
  isPinching: boolean,
  elementRect: DOMRect | null
): boolean {
  if (!elementRect || !isPinching) return false;

  const isOver =
    cursorX >= elementRect.left &&
    cursorX <= elementRect.right &&
    cursorY >= elementRect.top &&
    cursorY <= elementRect.bottom;

  return isOver;
}
