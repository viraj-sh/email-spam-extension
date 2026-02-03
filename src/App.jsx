import { useEffect, useState } from "react";
import "./App.css";

function App() {
  const [emails, setEmails] = useState([]);
  const [apiBase, setApiBase] = useState("http://localhost:8000");
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);


  useEffect(() => {
    chrome.storage.local.get(["emails", "apiBase", "prediction"], (result) => {
      if (result.emails) setEmails(result.emails);
      if (result.apiBase) setApiBase(result.apiBase);
      if (result.prediction) setPrediction(result.prediction);
    });

    const listener = (message) => {
      if (message.type === "INBOX_EMAILS_EXTRACTED") {
        setEmails(message.payload);
        setPrediction(null);
        setError(null);

        chrome.storage.local.set({
          emails: message.payload,
          prediction: null,
        });
      }
    };

    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, []);
  const extractInbox = async () => {
    setError(null);

    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (!tab?.id) {
      setError("No active tab found.");
      return;
    }

    if (!tab.url.includes("mail.google.com")) {
      setError("Please open Gmail inbox.");
      return;
    }

    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["content.js"],
      });

      chrome.tabs.sendMessage(tab.id, { type: "EXTRACT_INBOX" });
    } catch (err) {
      setError("Could not access Gmail page.");
    }
  };

  const predictSpam = async () => {
    if (!emails.length) return;

    setLoading(true);
    setPrediction(null);
    setError(null);

    try {
      // STEP 1 — Check backend health
      const healthRes = await fetch(`${apiBase}/api/v1/health`);

      if (!healthRes.ok) {
        throw new Error("Backend server is not responding.");
      }

      const healthData = await healthRes.json();

      if (!healthData.success || healthData.data?.status !== "OK") {
        throw new Error("Backend is running but not healthy.");
      }

      // STEP 2 — Call prediction endpoint
      const res = await fetch(`${apiBase}/api/v1/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email_texts: emails }),
      });

      if (!res.ok) {
        throw new Error(`Prediction request failed (${res.status})`);
      }

      const data = await res.json();

      // API-level error handling
      if (!data.success) {
        throw new Error(data.error || "Prediction failed on server.");
      }

      setPrediction(data);
      chrome.storage.local.set({ prediction: data });
    } catch (err) {
      console.error(err);
      setError(err.message || "Something went wrong while predicting.");
    }

    setLoading(false);
  };



  const resetAll = () => {
    setEmails([]);
    setPrediction(null);
    chrome.storage.local.set({ emails: [], prediction: null });
  };

  return (
    <div style={{ padding: 12, width: 320, fontFamily: "sans-serif" }}>
      <h3>Email Spam Detector</h3>

      <input
        value={apiBase}
        onChange={(e) => {
          setApiBase(e.target.value);
          setError(null);
          chrome.storage.local.set({ apiBase: e.target.value });
        }}
        style={{ width: "100%", marginBottom: 8 }}
      />
      {error && (
        <div
          style={{
            background: "#fee2e2",
            color: "#991b1b",
            padding: "6px 8px",
            borderRadius: 6,
            fontSize: 12,
            marginBottom: 8,
            textAlign: "center",
          }}
        >
          {error}
        </div>
      )}

      <button onClick={extractInbox} style={{ width: "100%", marginBottom: 6 }}>
        Extract Inbox Emails
      </button>

      <button
        onClick={predictSpam}
        disabled={!emails.length || loading}
        style={{ width: "100%", marginBottom: 10 }}
      >
        {loading ? "Predicting..." : "Predict Inbox"}
      </button>

      <button onClick={resetAll} style={{ width: "100%", marginBottom: 10 }}>
        Reset
      </button>

      <p style={{ fontSize: 12 }}>
        Extracted Emails: <strong>{emails.length}</strong>
      </p>

      {prediction && (
        <div style={{ marginTop: 10, fontSize: 12 }}>
          <hr />
          <pre style={{ maxHeight: 150, overflowY: "auto" }}>
            {JSON.stringify(prediction, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

export default App;
