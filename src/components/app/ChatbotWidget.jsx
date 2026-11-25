import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../services/apiClient";
import { useAuth } from "../../context/AuthContext";
import { roleHomePath } from "./ProtectedRoute";
import "../../styles/chatbot.css";

export default function ChatbotWidget() {
  const { isAuthenticated, profile } = useAuth();
  const navigate = useNavigate();

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const greetingLoadedRef = useRef(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  const resolveRoute = (rawRoute) => {
    if (!rawRoute) return null;
    if (rawRoute.startsWith("__ROLE__")) {
      if (!isAuthenticated || !profile?.role) {
        return "/login";
      }
      return rawRoute.replace("__ROLE__", roleHomePath(profile.role));
    }
    return rawRoute;
  };

  const handleNavigateRoute = (route) => {
    if (!route) return;
    if (route.startsWith("/#")) {
      const targetId = route.slice(2);
      if (window.location.pathname !== "/") {
        navigate("/");
        setTimeout(() => {
          document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth" });
        }, 120);
      } else {
        document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth" });
      }
      setIsOpen(false);
      return;
    }
    navigate(route);
    setIsOpen(false);
  };

  const sendMessage = async (text, { hideUserBubble = false } = {}) => {
    const trimmed = String(text || "").trim();
    if (!trimmed) return;

    if (!hideUserBubble) {
      setMessages((prev) => [...prev, { sender: "user", text: trimmed }]);
    }

    setSending(true);
    try {
      const data = await api.post("/chatbot/chat", { message: trimmed });
      const resolvedRoute = resolveRoute(data.route);

      setMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text: data.response || "How can I help you today?",
          options: Array.isArray(data.options) ? data.options : [],
          route: resolvedRoute,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text: "Connection error. Please try again or contact support@alumsync.com.",
          options: ["Main Menu"],
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  const toggleOpen = () => {
    const next = !isOpen;
    setIsOpen(next);
    if (next && !greetingLoadedRef.current) {
      greetingLoadedRef.current = true;
      sendMessage("START", { hideUserBubble: true });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim() || sending) return;
    const text = input;
    setInput("");
    sendMessage(text);
  };

  return (
    <div className="alma-chatbot-root">
      <button
        type="button"
        onClick={toggleOpen}
        aria-label={isOpen ? "Close ALMA assistant" : "Open ALMA assistant"}
        className="alma-chatbox__cta"
      >
        <span className="alma-chatbox__cta-icon" aria-hidden="true">
          💬
        </span>
        <span className="alma-chatbox__cta-label">Ask ALMA</span>
      </button>

      {isOpen && (
        <div className="alma-chatbox" role="dialog" aria-label="ALMA Assistant">
          <div className="alma-chatbox__header">
            <img src="/chatbot.png" alt="ALMA" className="alma-chatbox__avatar" />
            <div className="alma-chatbox__title-wrap">
              <div className="alma-chatbox__title">ALMA</div>
              <div className="alma-chatbox__subtitle">AlumSync Virtual Assistant</div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Close chat"
              className="alma-chatbox__close"
            >
              ✖
            </button>
          </div>

          <div className="alma-chatbox__messages">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`alma-msg ${msg.sender === "user" ? "alma-msg--user" : "alma-msg--bot"}`}
              >
                <p className="alma-msg__text">{msg.text}</p>

                {msg.sender === "bot" && msg.route && (
                  <button
                    type="button"
                    onClick={() => handleNavigateRoute(msg.route)}
                    className="alma-msg__nav-btn"
                  >
                    Open Page →
                  </button>
                )}

                {msg.sender === "bot" && msg.options?.length > 0 && (
                  <div className="alma-msg__options">
                    {msg.options.map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        disabled={sending}
                        onClick={() => sendMessage(opt)}
                        className="alma-msg__option-btn"
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSubmit} className="alma-chatbox__footer">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type a message..."
              className="alma-chatbox__input"
            />
            <button type="submit" disabled={sending || !input.trim()} className="alma-chatbox__send">
              Send
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
