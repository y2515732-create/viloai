export default function Success() {
  const params = new URLSearchParams(window.location.search);
  const sessionId = params.get("session_id");

  if (!sessionId) {
    return (
      <div style={{ background: "#000", minHeight: "100vh", color: "#fff", fontFamily: "monospace", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "20px" }}>
        <h1 style={{ color: "red" }}>INVALID REQUEST</h1>
        <p style={{ color: "#aaa" }}>No session found. Please complete checkout first.</p>
        <a href="/" style={{ color: "#00ff88", marginTop: "20px" }}>Return Home</a>
      </div>
    );
  }

  return (
    <div style={{ background: "#000", minHeight: "100vh", color: "#fff", fontFamily: "monospace", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "20px", textAlign: "center" }}>
      <h1 style={{ color: "#00ff88", fontSize: "clamp(16px, 5vw, 24px)", letterSpacing: "4px", marginBottom: "20px" }}>VILO AI</h1>
      <div style={{ fontSize: "60px", marginBottom: "20px" }}>📞</div>
      <h2 style={{ fontSize: "clamp(24px, 6vw, 48px)", fontWeight: "900", marginBottom: "20px" }}>
        YOU'RE ALL SET!
      </h2>
      <p style={{ color: "#aaa", maxWidth: "400px", fontSize: "18px", lineHeight: 1.6, marginBottom: "40px" }}>
        Vilo will call you shortly to check in. Keep your phone nearby — your AI companion is on the way.
      </p>
      <div style={{ background: "#111", border: "1px solid #00ff88", padding: "20px 40px", color: "#00ff88", letterSpacing: "2px", fontSize: "12px" }}>
        ● VILO IS CALLING YOU
      </div>
    </div>
  );
}
