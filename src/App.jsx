import { useEffect, useState } from "react";
import "./App.css";

function App() {
  const [email, setEmail] = useState(null);
  const [apiBase, setApiBase] = useState("http://localhost:8000");
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    console.log("Popup mounted — loading stored state");

    chrome.storage.local.get(["email", "apiBase", "prediction"], (result) => {
      console.log("Restored from storage", result);
      if (result.email) setEmail(result.email);
      if (result.apiBase) setApiBase(result.apiBase);
      if (result.prediction) setPrediction(result.prediction);
    });

    const listener = (message) => {
      if (message.type === "EMAIL_EXTRACTED") {
        console.log("Popup received email", message.payload);
        setEmail(message.payload);
        setPrediction(null);

        chrome.storage.local.set({
          email: message.payload,
          prediction: null,
        });
      }
    };

    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, []);

  const extractEmail = async () => {
    console.log("Extract button clicked");

    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (!tab?.id) {
      console.error("No active tab found");
      return;
    }

    chrome.tabs.sendMessage(tab.id, { type: "EXTRACT_EMAIL" }, (res) => {
      if (chrome.runtime.lastError) {
        console.error(
          "Content script not found:",
          chrome.runtime.lastError.message,
        );
        alert("Open a Gmail email first.");
        return;
      }

      console.log("Extraction response", res);
    });
  };

  const predictSpam = async () => {
    if (!email) return;

    console.log("Predict button clicked");
    setLoading(true);
    setPrediction(null);

    const combined = `${email.subject}\n${email.body}`;

    try {
      const res = await fetch(`${apiBase}/api/v1/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email_texts: [combined] }),
      });

      const data = await res.json();
      console.log("API response", data);

      const pred = data?.data?.predictions?.[0] || null;
      setPrediction(pred);

      chrome.storage.local.set({ prediction: pred });
    } catch (err) {
      console.error("Prediction error", err);
    }

    setLoading(false);
  };

  const handleApiBaseChange = (value) => {
    setApiBase(value);
    chrome.storage.local.set({ apiBase: value });
  };

  const resetAll = () => {
    setEmail(null);
    setPrediction(null);

    chrome.storage.local.set({
      email: null,
      prediction: null,
    });
  };

  return (
    <div style={{ padding: 12, width: 320, fontFamily: "sans-serif" }}>
      <h3>Email Spam Detector</h3>

      <input
        value={apiBase}
        onChange={(e) => handleApiBaseChange(e.target.value)}
        placeholder="API Base URL"
        style={{ width: "100%", marginBottom: 8 }}
      />

      <button onClick={extractEmail} style={{ width: "100%", marginBottom: 6 }}>
        Extract Email
      </button>

      <button
        onClick={predictSpam}
        disabled={!email || loading}
        style={{ width: "100%", marginBottom: 10 }}
      >
        {loading ? "Predicting..." : "Predict"}
      </button>

      <button
        onClick={resetAll}
        style={{ width: "100%", marginBottom: 10 }}
      >
        Reset
      </button>

      {!email && <p style={{ fontSize: 12 }}>No email extracted</p>}

      {email && (
        <>
          <strong>Subject:</strong>
          <p style={{ fontSize: 12 }}>{email.subject}</p>

          <strong>Body:</strong>
          <div style={{ maxHeight: 100, overflowY: "auto", fontSize: 12 }}>
            {email.body}
          </div>
        </>
      )}

      {prediction && (
        <div style={{ marginTop: 10, fontSize: 12 }}>
          <hr />
          <p>
            <strong>Label:</strong> {prediction.label}
          </p>
          <p>
            <strong>Score:</strong> {prediction.decision_score}
          </p>
          <p>
            <strong>Model:</strong> {prediction.model_version}
          </p>
          <p>
            <strong>Inference ms:</strong> {prediction.model_inference_ms}
          </p>
          <p>
            <strong>Text Length:</strong> {prediction.text_length}
          </p>
          <p>
            <strong>Low Confidence:</strong>{" "}
            {String(prediction.flag_low_confidence)}
          </p>
        </div>
      )}
    </div>
  );
}

export default App;
