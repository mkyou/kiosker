import { useEffect, useCallback, useRef } from "react";

type Direction = "up" | "down" | "left" | "right";

export function useSpatialNavigation() {
    const gamepadRef = useRef<number | null>(null);
    const lastActionTime = useRef<number>(0);
    const lastLeftClickTime = useRef<number>(0);
    const leftClickCount = useRef<number>(0);
    const lastClickTarget = useRef<EventTarget | null>(null);

    const moveFocus = useCallback((direction: Direction) => {
        const activeElement = document.activeElement as HTMLElement | null;
        const focusableElements = Array.from(
            document.querySelectorAll<HTMLElement>(
                '[tabindex="0"]:not([disabled]), button:not([disabled]):not([tabindex="-1"]), a[href]:not([disabled]):not([tabindex="-1"]), input:not([disabled]):not([tabindex="-1"])'
            )
        ).filter(el => {
            const rect = el.getBoundingClientRect();
            const isVisible = rect.width > 0 && rect.height > 0 && getComputedStyle(el).visibility !== "hidden";
            if (!isVisible) return false;

            // If we are currently in a menu, only allow focusing other things in the SAME menu
            if (activeElement) {
                const activeMenu = activeElement.closest('[role="menu"], .absolute.z-\\[100\\]');
                if (activeMenu) {
                    return activeMenu.contains(el);
                }
            }
            return true;
        });

        if (focusableElements.length === 0) return;

        if (!activeElement || !focusableElements.includes(activeElement)) {
            // Find the most logical first element (usually first item in grid or first menu btn)
            const firstElement = focusableElements[0];
            if (firstElement) {
                firstElement.focus();
                // After focusing, if it's not a scrollable area, we might want to move 
                // but for now, focusing is the first step.
            }
            return;
        }

        const activeRect = activeElement.getBoundingClientRect();
        const activeCenter = {
            x: activeRect.left + activeRect.width / 2,
            y: activeRect.top + activeRect.height / 2,
        };

        let bestMatch: HTMLElement | null = null;
        let minDistance = Infinity;

        for (const el of focusableElements) {
            if (el === activeElement) continue;

            const rect = el.getBoundingClientRect();
            const center = {
                x: rect.left + rect.width / 2,
                y: rect.top + rect.height / 2,
            };

            const dx = center.x - activeCenter.x;
            const dy = center.y - activeCenter.y;
            const absDx = Math.abs(dx);
            const absDy = Math.abs(dy);

            let isValidDir = false;

            if (direction === "up" && dy < 0 && absDx <= absDy * 4.0) {
                isValidDir = true;
            } else if (direction === "down" && dy > 0 && absDx <= absDy * 2.0) {
                isValidDir = true;
            } else if (direction === "left" && dx < 0 && absDy <= absDx * 2.0) {
                isValidDir = true;
            } else if (direction === "right" && dx > 0 && absDy <= absDx * 2.0) {
                isValidDir = true;
            }

            if (isValidDir) {
                // Modified distance calculation to favor staying in the same row/column
                // For UP/DOWN, horizontal distance (dx) is penalized more
                // For LEFT/RIGHT, vertical distance (dy) is penalized more
                const weightX = (direction === "up" || direction === "down") ? 2.5 : 1.0;
                const weightY = (direction === "left" || direction === "right") ? 2.5 : 1.0;
                
                const distance = Math.sqrt((dx * weightX) ** 2 + (dy * weightY) ** 2);
                
                if (distance < minDistance) {
                    minDistance = distance;
                    bestMatch = el;
                }
            }
        }
        
        // Wrap around logic: if no match in that direction, wrap within the same row/column
        if (!bestMatch) {
            const rowTolerance = activeRect.height * 0.6;
            const colTolerance = activeRect.width * 0.6;
            const activeCenterY = activeRect.top + activeRect.height / 2;
            const activeCenterX = activeRect.left + activeRect.width / 2;

            if (direction === "right") {
                const sameRow = focusableElements.filter(el => {
                    const r = el.getBoundingClientRect();
                    return Math.abs((r.top + r.height / 2) - activeCenterY) <= rowTolerance;
                });
                const pool = sameRow.length > 0 ? sameRow : focusableElements;
                bestMatch = pool.reduce((prev, curr) =>
                    curr.getBoundingClientRect().left < prev.getBoundingClientRect().left ? curr : prev
                , pool[0]);
            } else if (direction === "left") {
                const sameRow = focusableElements.filter(el => {
                    const r = el.getBoundingClientRect();
                    return Math.abs((r.top + r.height / 2) - activeCenterY) <= rowTolerance;
                });
                const pool = sameRow.length > 0 ? sameRow : focusableElements;
                bestMatch = pool.reduce((prev, curr) =>
                    curr.getBoundingClientRect().right > prev.getBoundingClientRect().right ? curr : prev
                , pool[0]);
            } else if (direction === "up") {
                bestMatch = null; // No wrap-around going up
            } else if (direction === "down") {
                const sameCol = focusableElements.filter(el => {
                    const r = el.getBoundingClientRect();
                    return Math.abs((r.left + r.width / 2) - activeCenterX) <= colTolerance;
                });
                const pool = sameCol.length > 0 ? sameCol : focusableElements;
                bestMatch = pool.reduce((prev, curr) =>
                    curr.getBoundingClientRect().top < prev.getBoundingClientRect().top ? curr : prev
                , pool[0]);
            }
        }

        if (bestMatch) {
            bestMatch.focus();
        }
    }, []);

    useEffect(() => {
        // Keyboard Listener
        const handleKeyDown = (e: KeyboardEvent) => {
            switch (e.key) {
                case "ArrowUp":
                    e.preventDefault();
                    moveFocus("up");
                    break;
                case "ArrowDown":
                    e.preventDefault();
                    moveFocus("down");
                    break;
                case "ArrowLeft":
                    e.preventDefault();
                    moveFocus("left");
                    break;
                case "ArrowRight":
                    e.preventDefault();
                    moveFocus("right");
                    break;
                case "Enter":
                    e.preventDefault();
                    if (document.activeElement instanceof HTMLElement) {
                        document.activeElement.click();
                    }
                    break;
                case "q":
                case "Q":
                    if (e.ctrlKey && e.shiftKey) {
                        e.preventDefault();
                        import("@tauri-apps/api/core").then(({ invoke }) => {
                            invoke("kill_all_kiosks").catch(console.error);
                        });
                    }
                    break;
                case "F10":
                    if (e.shiftKey) {
                        e.preventDefault();
                        // Trigger context menu on focused element
                        if (document.activeElement instanceof HTMLElement) {
                            const event = new MouseEvent("contextmenu", {
                                bubbles: true,
                                cancelable: true,
                                view: window
                            });
                            document.activeElement.dispatchEvent(event);
                        }
                    }
                    break;
            }
        };

        // Mouse Triple Left-Click Listener (same element required to avoid accidental triggers)
        const handleClick = (e: MouseEvent) => {
            if (e.button !== 0) return; // Only Left Click

            const now = Date.now();
            const sameTarget = e.target === lastClickTarget.current;

            if (now - lastLeftClickTime.current > 1000 || !sameTarget) {
                leftClickCount.current = 1;
            } else {
                leftClickCount.current += 1;
            }
            lastLeftClickTime.current = now;
            lastClickTarget.current = e.target;

            if (leftClickCount.current === 3) {
                leftClickCount.current = 0;
                import("@tauri-apps/api/core").then(({ invoke }) => {
                    invoke("kill_all_kiosks").catch(console.error);
                });
            }
        };

        const handleContextMenu = (_e: MouseEvent) => {
            // We only prevent default if we want to block the browser menu, 
            // but our MediaCard handles its own contextmenu event.
        };

        window.addEventListener("keydown", handleKeyDown);
        window.addEventListener("click", handleClick);
        window.addEventListener("contextmenu", handleContextMenu);

        // Gamepad Polling Loop
        const pollGamepad = () => {
            const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
            
            for (let i = 0; i < gamepads.length; i++) {
                const activePad = gamepads[i];
                if (!activePad) continue;
                const now = Date.now();
                // Simple debounce to avoid flying through the UI (150ms is usually sweet spot for responsiveness)
                if (now - lastActionTime.current > 150) {
                    let handled = false;
                    const threshold = 0.6;
                    const axisX = activePad.axes[0] || 0;
                    const axisY = activePad.axes[1] || 0;
                    
                    // Allow navigation from axes (often mapping for D-pad on some controllers)
                    const up = activePad.buttons[12]?.pressed || axisY < -threshold;
                    const down = activePad.buttons[13]?.pressed || axisY > threshold;
                    const left = activePad.buttons[14]?.pressed || axisX < -threshold;
                    const right = activePad.buttons[15]?.pressed || axisX > threshold;

                    if (up) { moveFocus("up"); handled = true; }
                    else if (down) { moveFocus("down"); handled = true; }
                    else if (left) { moveFocus("left"); handled = true; }
                    else if (right) { moveFocus("right"); handled = true; }

                    // Action button (A / Cross = button 0)
                    else if (activePad.buttons[0]?.pressed) {
                        const activeEl = document.activeElement as HTMLElement;
                        if (activeEl) activeEl.click();
                        handled = true;
                    }

                    // Context Menu (Y / Triangle = button 3 OR Start = button 9)
                    else if (activePad.buttons[3]?.pressed || activePad.buttons[9]?.pressed) {
                        const activeEl = document.activeElement as HTMLElement;
                        if (activeEl) {
                            // Try-catch and direct dispatch for responsiveness
                            try {
                                const event = new MouseEvent("contextmenu", {
                                    bubbles: true,
                                    cancelable: true,
                                    view: window,
                                    clientX: 0, // Signal programmatic
                                    clientY: 0
                                });
                                activeEl.dispatchEvent(event);
                            } catch (e) { console.error("Gamepad context menu error", e) }
                        }
                        handled = true;
                    }

                    if (handled) {
                        lastActionTime.current = now;
                        break; // Stop processing other gamepads for this frame if one handled it
                    }
                }
            }

            gamepadRef.current = requestAnimationFrame(pollGamepad);
        };

        gamepadRef.current = requestAnimationFrame(pollGamepad);

        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            window.removeEventListener("click", handleClick);
            window.removeEventListener("contextmenu", handleContextMenu);
            if (gamepadRef.current) cancelAnimationFrame(gamepadRef.current);
        };
    }, [moveFocus]);
}

