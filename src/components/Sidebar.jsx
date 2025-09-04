import '../style/Sidebar.css';
import 'bootstrap-icons/font/bootstrap-icons.css';

export default function Sidebar({ onSelect }) {
  return (
    <div className="sidebar">
    <div className="icon" onClick={() => onSelect("transcribe")} title="Audio ↔ Texto">
        <i className="bi bi-arrow-left-right"></i>
    </div>
      <div className="icon" onClick={() => onSelect("educativo")} title="Asistente Educativo">
        <i className="bi bi-mortarboard"></i>
      </div>
      <div className="icon" onClick={() => onSelect("transcribe")} title="Audio ↔ Texto">
        <i className="bi bi-heart"></i>
      </div>
      <div className="icon" onClick={() => onSelect("riesgo")} title="">
        <i className="bi bi-info-circle"></i>
      </div>
      <div className="icon" onClick={() => onSelect("riesgo")} title="">
        <i className="bi bi-envelope"></i>
      </div>
    </div>
  );
}
