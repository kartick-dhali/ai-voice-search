import { useEffect, useState, useRef } from "react";
import ProductList from "./components/ProductList";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

export default function App() {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [products, setProducts] = useState([]);
  const [messages, setMessages] = useState([]); // {role:'user'|'assistant', text}
  const [sessionId, setSessionId] = useState(localStorage.getItem("sessionId") || null);
  const [loading, setLoading] = useState(false);
  const recognitionRef = useRef(null);

  useEffect(() => {
    async function loadProducts() {
      try {
        const res = await fetch(`${API_BASE}/api/products`);
        const data = await res.json();
        setProducts(data.products || []);
      } catch (err) {
        console.error("Failed to load products", err);
      }
    }
    loadProducts();
  }, []);

  useEffect(() => {
    // Cleanup speech synthesis if leaving
    return () => window.speechSynthesis.cancel();
  }, []);

  function speak(text) {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    window.speechSynthesis.speak(u);
  }

  async function sendQuery(query) {
  setLoading(true);
  try {
    const res = await fetch(`${API_BASE}/api/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, sessionId }),
    });
    const data = await res.json();

    // store sessionId if server generated new
    if (!sessionId && data.sessionId) {
      setSessionId(data.sessionId);
      localStorage.setItem("sessionId", data.sessionId);
    }

    setProducts(data.products || []);
    setMessages((m) => [...m, { role: "assistant", text: data.message }]);

    // --- 🎧 Play AI-generated TTS from backend ---
    if (data.audioUrl) {
      const audio = new Audio(`${API_BASE}${data.audioUrl}`);
      audio.play();
    } else {
      // fallback to browser TTS if no audio from server
      speak(data.message);
    }
  } catch (err) {
    console.error(err);
    speak("Sorry, I couldn't reach the server.");
  } finally {
    setLoading(false);
  }
}


  function addMessage(role, text) {
    setMessages((m) => [...m, { role, text }]);
  }

  function startListening() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("This browser does not support SpeechRecognition API. Use Chrome/Edge.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = async (event) => {
      const spoken = event.results[0][0].transcript.trim();
      setTranscript(spoken);
      addMessage("user", spoken);
      await sendQuery(spoken);
    };
    recognition.onerror = (e) => {
      console.error("recognition error", e);
      setListening(false);
    };
    recognition.onend = () => setListening(false);

    recognition.start();
    recognitionRef.current = recognition;
    setListening(true);
  }

  function stopListening() {
    if (recognitionRef.current) recognitionRef.current.stop();
    setListening(false);
  }

  return (
    <div style={{ padding: 20, fontFamily: "system-ui, sans-serif" }}>
      <h1>AI Voice Product Search</h1>

      <div style={{ marginBottom: 12 }}>
        <button
          onClick={() => (listening ? stopListening() : startListening())}
          style={{
            padding: "10px 16px",
            borderRadius: 8,
            background: listening ? "#f44336" : "#1976d2",
            color: "white",
            border: "none",
            cursor: "pointer",
            marginRight: 8,
          }}
        >
          {listening ? "Stop" : "Speak (mic)"} 🎤
        </button>

        <span style={{ marginLeft: 8 }}>
          {loading ? "Processing..." : transcript ? `Heard: "${transcript}"` : "Say something like 'red shirt less than 700'"}
        </span>
      </div>
      <div style={{ fontSize: "0.9em", color: "#555"}}>
  💡 Tip: Say <b>"reset"</b> or <b>"clear"</b> to reset your search.
      </div>
      <div style={{ display: "flex", gap: 20 }}>
        <div style={{ flex: 1 }}>
          <h2>Conversation</h2>
          <div style={{ maxHeight: 300, overflow: "auto", padding: 10, border: "1px solid #ddd", borderRadius: 8 }}>
            {messages.length === 0 && <div style={{ color: "#666" }}>No conversation yet — try the mic.</div>}
            {messages.map((m, i) => (
              <div key={i} style={{ marginBottom: 8 }}>
                <strong style={{ color: m.role === "user" ? "#1976d2" : "#333" }}>{m.role}</strong>: <span>{m.text}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ flex: 2 }}>
          <h2>Products</h2>
          <ProductList products={products} />
        </div>
      </div>
    </div>
  );
}
