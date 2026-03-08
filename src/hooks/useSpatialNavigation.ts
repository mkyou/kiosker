import { useEffect, useCallback, useRef } from "react";

type Direction = "up" | "down" | "left" | "right";

export function useSpatialNavigation() {
    const gamepadRef = useRef<number | null>(null);
    const lastActionTime = useRef<number>(0);
    const lastRightClickTime = useRef<number>(0);
    const rightClickCount = useRef<number>(0);

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
            // If no element is focused, focus the first one
            focusableElements[0]?.focus();
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

            if (direction === "up" && dy < 0 && absDx <= absDy) {
                isValidDir = true;
            } else if (direction === "down" && dy > 0 && absDx <= absDy) {
                isValidDir = true;
            } else if (direction === "left" && dx < 0 && absDy <= absDx) {
                isValidDir = true;
            } else if (direction === "right" && dx > 0 && absDy <= absDx) {
                isValidDir = true;
            }

            if (isValidDir) {
                // Euclidean distance
                const distance = Math.sqrt(dx * dx + dy * dy);
                if (distance < minDistance) {
                    minDistance = distance;
                    bestMatch = el;
                }
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
            }
        };

        // Mouse Triple Right-Click Listener
        const handleContextMenu = (e: MouseEvent) => {
            e.preventDefault(); // Block default browser right-click menu

            const now = Date.now();
            if (now - lastRightClickTime.current > 1000) {
                // Reset counter if more than 1s passed
                rightClickCount.current = 1;
            } else {
                rightClickCount.current += 1;
            }
            lastRightClickTime.current = now;

            if (rightClickCount.current === 3) {
                // Triple right click detected!
                rightClickCount.current = 0; // reset
                import("@tauri-apps/api/core").then(({ invoke }) => {
                    invoke("kill_all_kiosks").catch(console.error);
                });
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        window.addEventListener("contextmenu", handleContextMenu);

        // Gamepad Polling Loop
        const pollGamepad = () => {
            const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
            let activePad = null;
            for (let i = 0; i < gamepads.length; i++) {
                if (gamepads[i]) {
                    activePad = gamepads[i];
                    break;
                }
            }

            if (activePad) {
                const now = Date.now();
                // Simple debounce to avoid flying through the UI (200ms)
                if (now - lastActionTime.current > 200) {
                    // D-PAD: Up(12), Down(13), Left(14), Right(15)
                    let handled = false;

                    if (activePad.buttons[12]?.pressed) { moveFocus("up"); handled = true; }
                    else if (activePad.buttons[13]?.pressed) { moveFocus("down"); handled = true; }
                    else if (activePad.buttons[14]?.pressed) { moveFocus("left"); handled = true; }
                    else if (activePad.buttons[15]?.pressed) { moveFocus("right"); handled = true; }

                    // Action button (A / Cross = button 0)
                    else if (activePad.buttons[0]?.pressed) {
                        const activeEl = document.activeElement as HTMLElement;
                        if (activeEl) activeEl.click();
                        handled = true;
                    }

                    if (handled) {
                        lastActionTime.current = now;
                    }
                }
            }

            gamepadRef.current = requestAnimationFrame(pollGamepad);
        };

        gamepadRef.current = requestAnimationFrame(pollGamepad);

        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            window.removeEventListener("contextmenu", handleContextMenu);
            if (gamepadRef.current) cancelAnimationFrame(gamepadRef.current);
        };
    }, [moveFocus]);
}

