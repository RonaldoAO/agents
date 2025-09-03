import React, { useState, useRef, useEffect, useCallback } from "react";
import "bootstrap-icons/font/bootstrap-icons.css";
import "../style/AgentChat.css";

const API_URL =
  "https://8oc6ik9r54.execute-api.us-east-1.amazonaws.com/Prod/chat";

const GREETING = "👋 Hola, escribe cualquier mensaje para comenzar.";

export default function TutorChat() {
  // Chat UI
  const [message, setMessage] = useState("");
  const [image, setImage] = useState(null);                 // base64 (sin encabezado)
  const [imagePreview, setImagePreview] = useState(null);   // data URL para <img>
  const [chatLog, setChatLog] = useState([]);
  const [loading, setLoading] = useState(false);

  // Identidad
  const [userId, setUserId] = useState("");                 // matrícula actual
  const [showLogin, setShowLogin] = useState(false);        // overlay visible?
  const [loginId, setLoginId] = useState("");               // input del login
  const [loginErr, setLoginErr] = useState("");

  // Refs
  const chatHistoryRef = useRef();
  const fileInputRef = useRef();

  // Helpers
  const resetChat = useCallback(() => {
    setChatLog([{ from: "bot", text: GREETING }]);
    setMessage("");
    setImage(null);
    setImagePreview(null);
    setLoading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const isValidId = (v) => /^[A-Za-z0-9_-]{4,32}$/.test(v.trim());
  const saveUserId = (v) => {
    const clean = v.trim();
    setUserId(clean);
    localStorage.setItem("tutorchat_userId", clean);
  };

  // Cargar matrícula guardada al entrar
  useEffect(() => {
    const saved = localStorage.getItem("tutorchat_userId");
    if (saved) {
      setUserId(saved);
    } else {
      setShowLogin(true);
    }
  }, []);

  // Saludo inicial
  useEffect(() => {
    resetChat();
  }, [resetChat]);

  // Autoscroll
  useEffect(() => {
    if (chatHistoryRef.current) {
      chatHistoryRef.current.scrollTop = chatHistoryRef.current.scrollHeight;
    }
  }, [chatLog, loading]);

  // Login submit
  const submitLogin = (e) => {
    e?.preventDefault();
    if (!isValidId(loginId)) {
      setLoginErr(
        "Ingresa una matrícula válida (4–32 caracteres, letras/números/_-)"
      );
      return;
    }
    const oldId = userId;
    const newId = loginId.trim();

    saveUserId(newId);
    setLoginId("");
    setLoginErr("");
    setShowLogin(false);

    // Si cambió la matrícula, reiniciamos el chat
    if (oldId !== newId) resetChat();
  };

  const openChangeId = () => {
    setLoginId(userId);
    setLoginErr("");
    setShowLogin(true);
  };

  // Archivos
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result;
      const base64String = String(dataUrl).split(",")[1];
      setImage(base64String);
      setImagePreview(String(dataUrl));
    };
    reader.readAsDataURL(file);
  };

  const clearSelectedImage = () => {
    setImage(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Enviar
  const sendMessage = async () => {
    if (showLogin || !userId) {
      setShowLogin(true);
      return;
    }
    if ((!message.trim() && !image) || loading) return;

    // Congelar valores y limpiar UI al instante
    const msgText = message.trim();
    const imgPayload = image;
    const previewSnapshot = imagePreview;

    setChatLog((prev) => [
      ...prev,
      {
        from: "user",
        text: msgText ? msgText : imgPayload ? "📷 Imagen adjunta" : "",
        preview: previewSnapshot || null,
      },
    ]);

    setMessage("");
    setImage(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";

    setLoading(true);
    try {
      const payload = { userId, message: msgText || "", image: imgPayload || null };

      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();

      if (data.status === "success") {
        setChatLog((prev) => [...prev, { from: "bot", text: data.message }]);
        if (data.userId && data.userId !== userId) {
          saveUserId(data.userId);
          resetChat(); // si backend corrige userId, reiniciamos
        }
      } else if (data.status === "invalid") {
        setChatLog((prev) => [
          ...prev,
          { from: "bot", text: "❌ La matrícula que ingresaste no existe. Intenta de nuevo." },
        ]);
        setShowLogin(true);
      } else if (data.status === "waiting_for_id") {
        setChatLog((prev) => [
          ...prev,
          { from: "bot", text: "👋 Por favor ingresa tu matrícula para comenzar." },
        ]);
        setShowLogin(true);
      } else {
        setChatLog((prev) => [...prev, { from: "bot", text: "❌ Error en la respuesta" }]);
      }
    } catch (err) {
      console.error(err);
      setChatLog((prev) => [
        ...prev,
        { from: "bot", text: "❌ Error al contactar el servicio" },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="chat-container">
      <div className="chat-header">
        <p className="subtitulo">TUTOR EDUCATIVO PARA ESTUDIANTES</p>

        {userId && (
          <div style={{ display: "flex", alignItems: "center", gap: ".5rem" }}>
            <span
              style={{
                fontSize: ".8rem",
                background: "#eef3ff",
                padding: ".2rem .5rem",
                borderRadius: "999px",
              }}
            >
              👤 {userId}
            </span>
            <button className="clear-btn" onClick={openChangeId}>
              ✏️ Cambiar matrícula
            </button>
          </div>
        )}
      </div>

      <div className="chat-history" ref={chatHistoryRef}>
        {chatLog.map((msg, idx) => (
          <div
            key={idx}
            className={`msg ${msg.from === "user" ? "user" : "bot"}`}
          >
            {msg.text && <div>{msg.text}</div>}
            {msg.preview && (
              <a href={msg.preview} target="_blank" rel="noreferrer">
                <img
                  src={msg.preview}
                  alt="preview"
                  style={{
                    maxWidth: 220,
                    borderRadius: 10,
                    marginTop: 6,
                    cursor: "zoom-in",
                  }}
                />
              </a>
            )}
          </div>
        ))}
        {loading && <div className="msg bot">⏳ Escribiendo respuesta…</div>}
      </div>

      {imagePreview && (
        <div className="pending-image">
          <div className="pending-image-inner">
            <img
              src={imagePreview}
              alt="Imagen seleccionada"
              style={{ maxHeight: 120, borderRadius: 10 }}
            />
            <button className="remove-img-btn" onClick={clearSelectedImage}>
              <i className="bi bi-x-lg"></i>
            </button>
          </div>
        </div>
      )}

      {/* Barra de chat (deshabilitada si no hay matrícula o está el login abierto) */}
      <div className="chat-bar" aria-disabled={showLogin || !userId}>
        <button
          className="icon-btn"
          onClick={() => !loading && !showLogin && userId && fileInputRef.current?.click()}
          disabled={loading || showLogin || !userId}
          aria-label="Adjuntar imagen"
          type="button"
        >
          <i className="bi bi-plus"></i>
        </button>

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*"
          style={{ display: "none" }}
          disabled={loading || showLogin || !userId}
        />

        <input
          className="chat-field"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            showLogin || !userId
              ? "Ingresa tu matrícula para chatear…"
              : "Escribe tu mensaje…"
          }
          disabled={loading || showLogin || !userId}
        />

        <button
          className="icon-btn send-btn"
          onClick={sendMessage}
          disabled={loading || showLogin || !userId}
          aria-label="Enviar"
        >
          <i className="bi bi-send"></i>
        </button>
      </div>

      {/* Overlay mini-login */}
      {showLogin && (
        <div
          className="login-overlay"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,.25)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 2000,
          }}
        >
          <form
            className="login-card"
            onSubmit={submitLogin}
            style={{
              width: "min(420px, 92vw)",
              background: "#fff",
              borderRadius: 16,
              padding: 18,
              boxShadow: "0 10px 30px rgba(0,0,0,.15)",
            }}
          >
            <h3 style={{ margin: 0, fontSize: "1rem" }}>Identifícate</h3>
            <p style={{ margin: ".4rem 0 .8rem", fontSize: ".85rem", color: "#555" }}>
              Ingresa tu matrícula para continuar.
            </p>

            <div
              className="login-row"
              style={{
                display: "flex",
                alignItems: "center",
                gap: ".5rem",
                border: "1px solid #e5e5e5",
                borderRadius: 10,
                padding: ".6rem .75rem",
                background: "#fafafa",
              }}
            >
              <i className="bi bi-person-badge" style={{ color: "#666" }} />
              <input
                autoFocus
                value={loginId}
                onChange={(e) => setLoginId(e.target.value)}
                placeholder="Ej. UNIV011"
                style={{
                  flex: 1,
                  border: "none",
                  outline: "none",
                  background: "transparent",
                  fontSize: ".95rem",
                }}
              />
            </div>

            {loginErr && (
              <div style={{ marginTop: ".5rem", color: "#b00020", fontSize: ".85rem" }}>
                {loginErr}
              </div>
            )}

            <div
              className="login-actions"
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: ".5rem",
                marginTop: ".9rem",
              }}
            >
              <button
                type="button"
                className="btn-light"
                onClick={() => setShowLogin(false)}
                disabled={!userId}
                style={{
                  background: "#f2f2f2",
                  border: "1px solid #e6e6e6",
                  color: "#111",
                  borderRadius: 10,
                  padding: ".5rem .8rem",
                  cursor: userId ? "pointer" : "not-allowed",
                  opacity: userId ? 1 : 0.6,
                }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="btn-dark"
                style={{
                  background: "#000",
                  color: "#fff",
                  border: "none",
                  borderRadius: 10,
                  padding: ".5rem .9rem",
                  cursor: "pointer",
                }}
              >
                Guardar
              </button>
            </div>

            {!userId && (
              <div style={{ marginTop: ".5rem", fontSize: ".8rem", color: "#777" }}>
                * Debes ingresar una matrícula para empezar a chatear.
              </div>
            )}
          </form>
        </div>
      )}
    </div>
  );
}
