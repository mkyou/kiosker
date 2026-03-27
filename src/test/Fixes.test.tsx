import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useSpatialNavigation } from "../hooks/useSpatialNavigation";
import { TranslationProvider } from "../hooks/useTranslation";
import { AddEntryForm } from "../components/AddEntryForm";
import { Toolbar } from "../components/Toolbar";
// Mock Tauri invoke globally
vi.mock("@tauri-apps/api/core", () => ({
    invoke: vi.fn(),
}));

import { invoke } from "@tauri-apps/api/core";
const mockInvoke = vi.mocked(invoke);

const NavigationTestComponent = () => {
    useSpatialNavigation();
    return (
        <div>
            <nav id="toolbar">
                <button id="home-btn" tabIndex={0}>Home</button>
                <button id="settings-btn" tabIndex={0}>Settings</button>
            </nav>
            <div id="grid">
                <button id="item-1" tabIndex={0}>Item 1</button>
                <button id="item-2" tabIndex={0}>Item 2</button>
            </div>
        </div>
    );
};

describe("Fixes Verification", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockInvoke.mockImplementation(async (cmd, args) => {
            if (cmd === "get_setting" && (args as any)?.key === "language") return "pt";
            if (cmd === "get_setting" && (args as any)?.key === "preferred_browser") return "firefox";
            if (cmd === "get_system_status") return { battery_percentage: 80, is_charging: false, wifi_connected: true };
            return null;
        });
    });

    describe("AddEntryForm & Translations", () => {
        it("should use translated string in AddEntryForm for validation alert", async () => {
            mockInvoke.mockImplementation(async (cmd, args) => {
                if (cmd === "check_links_health") return []; // Trigger failure
                if (cmd === "get_setting" && (args as any)?.key === "language") return "pt";
                if (cmd === "get_system_status") return { battery_percentage: 80, is_charging: false, wifi_connected: true };
                return null;
            });

            render(
                <TranslationProvider>
                    <AddEntryForm onClose={() => {}} onRefresh={() => {}} />
                </TranslationProvider>
            );
            
            const textarea = screen.getByPlaceholderText(/netflix/i);
            fireEvent.change(textarea, { target: { value: "invalid-url" } });
            
            const confirmBtn = screen.getByRole("button", { name: /confirmar/i });
            fireEvent.click(confirmBtn);
            
            await screen.findByText(/atenção: falha na verificação/i);
        });
    });

    describe("Gamepad & Spatial Navigation", () => {
        it("should reach toolbar when navigating up from the top of the grid", () => {
            render(
                <TranslationProvider>
                    <NavigationTestComponent />
                </TranslationProvider>
            );

            const item1 = screen.getByText("Item 1");
            const homeBtn = screen.getByText("Home");

            vi.spyOn(item1, "getBoundingClientRect").mockReturnValue({
                top: 200, left: 100, width: 100, height: 100, bottom: 300, right: 200, x: 100, y: 200, toJSON: () => {}
            } as DOMRect);
            vi.spyOn(homeBtn, "getBoundingClientRect").mockReturnValue({
                top: 10, left: 100, width: 100, height: 50, bottom: 60, right: 200, x: 100, y: 10, toJSON: () => {}
            } as DOMRect);

            item1.focus();
            fireEvent.keyDown(window, { key: "ArrowUp" });
            expect(document.activeElement).toBe(homeBtn);
        });
    });

    describe("Toolbar & Polish", () => {
        it("should display the section labels in the toolbar", async () => {
             const { rerender } = render(
                <TranslationProvider>
                    <Toolbar activeTab="home" setActiveTab={() => {}} />
                </TranslationProvider>
            );
            
            expect(await screen.findByTestId("active-section-label")).toHaveTextContent(/Iníc/);

            rerender(
                <TranslationProvider>
                    <Toolbar activeTab="settings" setActiveTab={() => {}} />
                </TranslationProvider>
            );

            expect(await screen.findByTestId("active-section-label")).toHaveTextContent(/Ajustes/);
        });
    });
});
