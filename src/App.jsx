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
  setError(null)

  const [tab] = await chrome.tabs.query({
    active: true,
    currentWindow: true,
  })

  if (!tab?.id) {
    setError("No active tab found.")
    return
  }

  if (!tab.url.includes("mail.google.com")) {
    setError("Please open Gmail inbox.")
    return
  }

  const sendExtractMessage = () =>
    chrome.tabs.sendMessage(tab.id, { type: "EXTRACT_INBOX" }, (res) => {
      if (chrome.runtime.lastError) {
        injectAndRetry()
      }
    })

  const injectAndRetry = async () => {
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["content.js"],
      })
      chrome.tabs.sendMessage(tab.id, { type: "EXTRACT_INBOX" })
    } catch {
      setError("Could not access Gmail page.")
    }
  }

  sendExtractMessage()
}


  const predictSpam = async () => {
    if (!emails.length) return;

    setLoading(true);
    setPrediction(null);
    setError(null);

    try {
      const healthRes = await fetch(`${apiBase}/api/v1/health`);
      if (!healthRes.ok) throw new Error("Backend server is not responding.");

      const healthData = await healthRes.json();
      if (!healthData.success || healthData.data?.status !== "OK") {
        throw new Error("Backend is running but not healthy.");
      }

      const res = await fetch(`${apiBase}/api/v1/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email_texts: emails }),
      });

      if (!res.ok) throw new Error(`Prediction request failed (${res.status})`);

      const data = await res.json();
      if (!data.success)
        throw new Error(data.error || "Prediction failed on server.");

      setPrediction(data);
      chrome.storage.local.set({ prediction: data });

      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (tab?.id) {
        chrome.tabs.sendMessage(tab.id, {
          type: "APPLY_PREDICTIONS",
          payload: data.data.predictions,
        });
      }
    } catch (err) {
      console.error(err);
      setError(err.message || "Something went wrong while predicting.");
    }

    setLoading(false);
  };

  const resetAll = async () => {
    setEmails([]);
    setPrediction(null);
    setError(null);

    chrome.storage.local.set({ emails: [], prediction: null });

    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (tab?.id && tab.url.includes("mail.google.com")) {
      chrome.tabs.sendMessage(tab.id, { type: "CLEAR_PREDICTIONS_UI" });
    }
  };

  const getStats = () => {
    if (!prediction?.data?.predictions) return null;

    let spam = 0;
    let ham = 0;

    prediction.data.predictions.forEach((p) => {
      if (p.label === "spam") spam++;
      else ham++;
    });

    return {
      spam,
      ham,
      total: prediction.data.predictions.length,
    };
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

      {prediction &&
        (() => {
          const stats = getStats();
          if (!stats) return null;

          return (
            <div
              style={{
                marginTop: 12,
                padding: 10,
                borderRadius: 8,
                background: "#f3f4f6",
                fontSize: 13,
              }}
            >
              <div style={{ fontWeight: "bold", marginBottom: 6 }}>
                Prediction Summary
              </div>

              <div style={{ color: "#dc2626" }}>
                Spam: <strong>{stats.spam}</strong>
              </div>

              <div style={{ color: "#16a34a" }}>
                Ham: <strong>{stats.ham}</strong>
              </div>

              <div style={{ marginTop: 4, fontSize: 12, color: "#555" }}>
                Total analyzed: {stats.total}
              </div>
            </div>
          );
        })()}
    </div>
  );
}

export default App;
