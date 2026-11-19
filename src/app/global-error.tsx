"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en-IN">
      <body
        style={{
          fontFamily: "system-ui, sans-serif",
          background: "#F8FAF5",
          color: "#242B25",
          display: "grid",
          placeItems: "center",
          minHeight: "100vh",
          margin: 0,
        }}
      >
        <div style={{ textAlign: "center", padding: 24 }}>
          <h1 style={{ fontSize: 28 }}>Something went wrong</h1>
          <p style={{ color: "#5C645C" }}>Please refresh the page or try again in a moment.</p>
          <button
            onClick={reset}
            style={{
              marginTop: 16,
              background: "#236B45",
              color: "#fff",
              border: 0,
              borderRadius: 999,
              padding: "12px 24px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
