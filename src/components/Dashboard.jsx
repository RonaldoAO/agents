import { useEffect, useState } from "react";
import "../style/Dashboard.css"; 
import "swiper/css";

const API_BASE = "https://8oc6ik9r54.execute-api.us-east-1.amazonaws.com/Prod";


export default function StudentRiskUniversidad() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/dashboard?level=universidad`);
        const json = await res.json();
        setData(json);
      } catch (err) {
        console.error("Error cargando:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <p className="loading">⏳ Cargando datos...</p>;
  if (!data) return null;

  const { summary, trends, metadata } = data;

  return (
    <div className="risk-container">
      <h2 className="risk-title">📊 Dashboard Universidad</h2>

      {/* === Resumen === */}
      <div className="risk-summary">
        <p>Total estudiantes: <strong>{summary.total_students}</strong></p>
        <p>🔴 Alto: {summary.performance_distribution.Alto} | 🟠 Medio: {summary.performance_distribution.Medio} | 🟢 Bajo: {summary.performance_distribution.Bajo}</p>
      </div>

      {/* === Distribución por semestre === */}
      <h3>📚 Distribución por semestre</h3>
      <table className="risk-table">
        <thead>
          <tr><th>Semestre</th><th>Estudiantes</th></tr>
        </thead>
        <tbody>
          {Object.entries(summary.semester_distribution).map(([sem, val]) => (
            <tr key={sem}>
              <td>{sem}</td>
              <td>{val}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* === Distribución por programa === */}
      <h3>🎓 Distribución por programa</h3>
      <table className="risk-table">
        <thead>
          <tr><th>Programa</th><th>Estudiantes</th></tr>
        </thead>
        <tbody>
          {Object.entries(summary.program_distribution).map(([prog, val]) => (
            <tr key={prog}>
              <td>{prog}</td>
              <td>{val}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* === Tendencias semanales === */}
      <h3>📈 Tendencias (Semanas 9-12)</h3>
      <table className="risk-table">
        <thead>
          <tr>
            <th>Semana</th>
            <th>Nota Promedio</th>
            <th>Asistencia</th>
            <th>Tareas</th>
            <th>Estudiantes</th>
          </tr>
        </thead>
        <tbody>
          {trends.map((t) => (
            <tr key={t.week}>
              <td>{t.week}</td>
              <td>{t.avg_grade}</td>
              <td>{(t.avg_attendance * 100).toFixed(0)}%</td>
              <td>{t.avg_assignments}</td>
              <td>{t.student_count}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* === Metadata === */}
      <div className="risk-meta">
        <p>Última actualización: {new Date(metadata.last_updated).toLocaleString()}</p>
        <p>Período: {metadata.analysis_period}</p>
      </div>
    </div>
  );
}
