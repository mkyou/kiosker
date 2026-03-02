export function RightClickIcon({ className }: { className?: string }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
        >
            <rect x="5" y="2" width="14" height="20" rx="7" />
            <path d="M5 10h14" />
            <path d="M12 2v8" />
            {/* Right button filled to indicate right-click */}
            <path d="M12 2h4a3 3 0 0 1 3 3v5h-7V2z" fill="currentColor" fillOpacity="0.4" />
        </svg>
    );
}
