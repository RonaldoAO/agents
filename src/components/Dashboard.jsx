import { useEffect, useState } from "react";
import { Bar, Pie, Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
} from "chart.js";

import "../style/Dashboard.css";
import "swiper/css";

ChartJS.register(
  Title,
  Tooltip,
  Legend,
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement
);

const API_BASE = "https://8oc6ik9r54.execute-api.us-east-1.amazonaws.com/Prod";

export default function StudentRiskUniversidad() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`${API_BASE}/dashboard?level=universidad`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        setData(json);
      } catch (err) {
        console.error("Error cargando:", err);
        setError("No se pudieron cargar los datos. Intenta de nuevo más tarde.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <p className="loading">⏳ Cargando datos...</p>;
  if (error) return <p className="error">❌ {error}</p>;
  if (!data) return null;

  const { summary = {}, trends = [], metadata = {} } = data;

  const semesterDist = summary.semester_distribution || {};
  const programDist = summary.program_distribution || {};
  const perfDist = summary.performance_distribution || {};

  // paleta de colores
  const palette = [
    "#4dc9f6",
    "#f67019",
    "#f53794",
    "#537bc4",
    "#acc236",
    "#166a8f",
    "#00a950",
    "#58595b",
    "#8549ba",
    "#ff9f40",
    "#36a2eb",
    "#ff6384",
  ];

  const makeColors = (n) => Array.from({ length: n }, (_, i) => palette[i % palette.length]);

  // 
  const semesterBar = {
    labels: Object.keys(semesterDist),
    datasets: [
      {
        label: "Estudiantes",
        data: Object.values(semesterDist),
        backgroundColor: "rgba(54, 162, 235, 0.6)",
        borderColor: "rgba(54, 162, 235, 1)",
        borderWidth: 1,
      },
    ],
  };

  const programPie = {
    labels: Object.keys(programDist),
    datasets: [
      {
        data: Object.values(programDist),
        backgroundColor: makeColors(Object.keys(programDist).length),
      },
    ],
  };


  const trendsLineGradesAttendance = {
    labels: trends.map((t) => `Semana ${t.week}`),
    datasets: [
      {
        label: "Nota Promedio",
        data: trends.map((t) => t.avg_grade),
        borderWidth: 2,
        tension: 0.25,
        fill: false,
        borderColor: "#2563eb", 
        pointBackgroundColor: "#2563eb",
      },
      {
        label: "Asistencia (%)",
        data: trends.map((t) => Math.round((t.avg_attendance || 0) * 100)),
        borderWidth: 2,
        tension: 0.25,
        fill: false,
        borderColor: "#10b981", 
        pointBackgroundColor: "#10b981",
      },
    ],
  };

  const trendsBarAssignments = {
    labels: trends.map((t) => `Semana ${t.week}`),
    datasets: [
      {
        label: "Tareas promedio",
        data: trends.map((t) => t.avg_assignments),
        backgroundColor: "rgba(249, 115, 22, 0.6)", 
        borderColor: "rgba(249, 115, 22, 1)",
        borderWidth: 1,
      },
    ],
  };

  const commonOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: "top" },
      title: { display: false },
      tooltip: { mode: "index", intersect: false },
    },
    interaction: { mode: "index", intersect: false },
    scales: {
      x: { grid: { display: false } },
      y: { beginAtZero: true }
    }
  };

  const options0to100 = {
    ...commonOptions,
    scales: {
      ...commonOptions.scales,
      y: { beginAtZero: true, max: 100 }
    }
  };

  const optionsAssignments = {
    ...commonOptions,
    scales: {
      ...commonOptions.scales,
      y: { beginAtZero: true, suggestedMax: 5 }
    }
  };

  return (
    <div className="risk-container">
      <h2 className="risk-title">📊 Dashboard Universidad</h2>

      {/* riesgos */}
      <div className="risk-summary">
        <p>
          Total estudiantes: <strong>{summary.total_students ?? "-"}</strong>
        </p>
        <p>
          🔴 Alto: {perfDist.Alto ?? 0} | 🟠 Medio: {perfDist.Medio ?? 0} | 🟢 Bajo: {perfDist.Bajo ?? 0}
        </p>
      </div>

      {/* distribución x semestre */}
      <section className="chart-card">
        <h3>📚 Distribución por semestre</h3>
        <div className="chart-wrap">
          {Object.keys(semesterDist).length ? (
            <Bar data={semesterBar} options={commonOptions} />
          ) : (
            <p>Sin datos de semestres.</p>
          )}
        </div>
      </section>

      {/* distribución x carrera */}
      <section className="chart-card">
        <h3>🎓 Distribución por programa</h3>
        <div className="chart-wrap">
          {Object.keys(programDist).length ? (
            <Pie
              data={programPie}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { position: "right" },
                  tooltip: { callbacks: { label: (ctx) => `${ctx.label}: ${ctx.parsed}` } },
                },
              }}
            />
          ) : (
            <p>Sin datos de programas.</p>
          )}
        </div>
      </section>

      {/* notas y asistencias */}
      <section className="chart-card">
        <h3>📈 Tendencias: Nota y Asistencia (Semanas 9–12)</h3>
        <div className="chart-wrap">
          {trends?.length ? (
            <Line data={trendsLineGradesAttendance} options={options0to100} />
          ) : (
            <p>Sin datos de tendencias.</p>
          )}
        </div>
      </section>

      {/* tareas */}
      <section className="chart-card">
        <h3>🧩 Tendencias: Tareas (Semanas 9–12)</h3>
        <div className="chart-wrap">
          {trends?.length ? (
            <Bar data={trendsBarAssignments} options={optionsAssignments} />
          ) : (
            <p>Sin datos de tendencias.</p>
          )}
        </div>
      </section>

      {/* data extra */}
      <div className="risk-meta">
        <p>Última actualización: {metadata.last_updated ? new Date(metadata.last_updated).toLocaleString() : "-"}</p>
        <p>Período: {metadata.analysis_period ?? "-"}</p>
      </div>


    </div>
  );
}
