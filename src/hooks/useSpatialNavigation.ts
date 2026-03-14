import { useEffect, useCallback, useRef } from "react";

type Direction = "up" | "down" | "left" | "right";

export function useSpatialNavigation() {
    const gamepadRef = useRef<number | null>(null);
    const lastActionTime = useRef<number>(0);
    const lastLeftClickTime = useRef<number>(0);
    const leftClickCount = useRef<number>(0);
    const gamepadComboCount = useRef<number>(0);
    const lastGamepadComboTime = useRef<number>(0);

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
        
        // Wrap around logic: if no match in that direction, try to wrap to the other side
        if (!bestMatch) {
            if (direction === "right") {
                // Find element furthest to the left
                bestMatch = focusableElements.reduce((prev, curr) => 
                    curr.getBoundingClientRect().left < prev.getBoundingClientRect().left ? curr : prev
                , focusableElements[0]);
            } else if (direction === "left") {
                // Find element furthest to the right
                bestMatch = focusableElements.reduce((prev, curr) => 
                    curr.getBoundingClientRect().right > prev.getBoundingClientRect().right ? curr : prev
                , focusableElements[0]);
            } else if (direction === "up") {
                // User preferred NO wrap-around for UP (stay at top/header)
                // But we can try to find the actual top-most element if we were somehow stuck
                bestMatch = null; 
            } else if (direction === "down") {
                // Wrap around to the top
                bestMatch = focusableElements.reduce((prev, curr) => 
                    curr.getBoundingClientRect().top < prev.getBoundingClientRect().top ? curr : prev
                , focusableElements[0]);
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

        // Mouse Triple Left-Click Listener (Fallback/Local)
        const handleClick = (e: MouseEvent) => {
            if (e.button !== 0) return; // Only Left Click
            
            const now = Date.now();
            if (now - lastLeftClickTime.current > 1000) {
                leftClickCount.current = 1;
            } else {
                leftClickCount.current += 1;
            }
            lastLeftClickTime.current = now;

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

                    // L3 (10) + R3 (11) combo for Exit - 3x fast
                    else if (activePad.buttons[10]?.pressed && activePad.buttons[11]?.pressed) {
                        const nowCombo = Date.now();
                        if (nowCombo - lastGamepadComboTime.current > 1000) {
                            gamepadComboCount.current = 1;
                        } else {
                            gamepadComboCount.current += 1;
                        }
                        lastGamepadComboTime.current = nowCombo;

                        if (gamepadComboCount.current >= 3) {
                            gamepadComboCount.current = 0;
                            import("@tauri-apps/api/core").then(({ invoke }) => {
                                invoke("kill_all_kiosks").catch(console.error);
                            });
                        }
                        handled = true;
                    }

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

