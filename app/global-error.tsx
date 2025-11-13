"use client";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

const GlobalError = ({ error, reset }: GlobalErrorProps) => {
  return (
    <html lang="en">
      <head>
        <title>Error - Kulti</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          backgroundColor: "#0a0a0a",
          color: "#ffffff",
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px",
        }}
      >
        <div
          style={{
            maxWidth: "600px",
            width: "100%",
            textAlign: "center",
          }}
        >
          {/* Error Icon */}
          <div
            style={{
              marginBottom: "32px",
              display: "flex",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                width: "80px",
                height: "80px",
                borderRadius: "50%",
                backgroundColor: "#1a1a1a",
                border: "2px solid rgba(239, 68, 68, 0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg
                width="40"
                height="40"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#ef4444"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
          </div>

          {/* Heading */}
          <h1
            style={{
              fontSize: "32px",
              fontWeight: "bold",
              marginBottom: "16px",
              color: "#ffffff",
            }}
          >
            Critical Error
          </h1>

          {/* Description */}
          <p
            style={{
              fontSize: "16px",
              color: "#a1a1aa",
              marginBottom: "32px",
              lineHeight: "1.6",
            }}
          >
            A critical error occurred and the application could not recover. Please try refreshing the page.
          </p>

          {/* Error Message */}
          <div
            style={{
              backgroundColor: "#1a1a1a",
              border: "1px solid #27272a",
              borderRadius: "8px",
              padding: "16px",
              marginBottom: "32px",
              textAlign: "left",
            }}
          >
            <p
              style={{
                fontSize: "12px",
                color: "#ef4444",
                fontFamily: "monospace",
                wordBreak: "break-all",
                margin: 0,
              }}
            >
              {error.message || "An unknown error occurred"}
            </p>
          </div>

          {/* Buttons */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "12px",
              alignItems: "center",
            }}
          >
            <button
              onClick={reset}
              style={{
                backgroundColor: "#00ff88",
                color: "#000000",
                border: "none",
                borderRadius: "8px",
                padding: "12px 32px",
                fontSize: "16px",
                fontWeight: "500",
                cursor: "pointer",
                minHeight: "44px",
                width: "100%",
                maxWidth: "300px",
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = "#00e67a";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = "#00ff88";
              }}
            >
              Try Again
            </button>
            <a
              href="/"
              style={{
                backgroundColor: "transparent",
                color: "#ffffff",
                border: "1px solid #27272a",
                borderRadius: "8px",
                padding: "12px 32px",
                fontSize: "16px",
                fontWeight: "500",
                textDecoration: "none",
                display: "inline-block",
                minHeight: "44px",
                width: "100%",
                maxWidth: "300px",
                boxSizing: "border-box",
                lineHeight: "20px",
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = "#1a1a1a";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
              }}
            >
              Go to Homepage
            </a>
          </div>

          {/* Footer */}
          <p
            style={{
              marginTop: "32px",
              fontSize: "14px",
              color: "#71717a",
            }}
          >
            Error ID: {error.digest || "N/A"}
          </p>
        </div>
      </body>
    </html>
  );
};

export default GlobalError;
