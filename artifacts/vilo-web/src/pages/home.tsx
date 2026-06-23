import { useState } from "react";

export default function Home() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    setError("");
    if (!name || !email || !phone) {
      setError("Please fill in all fields including your phone number.");
      return;
    }
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError("Error: " + JSON.stringify(data));
      }
    } catch (e) {
      setError("Network error: " + String(e));
    }
  };

  return (
    <div style={{ background: "#000", minHeight: "100vh", color: "#fff", fontFamily: "monospace", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "20px" }}>
      <h1 style={{ color: "#00ff88", fontSize: "clamp(16px, 5vw, 24px)", letterSpacing: "4px", marginBottom: "8px" }}>VILO AI</h1>
      <div style={{ background: "#111", border: "1px solid #00ff88", borderRadius: "4px", padding: "8px 20px", marginBottom: "40px", fontSize: "12px", color: "#00ff88", letterSpacing: "2px" }}>● LIVE</div>
      <h2 style={{ fontSize: "clamp(32px, 8vw, 64px)", fontWeight: "900", textAlign: "center", lineHeight: 1.1, marginBottom: "20px" }}>
        YOUR AI COMPANION.<br />
        <span style={{ color: "#00ff88" }}>THAT ACTUALLY<br />CALLS YOU.</span>
      </h2>
      <p style={{ color: "#aaa", textAlign: "center", maxWidth: "500px", marginBottom: "50px", fontSize: "18px", lineHeight: 1.6 }}>
        Vilo checks in on you every day. A real phone call. A real conversation. Always there for you — for just $3.98.
      </p>
      {error && <p style={{ color: "red", marginBottom: "20px", textAlign: "center" }}>{error}</p>}
      <div style={{ width: "100%", maxWidth: "400px", display: "flex", flexDirection: "column", gap: "12px", marginBottom: "20px" }}>
        <input placeholder="YOUR NAME" value={name} onChange={e => setName(e.target.value)} style={{ background: "#111", border: "1px solid #333", color: "#fff", padding: "16px", fontSize: "14px", letterSpacing: "2px", outline: "none" }} />
        <input placeholder="EMAIL ADDRESS" value={email} onChange={e => setEmail(e.target.value)} style={{ background: "#111", border: "1px solid #333", color: "#fff", padding: "16px", fontSize: "14px", letterSpacing: "2px", outline: "none" }} />
        <input placeholder="PHONE NUMBER (REQUIRED)" value={phone} onChange={e => setPhone(e.target.value)} style={{ background: "#111", border: "1px solid #333", color: "#fff", padding: "16px", fontSize: "14px", letterSpacing: "2px", outline: "none" }} />
        <button onClick={handleSubmit} style={{ background: "#00ff88", color: "#000", border: "none", padding: "20px", fontSize: "16px", fontWeight: "900", letterSpacing: "2px", cursor: "pointer" }}>
          → GET YOUR DAILY COMPANION — $3.98
        </button>
      </div>
      <p style={{ color: "#555", fontSize: "12px", letterSpacing: "2px" }}>ONE-TIME PAYMENT · NO SUBSCRIPTIONS · VILO CALLS YOU DAILY</p>
    </div>
  );
}
