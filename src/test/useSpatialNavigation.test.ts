/**
 * Tests for useSpatialNavigation hook (Gamepad / Keyboard)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useSpatialNavigation } from '../hooks/useSpatialNavigation';

describe('useSpatialNavigation – Gamepad Axes', () => {
    let mockGetGamepads: any;

    beforeEach(() => {
        vi.useFakeTimers();
        mockGetGamepads = vi.fn();
        Object.defineProperty(navigator, 'getGamepads', {
            configurable: true,
            value: mockGetGamepads,
        });
        
        // Setup DOM for focus tests
        document.body.innerHTML = `
            <div tabindex="0" id="center" style="position: absolute; left: 100px; top: 100px; width: 50px; height: 50px;"></div>
            <div tabindex="0" id="up-card" style="position: absolute; left: 100px; top: 10px; width: 50px; height: 50px;"></div>
        `;
        
        // Mock getBoundingClientRect
        const center = document.getElementById('center')!;
        const upCard = document.getElementById('up-card')!;
        
        center.getBoundingClientRect = vi.fn(() => ({ x: 100, y: 100, width: 50, height: 50, left: 100, top: 100, right: 150, bottom: 150 } as DOMRect));
        upCard.getBoundingClientRect = vi.fn(() => ({ x: 100, y: 10, width: 50, height: 50, left: 100, top: 10, right: 150, bottom: 60 } as DOMRect));

        // Mock getComputedStyle for visibility check
        vi.spyOn(window, 'getComputedStyle').mockImplementation(() => ({
            visibility: 'visible',
            display: 'block'
        } as any));
    });

    afterEach(() => {
        vi.clearAllTimers();
        vi.useRealTimers();
        document.body.innerHTML = '';
        vi.restoreAllMocks();
    });

    it('navigates UP when Y axis is completely negated (Analog stick Up)', () => {
        // Mock Pad state with Axis Y < -0.5
        mockGetGamepads.mockReturnValue([
            { buttons: [], axes: [0, -1] } // x: 0, y: -1
        ]);
        
        const center = document.getElementById('center')!;
        center.focus();
        
        // Start hook
        renderHook(() => useSpatialNavigation());
        
        // Trigger gameLoop
        vi.advanceTimersByTime(300); // More than 200ms debounce
        
        // Verify Focus moved UP (activeElement should be up-card)
        const active = document.activeElement;
        expect(active?.id).toBe('up-card');
    });
});
