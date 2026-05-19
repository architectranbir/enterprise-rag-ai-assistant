import React, { useState, useRef, useEffect } from "react";
import { Send, Sparkles } from "lucide-react";
import { createRoot } from "react-dom/client";
import "./styles.css";

function App() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text: "Hi, I can help you understand engineering standards and approved practices."
    }
  ]);

  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const askQuestion = async () => {
    const trimmed = question.trim();
    if (!trimmed || loading) return;

    setMessages((prev) => [...prev, { role: "user", text: trimmed }]);
    setQuestion("");
    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({ question: trimmed })
      });

      const data = await response.json();

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: data.answer || "No response received."
        }
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: "Unable to connect to backend."
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      askQuestion();
    }
  };

  return (
    <div className="page">

      <aside className="sidebar">
        <div className="brand">
          <div className="brandIcon">
            <Sparkles size={20} />
          </div>
          <div>
            <h2>Standards AI</h2>
            <p>Engineering Assistant</p>
          </div>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div className="pill">Enterprise Engineering Assistant</div>
          <h1>Engineering Standards Chatbot</h1>
        </header>

        <section className="chatPanel">
          <div className="messages">
            {messages.map((m, i) => (
              <div key={i} className={`messageRow ${m.role}`}>
                <div className="avatar">
                  {m.role === "assistant" ? "AI" : "You"}
                </div>
                <div className="bubble">{m.text}</div>
              </div>
            ))}

            {loading && (
              <div className="messageRow assistant">
                <div className="avatar">AI</div>
                <div className="bubble">Thinking...</div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          <div className="composer">
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask about engineering standards..."
            />
            <button onClick={askQuestion}>
              <Send size={18} />
            </button>
          </div>

          <div className="hint">Press Enter to send</div>
        </section>
      </main>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
