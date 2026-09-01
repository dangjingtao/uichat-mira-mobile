import { resolveSessionSwipeOpen } from './sessionSwipe';

describe('resolveSessionSwipeOpen', () => {
  it('opens a closed row after the reveal threshold is crossed', () => {
    expect(resolveSessionSwipeOpen(false, 116, 160)).toBe(true);
    expect(resolveSessionSwipeOpen(false, 117, 160)).toBe(false);
  });

  it('keeps an open row open until the close threshold is crossed', () => {
    expect(resolveSessionSwipeOpen(true, 43, 160)).toBe(true);
    expect(resolveSessionSwipeOpen(true, 44, 160)).toBe(false);
  });

  it('clamps overscroll values before deciding the state', () => {
    expect(resolveSessionSwipeOpen(false, -20, 160)).toBe(true);
    expect(resolveSessionSwipeOpen(true, 999, 160)).toBe(false);
  });

  it('returns closed when there is no action width', () => {
    expect(resolveSessionSwipeOpen(true, 0, 0)).toBe(false);
  });
});
