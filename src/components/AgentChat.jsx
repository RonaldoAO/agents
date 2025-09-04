import { useState, useRef, useEffect } from "react";
import "bootstrap-icons/font/bootstrap-icons.css";
import "../style/AgentChat.css";

const API_BASE = "https://2buirz5z2l.execute-api.us-east-1.amazonaws.com";

export default function AgentChat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);

  const fileInputRef = useRef();

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const [recording, setRecording] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const clearChat = () => setMessages([]);

  //iniciar / detener grabación 
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      audioChunksRef.current = [];

      mr.ondataavailable = (e) => {
        if (e.data?.size > 0) audioChunksRef.current.push(e.data);
      };

      mr.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const audioFile = new File([audioBlob], `grabacion_${Date.now()}.webm`, {
          type: "audio/webm",
        });

        setFile(audioFile);

        // preview en la banda de "Archivo seleccionado" 
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        const url = URL.createObjectURL(audioBlob);
        setPreviewUrl(url);

        // cierra tracks del micrófono
        mr.stream?.getTracks?.().forEach((t) => t.stop());
      };

      mr.start();
      setRecording(true);
    } catch (err) {
      console.error(err);
      alert("No se pudo acceder al micrófono.");
    }
  };

  const stopRecording = () => {
    const mr = mediaRecorderRef.current;
    if (mr && mr.state !== "inactive") mr.stop();
    setRecording(false);
  };

  const toggleRecording = () => {
    if (loading) return;
    if (recording) stopRecording();
    else startRecording();
  };
  // === END recording ===

  const sendMessage = async () => {
    if ((!input && !file) || loading) return;

    const userMessage = input || (file ? file.name : "");
    const userAudioUrl =
      // preview en la burbuja del chat para audio
      file && (file.type === "audio/mpeg" || file.type === "audio/webm")
        ? URL.createObjectURL(file)
        : null;

    setMessages((msgs) => [
      ...msgs,
      {
        sender: "user",
        text: userMessage,
        audioUrl: userAudioUrl,
      },
    ]);

    setInput("");
    setLoading(true);

    try {
      if (file) {
        const extension = file.name.split(".").pop().toLowerCase();
        let filetype = "";
        let contentType = "";
        let s3Field = "";

        if (extension === "mp3") {
          filetype = "mp3";
          contentType = "audio/mpeg";
          s3Field = "s3_uri";
        } else if (extension === "webm") {
          // soporte webm
          filetype = "webm";
          contentType = "audio/webm";
          s3Field = "s3_uri";
        } else if (extension === "docx") {
          filetype = "docx";
          contentType =
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
          s3Field = "s3_uri_docx";
        } else {
          alert("Solo se aceptan archivos .mp3, .webm o .docx");
          setLoading(false);
          return;
        }

        const res1 = await fetch(`${API_BASE}/upload-url`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filename: file.name, filetype }),
        });
        const data1 = await res1.json();

        const presignedUrl = data1.presigned_url;
        const s3uri = data1.s3_uri;

        console.log("📦 s3_uri recibido:", s3uri);

        if (!s3uri) {
          alert("Error: no se pudo obtener la URL de S3.");
          setLoading(false);
          return;
        }

        await fetch(presignedUrl, {
          method: "PUT",
          headers: { "Content-Type": contentType },
          body: file,
        });

        if (fileInputRef.current) fileInputRef.current.value = "";
        setFile(null);
        //  limpia preview cuando ya se manda el archivo
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);

        const res2 = await fetch(`${API_BASE}/agent`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ [s3Field]: s3uri }),
        });
        const data2 = await res2.json();

        let body2 = data2;
        if (typeof data2.body === "string") {
          try {
            body2 = JSON.parse(data2.body);
          } catch {
            body2 = data2;
          }
        }

        const botMessage =
          body2.texto
            ? `✅ Tu transcripción está lista: ${body2.texto}`
            : body2.message || body2.respuesta || "Procesando…";

        setMessages((msgs) => [
          ...msgs,
          {
            sender: "bot",
            text: botMessage,
            audioUrl: body2.audio_url || null,
          },
        ]);
      } else if (input) {
        const res = await fetch(`${API_BASE}/agent`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mensaje: input }),
        });
        const data = await res.json();

        let body = data;
        if (typeof data.body === "string") {
          try {
            body = JSON.parse(data.body);
          } catch {
            body = data;
          }
        }

        const botMessage =
          body.texto
            ? `✅ Tu transcripción está lista: ${body.texto}`
            : body.message || body.respuesta || "Procesando…";

        setMessages((msgs) => [
          ...msgs,
          {
            sender: "bot",
            text: botMessage,
            audioUrl: body.audio_url || null,
          },
        ]);
      }
    } catch (err) {
      console.error("Error al enviar mensaje:", err);
      alert("Ocurrió un error al enviar el mensaje.");
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
        <p className="subtitulo">ASISTENTE PARA CONVERSIÓN DE TEXTO Y AUDIO</p>
        {/* === Barra de chat redondeada === 
        <button className="clear-btn" onClick={clearChat} aria-label="Limpiar chat">
          🗑️ Limpiar chat
        </button>
        */}
      </div>

      <div className="chat-history" id="chat-history">
        {messages.length === 0 && (
          <div className="msg bot">
            👋 Hola, soy tu asistente!
            <br />
            Puedo convertir textos en audio y audios en texto.
            <br />
            Sube un archivo .docx, un .mp3 o presiona el micrófono para comenzar una grabación.
          </div>
        )}

        {messages.map((msg, idx) => (
          <div key={idx} className={`msg ${msg.sender}`}>
            <div>
              {msg.audioUrl ? (
                <div>
                  {msg.sender === "user" ? (
                    <>
                      <p>🎤 Este es el audio que subiste:</p>
                      <audio controls src={msg.audioUrl}></audio>
                    </>
                  ) : (
                    <>
                      <p>🎵 El audio se generó correctamente:</p>
                      <audio controls src={msg.audioUrl}></audio>
                    </>
                  )}
                </div>
              ) : msg.text.startsWith("✅ Tu transcripción está lista:") ? (
                <div>
                  <p>✅ Tu transcripción está lista:</p>
                  <p style={{ whiteSpace: "pre-wrap" }}>
                    {msg.text.replace("✅ Tu transcripción está lista: ", "")}
                  </p>
                </div>
              ) : (
                msg.text
              )}
            </div>
          </div>
        ))}
      </div>

      {file && (
        <div className="archivo-seleccionado">
          📁 Archivo seleccionado: <strong>{file.name}</strong>          
          <button
            className="cancel-btn"
            onClick={() => {
              setFile(null);
              if (previewUrl) URL.revokeObjectURL(previewUrl);
              setPreviewUrl(null);
            }}
            aria-label="Quitar archivo"
          >
            <i className="bi bi-x"></i>
          </button>
        </div>
      )}

      {loading && !file && <div className="subiendo">⏳ Procesando…</div>}

      <div className="chat-bar">
        <button
          className="icon-btn"
          onClick={() => !loading && fileInputRef.current?.click()}
          disabled={loading}
          aria-label="Adjuntar archivo"
          type="button"
        >
          <i className="bi bi-plus"></i>
        </button>

        <input
          type="file"
          ref={fileInputRef}
          onChange={(e) => {
            const f = e.target.files?.[0] ?? null;
            setFile(f);
            if (previewUrl) URL.revokeObjectURL(previewUrl);
            if (f && (f.type === "audio/mpeg" || f.type === "audio/webm")) {
              setPreviewUrl(URL.createObjectURL(f));
            } else {
              setPreviewUrl(null);
            }
          }}
          style={{ display: "none" }}
          accept=".mp3,.webm,.docx" 
        />

        <input
          className="chat-field"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Escribe tu mensaje..."
          disabled={loading}
        />

        {/* micrófono (graba/stop) */}
        <button
          className="icon-btn mic-btn"
          disabled={loading}
          aria-label={recording ? "Detener grabación" : "Grabar audio"}
          onClick={toggleRecording}
          type="button"
        >
          <i className={`bi ${recording ? "bi-stop-fill" : "bi-mic"}`}></i>
        </button>

        <button
          className="icon-btn send-btn"
          onClick={sendMessage}
          disabled={loading}
          aria-label="Enviar"
        >
          <i className="bi bi-send"></i>
        </button>
      </div>
    </div>
  );
}
