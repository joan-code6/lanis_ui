/** Let Radix dismiss its topmost layer before Android navigates away. */
export function dismissInputPopup(): boolean {
  if (!document.querySelector('[data-input-popup]')) return false;
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  return true;
}
