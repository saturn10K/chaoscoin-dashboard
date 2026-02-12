"use client";
import FlameIcon from "../components/icons/flame-icon";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: "#06080D" }}
    >
      <div
        className="rounded-xl border border-white/10 p-8 text-center max-w-md w-full animate-fade-in-up"
        style={{ backgroundColor: "#0D1117" }}
      >
        <div className="mb-4 flex justify-center"><FlameIcon size={48} color="#FF4444" /></div>
        <h1 className="text-lg font-bold text-gray-100 mb-2">Something went wrong</h1>
        <p className="text-sm text-gray-400 mb-1">
          The dashboard hit an unexpected error.
        </p>
        <p className="text-xs text-gray-600 font-mono mb-6 truncate">
          {error.message}
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="px-5 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{
              backgroundColor: "#7B61FF20",
              color: "#7B61FF",
              border: "1px solid #7B61FF40",
            }}
          >
            Try again
          </button>
          <a
            href="/"
            className="px-5 py-2 rounded-lg text-sm font-medium text-gray-400 transition-colors hover:text-gray-200"
            style={{ border: "1px solid rgba(255,255,255,0.1)" }}
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}
