/**
 * Tests for useSpatialNavigation hook (Keyboard / Mouse / Gamepad)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useSpatialNavigation } from '../hooks/useSpatialNavigation';
import { invoke } from '@tauri-apps/api/core';

const mockInvoke = vi.mocked(invoke);

// jsdom throws when MouseEvent is constructed with `view: window`.
// Patch the constructor globally so the hook's contextmenu dispatch works.
const _OrigMouseEvent = global.MouseEvent;
global.MouseEvent = class extends _OrigMouseEvent {
    constructor(type: string, init?: MouseEventInit) {
        const { view: _ignored, ...rest } = (init ?? {}) as MouseEventInit;
        super(type, rest);
    }
} as unknown as typeof MouseEvent;

// ─── Helpers ──────────────────────────────────────────────────────────────────

interface ElemDef {
    id: string; left: number; top: number; width?: number; height?: number; attrs?: string;
}

function setupDOM(elements: ElemDef[]) {
    document.body.innerHTML = elements
        .map(({ id, left, top, width = 50, height = 50, attrs = '' }) =>
            `<div tabindex="0" id="${id}" ${attrs} style="position:absolute;left:${left}px;top:${top}px;width:${width}px;height:${height}px;"></div>`)
        .join('');

    elements.forEach(({ id, left, top, width = 50, height = 50 }) => {
        const el = document.getElementById(id)!;
        el.getBoundingClientRect = vi.fn(() => ({
            left, top, right: left + width, bottom: top + height,
            width, height, x: left, y: top,
        } as DOMRect));
    });

    vi.spyOn(window, 'getComputedStyle').mockReturnValue({ visibility: 'visible', display: 'block' } as any);
}

function pressKey(key: string, opts: KeyboardEventInit = {}) {
    window.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...opts }));
}

function makePad(overrides: { buttons?: boolean[]; axes?: number[] } = {}) {
    const btns = (overrides.buttons ?? Array(16).fill(false))
        .map(p => ({ pressed: p, touched: false, value: p ? 1 : 0 }));
    return { buttons: btns, axes: overrides.axes ?? [0, 0, 0, 0] };
}

// ─── Existing: Gamepad Axes ───────────────────────────────────────────────────

describe('useSpatialNavigation – Gamepad Axes', () => {
    let mockGetGamepads: any;

    beforeEach(() => {
        vi.useFakeTimers();
        mockGetGamepads = vi.fn();
        Object.defineProperty(navigator, 'getGamepads', {
            configurable: true,
            value: mockGetGamepads,
        });

        document.body.innerHTML = `
            <div tabindex="0" id="center" style="position: absolute; left: 100px; top: 100px; width: 50px; height: 50px;"></div>
            <div tabindex="0" id="up-card" style="position: absolute; left: 100px; top: 10px; width: 50px; height: 50px;"></div>
        `;

        const center = document.getElementById('center')!;
        const upCard = document.getElementById('up-card')!;

        center.getBoundingClientRect = vi.fn(() => ({ x: 100, y: 100, width: 50, height: 50, left: 100, top: 100, right: 150, bottom: 150 } as DOMRect));
        upCard.getBoundingClientRect = vi.fn(() => ({ x: 100, y: 10, width: 50, height: 50, left: 100, top: 10, right: 150, bottom: 60 } as DOMRect));

        vi.spyOn(window, 'getComputedStyle').mockImplementation(() => ({
            visibility: 'visible',
            display: 'block',
        } as any));
    });

    afterEach(() => {
        vi.clearAllTimers();
        vi.useRealTimers();
        document.body.innerHTML = '';
        vi.restoreAllMocks();
    });

    it('navigates UP when Y axis is completely negated (Analog stick Up)', () => {
        mockGetGamepads.mockReturnValue([{ buttons: [], axes: [0, -1] }]);
        document.getElementById('center')!.focus();
        renderHook(() => useSpatialNavigation());
        vi.advanceTimersByTime(300);
        expect(document.activeElement?.id).toBe('up-card');
    });
});

// ─── Keyboard: Directional Navigation ────────────────────────────────────────

describe('useSpatialNavigation – Keyboard Directional Navigation', () => {
    beforeEach(() => {
        Object.defineProperty(navigator, 'getGamepads', { configurable: true, value: vi.fn().mockReturnValue([]) });
        setupDOM([
            { id: 'center',     left: 100, top: 100 },
            { id: 'right-card', left: 200, top: 100 },
            { id: 'left-card',  left: 10,  top: 100 },
            { id: 'up-card',    left: 100, top: 10  },
            { id: 'down-card',  left: 100, top: 200 },
        ]);
    });

    afterEach(() => {
        document.body.innerHTML = '';
        vi.restoreAllMocks();
    });

    it('ArrowRight moves focus to the element on the right', () => {
        document.getElementById('center')!.focus();
        renderHook(() => useSpatialNavigation());
        pressKey('ArrowRight');
        expect(document.activeElement?.id).toBe('right-card');
    });

    it('ArrowLeft moves focus to the element on the left', () => {
        document.getElementById('center')!.focus();
        renderHook(() => useSpatialNavigation());
        pressKey('ArrowLeft');
        expect(document.activeElement?.id).toBe('left-card');
    });

    it('ArrowDown moves focus to the element below', () => {
        document.getElementById('center')!.focus();
        renderHook(() => useSpatialNavigation());
        pressKey('ArrowDown');
        expect(document.activeElement?.id).toBe('down-card');
    });

    it('ArrowUp moves focus to the element above', () => {
        document.getElementById('center')!.focus();
        renderHook(() => useSpatialNavigation());
        pressKey('ArrowUp');
        expect(document.activeElement?.id).toBe('up-card');
    });

    it('Enter fires .click() on the focused element', () => {
        const center = document.getElementById('center')!;
        const clickSpy = vi.fn();
        center.addEventListener('click', clickSpy);
        center.focus();
        renderHook(() => useSpatialNavigation());
        pressKey('Enter');
        expect(clickSpy).toHaveBeenCalled();
    });

    it('Ctrl+Shift+Q invokes kill_all_kiosks', async () => {
        renderHook(() => useSpatialNavigation());
        pressKey('Q', { ctrlKey: true, shiftKey: true });
        await waitFor(() => {
            expect(mockInvoke).toHaveBeenCalledWith('kill_all_kiosks');
        });
    });

    it('Shift+F10 dispatches contextmenu event on the focused element', () => {
        const center = document.getElementById('center')!;
        center.focus();
        renderHook(() => useSpatialNavigation());
        const ctxSpy = vi.fn();
        center.addEventListener('contextmenu', ctxSpy);
        pressKey('F10', { shiftKey: true });
        expect(ctxSpy).toHaveBeenCalled();
    });
});

// ─── Mouse Triple-Click ───────────────────────────────────────────────────────

describe('useSpatialNavigation – Mouse Triple-Click', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        Object.defineProperty(navigator, 'getGamepads', { configurable: true, value: vi.fn().mockReturnValue([]) });
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.clearAllTimers();
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it('three left-clicks on the same target within 1000ms invoke kill_all_kiosks', async () => {
        renderHook(() => useSpatialNavigation());
        vi.setSystemTime(0);
        window.dispatchEvent(new MouseEvent('click', { button: 0 }));
        vi.setSystemTime(500);
        window.dispatchEvent(new MouseEvent('click', { button: 0 }));
        vi.setSystemTime(900);
        window.dispatchEvent(new MouseEvent('click', { button: 0 }));
        // Switch to real timers so the dynamic import Promise chain can resolve.
        vi.useRealTimers();
        await new Promise<void>(resolve => setTimeout(resolve, 0));
        expect(mockInvoke).toHaveBeenCalledWith('kill_all_kiosks');
    });

    it('three clicks on different elements do NOT invoke kill_all_kiosks', () => {
        renderHook(() => useSpatialNavigation());
        const divA = document.createElement('div');
        const divB = document.createElement('div');
        const divC = document.createElement('div');
        document.body.append(divA, divB, divC);
        vi.setSystemTime(0);
        divA.dispatchEvent(new MouseEvent('click', { button: 0, bubbles: true }));
        vi.setSystemTime(200);
        divB.dispatchEvent(new MouseEvent('click', { button: 0, bubbles: true }));
        vi.setSystemTime(400);
        divC.dispatchEvent(new MouseEvent('click', { button: 0, bubbles: true }));
        expect(mockInvoke).not.toHaveBeenCalledWith('kill_all_kiosks');
    });

    it('third click after >1000ms from previous resets count and does NOT invoke kill_all_kiosks', () => {
        renderHook(() => useSpatialNavigation());
        vi.setSystemTime(0);
        window.dispatchEvent(new MouseEvent('click', { button: 0 }));
        vi.setSystemTime(500);
        window.dispatchEvent(new MouseEvent('click', { button: 0 }));
        vi.setSystemTime(1700); // 1200ms after last click → resets count to 1
        window.dispatchEvent(new MouseEvent('click', { button: 0 }));
        expect(mockInvoke).not.toHaveBeenCalledWith('kill_all_kiosks');
    });
});

// ─── Wrap-around ─────────────────────────────────────────────────────────────

describe('useSpatialNavigation – Wrap-around', () => {
    beforeEach(() => {
        Object.defineProperty(navigator, 'getGamepads', { configurable: true, value: vi.fn().mockReturnValue([]) });
        setupDOM([
            { id: 'left-card',  left: 10,  top: 100 },
            { id: 'right-card', left: 300, top: 100 },
            { id: 'top-card',   left: 100, top: 10  },
            { id: 'bot-card',   left: 100, top: 300 },
        ]);
    });

    afterEach(() => {
        document.body.innerHTML = '';
        vi.restoreAllMocks();
    });

    it('ArrowRight on the rightmost element wraps focus to the leftmost element', () => {
        document.getElementById('right-card')!.focus();
        renderHook(() => useSpatialNavigation());
        pressKey('ArrowRight');
        expect(document.activeElement?.id).toBe('left-card');
    });

    it('ArrowLeft on the leftmost element wraps focus to the rightmost element', () => {
        document.getElementById('left-card')!.focus();
        renderHook(() => useSpatialNavigation());
        pressKey('ArrowLeft');
        expect(document.activeElement?.id).toBe('right-card');
    });

    it('ArrowDown on the bottommost element wraps focus to the topmost element', () => {
        document.getElementById('bot-card')!.focus();
        renderHook(() => useSpatialNavigation());
        pressKey('ArrowDown');
        expect(document.activeElement?.id).toBe('top-card');
    });

    it('ArrowRight on last grid item wraps to first of same row, skipping the toolbar', () => {
        setupDOM([
            { id: 'toolbar-btn', left: 10,  top: 10,  width: 50, height: 30 },
            { id: 'grid-a',      left: 10,  top: 200, width: 50, height: 50 },
            { id: 'grid-b',      left: 200, top: 200, width: 50, height: 50 },
            { id: 'grid-c',      left: 400, top: 200, width: 50, height: 50 },
        ]);
        document.getElementById('grid-c')!.focus();
        renderHook(() => useSpatialNavigation());
        pressKey('ArrowRight');
        expect(document.activeElement?.id).toBe('grid-a');
    });

    it('ArrowLeft on first grid item wraps to last of same row, skipping the toolbar', () => {
        setupDOM([
            { id: 'toolbar-btn', left: 10,  top: 10,  width: 50, height: 30 },
            { id: 'grid-a',      left: 10,  top: 200, width: 50, height: 50 },
            { id: 'grid-b',      left: 200, top: 200, width: 50, height: 50 },
            { id: 'grid-c',      left: 400, top: 200, width: 50, height: 50 },
        ]);
        document.getElementById('grid-a')!.focus();
        renderHook(() => useSpatialNavigation());
        pressKey('ArrowLeft');
        expect(document.activeElement?.id).toBe('grid-c');
    });

    it('ArrowDown on last row item wraps to same column in first row, skipping other columns', () => {
        setupDOM([
            { id: 'col-a-top', left: 10,  top: 10,  width: 50, height: 50 },
            { id: 'col-b-top', left: 200, top: 10,  width: 50, height: 50 },
            { id: 'col-a-bot', left: 10,  top: 200, width: 50, height: 50 },
            { id: 'col-b-bot', left: 200, top: 200, width: 50, height: 50 },
        ]);
        document.getElementById('col-b-bot')!.focus();
        renderHook(() => useSpatialNavigation());
        pressKey('ArrowDown');
        expect(document.activeElement?.id).toBe('col-b-top');
    });

    it('ArrowUp on the topmost element does NOT move focus (no up wrap)', () => {
        const topCard = document.getElementById('top-card')!;
        topCard.focus();
        renderHook(() => useSpatialNavigation());
        pressKey('ArrowUp');
        expect(document.activeElement?.id).toBe('top-card');
    });
});

// ─── Edge Cases ───────────────────────────────────────────────────────────────

describe('useSpatialNavigation – Edge Cases', () => {
    beforeEach(() => {
        Object.defineProperty(navigator, 'getGamepads', { configurable: true, value: vi.fn().mockReturnValue([]) });
        setupDOM([
            { id: 'first',  left: 10,  top: 100 },
            { id: 'second', left: 200, top: 100 },
        ]);
    });

    afterEach(() => {
        document.body.innerHTML = '';
        vi.restoreAllMocks();
    });

    it('first arrow press focuses the first focusable element when nothing is focused', () => {
        // document.activeElement is document.body (not in focusable list)
        renderHook(() => useSpatialNavigation());
        pressKey('ArrowRight');
        expect(document.activeElement?.id).toBe('first');
    });

    it('navigation is confined to elements within the active [role="menu"]', () => {
        document.body.innerHTML = `
            <div role="menu">
                <div tabindex="0" id="menu-a" style="position:absolute;left:10px;top:100px;width:50px;height:50px;"></div>
                <div tabindex="0" id="menu-b" style="position:absolute;left:100px;top:100px;width:50px;height:50px;"></div>
            </div>
            <div tabindex="0" id="outside" style="position:absolute;left:200px;top:100px;width:50px;height:50px;"></div>
        `;
        (['menu-a', 'menu-b', 'outside'] as const).forEach(id => {
            const el = document.getElementById(id)!;
            const left = id === 'menu-a' ? 10 : id === 'menu-b' ? 100 : 200;
            el.getBoundingClientRect = vi.fn(() => ({
                left, top: 100, right: left + 50, bottom: 150, width: 50, height: 50, x: left, y: 100,
            } as DOMRect));
        });

        document.getElementById('menu-a')!.focus();
        renderHook(() => useSpatialNavigation());
        pressKey('ArrowRight');

        // Should focus menu-b (inside menu), NOT outside
        expect(document.activeElement?.id).toBe('menu-b');
    });

    it('cleanup removes event listeners and cancels animation frame on unmount', () => {
        const removeSpy = vi.spyOn(window, 'removeEventListener');
        const cancelSpy = vi.spyOn(window, 'cancelAnimationFrame');
        const { unmount } = renderHook(() => useSpatialNavigation());
        unmount();
        expect(removeSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
        expect(removeSpy).toHaveBeenCalledWith('click', expect.any(Function));
        expect(cancelSpy).toHaveBeenCalled();
    });
});

// ─── Gamepad: Button Actions ──────────────────────────────────────────────────

describe('useSpatialNavigation – Gamepad Button Actions', () => {
    let mockGetGamepads: any;

    beforeEach(() => {
        vi.useFakeTimers();
        mockGetGamepads = vi.fn();
        Object.defineProperty(navigator, 'getGamepads', { configurable: true, value: mockGetGamepads });
        setupDOM([
            { id: 'center',     left: 100, top: 100 },
            { id: 'right-card', left: 200, top: 100 },
        ]);
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.clearAllTimers();
        vi.useRealTimers();
        document.body.innerHTML = '';
        vi.restoreAllMocks();
    });

    it('button 0 (A/Cross) fires click on the focused element', () => {
        const center = document.getElementById('center')!;
        const clickSpy = vi.fn();
        center.addEventListener('click', clickSpy);
        center.focus();
        mockGetGamepads.mockReturnValue([makePad({ buttons: Array(16).fill(false).map((_, i) => i === 0) })]);
        vi.setSystemTime(200);
        renderHook(() => useSpatialNavigation());
        vi.advanceTimersByTime(200);
        expect(clickSpy).toHaveBeenCalled();
    });

    it('button 3 (Y/Triangle) dispatches contextmenu on the focused element', () => {
        const center = document.getElementById('center')!;
        center.focus();
        const ctxSpy = vi.fn();
        center.addEventListener('contextmenu', ctxSpy);
        mockGetGamepads.mockReturnValue([makePad({ buttons: Array(16).fill(false).map((_, i) => i === 3) })]);
        vi.setSystemTime(200);
        renderHook(() => useSpatialNavigation());
        vi.advanceTimersByTime(200);
        expect(ctxSpy).toHaveBeenCalled();
    });

    it('second gamepad action within the 150ms debounce window is ignored', () => {
        const center = document.getElementById('center')!;
        center.focus();
        mockGetGamepads.mockReturnValue([makePad({ axes: [1, 0] })]);
        vi.setSystemTime(200);
        renderHook(() => useSpatialNavigation());
        // First rAF fires (≥16ms), action fires (now−0 > 150ms debounce).
        vi.advanceTimersByTime(50);
        expect(document.activeElement?.id).toBe('right-card');
        // 80ms more (total 130ms advance). lastActionTime was set on first action;
        // 130ms total advance keeps us well below the 150ms debounce window.
        vi.advanceTimersByTime(80);
        expect(document.activeElement?.id).toBe('right-card');
    });
});
