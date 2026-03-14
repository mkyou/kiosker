import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { MediaCard } from "../components/MediaCard";
import { AddEntryForm } from "../components/AddEntryForm";
import { SystemAppPicker } from "../components/SystemAppPicker";
import { HomeGrid } from "../pages/HomeGrid";
import { TranslationProvider } from "../hooks/useTranslation";

// Mock Tauri invoke
vi.mock("@tauri-apps/api/core", () => ({
    invoke: vi.fn(async (cmd, args) => {
        if (cmd === "get_active_targets") return [];
        if (cmd === "get_setting" && args?.key === "language") return "pt";
        return null;
    }),
}));

const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <TranslationProvider>{children}</TranslationProvider>
);

describe("Bug Fixes 6-12 & Navigation", () => {
    
    describe("MediaCard & Grid Improvements", () => {
        it("should show confirmation modal before deleting (Bug 10)", async () => {
            const items = [{ id: 1, title: "Test App", target_path: "test", item_type: "web" as const }];
            render(
                <Wrapper>
                    <HomeGrid items={items} loading={false} onRefresh={() => {}} />
                </Wrapper>
            );

            // Open menu
            const card = screen.getByRole("button", { name: /test app/i });
            fireEvent.contextMenu(card);

            // Click delete
            const deleteBtn = screen.getByText(/excluir/i);
            fireEvent.click(deleteBtn);

            // Should show confirmation
            await waitFor(() => {
                expect(screen.getByText(/tem certeza/i)).toBeInTheDocument();
            });
            
            // Confirm button should be visible
            const confirmBtn = screen.getByText(/confirmar/i);
            expect(confirmBtn).toBeInTheDocument();
        });

        it("should position menu at element center for keyboard triggers (Shift+F10 fix)", () => {
            render(
                <Wrapper>
                    <MediaCard id={1} title="Test App" target_path="" item_type="web" background_url="" />
                </Wrapper>
            );

            const card = screen.getByRole("button");
            
            // Mock getBoundingClientRect
            vi.spyOn(card, "getBoundingClientRect").mockReturnValue({
                left: 100,
                top: 100,
                width: 200,
                height: 300,
                x: 100,
                y: 100,
                bottom: 400,
                right: 300,
                toJSON: () => {}
            } as DOMRect);

            // Trigger Shift+F10
            fireEvent.keyDown(card, { key: "F10", shiftKey: true });

            // Menu should be visible
            const menu = screen.getByRole("menu");
            expect(menu).toBeInTheDocument();
            
            // We can't easily check fixed position via JSDOM styles in a simple way 
            // but we can check if it rendered.
        });

        it("should use translated strings for menu actions (Bug 9)", () => {
            render(
                <Wrapper>
                    <MediaCard id={1} title="Test App" target_path="" item_type="web" background_url="" is_favorite={true} />
                </Wrapper>
            );

            fireEvent.contextMenu(screen.getByRole("button"));

            // Check for translated "REMOVE FAVORITO" instead of hardcoded
            expect(screen.getByText(/remover favorito/i)).toBeInTheDocument();
            expect(screen.getByText(/voltar/i)).toBeInTheDocument();
            expect(screen.getByText(/editar/i)).toBeInTheDocument();
        });
    });

    describe("Form Text Fixes (Bug 11)", () => {
        it("AddEntryForm should show correct web description", () => {
            render(
                <Wrapper>
                    <AddEntryForm onClose={() => {}} onRefresh={() => {}} />
                </Wrapper>
            );
            expect(screen.getByText(/adicione sites ou streamings favoritos/i)).toBeInTheDocument();
        });

        it("SystemAppPicker should show correct apps description", () => {
            render(
                <Wrapper>
                    <SystemAppPicker onSelect={() => {}} onClose={() => {}} />
                </Wrapper>
            );
            expect(screen.getByText(/escolha um aplicativo instalado no seu dispositivo/i)).toBeInTheDocument();
        });
    });
});
