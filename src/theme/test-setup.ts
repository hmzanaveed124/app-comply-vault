import { vi } from "vitest";
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi
    .fn()
    .mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
});
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal("ResizeObserver", ResizeObserverMock);
Object.defineProperty(HTMLElement.prototype, "scrollTo", { value: vi.fn() });
Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
  value: vi.fn(),
});
const computedStyle = window.getComputedStyle;
window.getComputedStyle = (element) => computedStyle(element);
