import { useEffect, useState } from "react";
import { Bar, Pie } from "react-chartjs-2";
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
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
  LinearScale
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

  const {
    summary = {},
    metadata = {},
    risk_alerts = {},
    risk_breakdown = {},
    students_at_risk = [],
  } = data;

  const programDist = summary.program_distribution || {};
  const perfDist = summary.performance_distribution || {};

  // paleta de colores y mapa de riesgo
  const palette = [
    "#ef4444", 
    "#f59e0b", 
    "#10b981", 
    "#3b82f6",
    "#a855f7",
    "#06b6d4",
    "#f97316",
    "#84cc16",
    "#eab308",
    "#22c55e",
  ];
  const makeColors = (n) => Array.from({ length: n }, (_, i) => palette[i % palette.length]);
  const RISK_COLORS = { Alto: "#ef4444", Medio: "#f59e0b", Bajo: "#10b981" };

  const programPie = {
    labels: Object.keys(programDist),
    datasets: [
      {
        data: Object.values(programDist),
        backgroundColor: makeColors(Object.keys(programDist).length),
      },
    ],
  };

  const riskDonut = {
    labels: ["Alto riesgo", "Riesgo medio", "Bajo riesgo"],
    datasets: [
      {
        data: [perfDist.Alto || 0, perfDist.Medio || 0, perfDist.Bajo || 0],
        backgroundColor: [
          RISK_COLORS.Alto,
          RISK_COLORS.Medio + "99",
          RISK_COLORS.Bajo + "66",
        ],
        borderColor: [RISK_COLORS.Alto, RISK_COLORS.Medio, RISK_COLORS.Bajo],
        borderWidth: 1,
      },
    ],
  };

  const stackedByProgram = (() => {
    const labels = Object.keys(risk_breakdown.by_program || {});
    const alto = labels.map((p) => risk_breakdown.by_program[p]?.Alto || 0);
    const medio = labels.map((p) => risk_breakdown.by_program[p]?.Medio || 0);
    const bajo = labels.map((p) => risk_breakdown.by_program[p]?.Bajo || 0);
    return {
      labels,
      datasets: [
        { label: "Alto riesgo", data: alto, backgroundColor: RISK_COLORS.Alto },
        { label: "Riesgo medio", data: medio, backgroundColor: RISK_COLORS.Medio },
        { label: "Bajo riesgo", data: bajo, backgroundColor: RISK_COLORS.Bajo },
      ],
    };
  })();

  const highRiskBar = {
    labels: Object.keys(risk_alerts.high_risk_by_program || {}),
    datasets: [
      {
        label: "Estudiantes en ALTO riesgo",
        data: Object.values(risk_alerts.high_risk_by_program || {}),
        backgroundColor: RISK_COLORS.Alto + "cc",
        borderColor: RISK_COLORS.Alto,
        borderWidth: 1,
      },
    ],
  };

  const riskScoresBar = (() => {
    const sorted = [...students_at_risk].sort((a, b) => Number(b.risk_score) - Number(a.risk_score));
    return {
      labels: sorted.map((s) => s.name.split(" ")[0] + ` (${s.program.slice(0,3)})`),
      datasets: [
        {
          label: "Risk Score",
          data: sorted.map((s) => Number(s.risk_score)),
          backgroundColor: RISK_COLORS.Alto + "cc",
          borderColor: RISK_COLORS.Alto,
          borderWidth: 1,
        },
      ],
    };
  })();

  const commonOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: "top" },
      title: { display: false },
      tooltip: { mode: "index", intersect: false },
    },
    interaction: { mode: "index", intersect: false },
    scales: { x: { grid: { display: false } }, y: { beginAtZero: true } },
  };

  return (
    <div className="risk-container">
      <h2 className="risk-title">📊 Dashboard Universidad</h2>

      {/* KPIs por nivel de riesgo */}
      <div className="kpi-row">
        <div className="kpi bad">
          <span className="kpi-title">Alto riesgo</span>
          <strong>{perfDist.Alto ?? 0}</strong>
        </div>
        <div className="kpi warn">
          <span className="kpi-title">Riesgo medio</span>
          <strong>{perfDist.Medio ?? 0}</strong>
        </div>
        <div className="kpi good">
          <span className="kpi-title">Bajo riesgo</span>
          <strong>{perfDist.Bajo ?? 0}</strong>
        </div>
      </div>

      {/* resumen general */}
      <div className="risk-summary">
        <p>
          Total estudiantes: <strong>{summary.total_students ?? "-"}</strong>
        </p>
        {risk_alerts?.alert_message ? (
          <p className="muted">⚠️ {risk_alerts.alert_message}</p>
        ) : null}
      </div>

      {/* distribución por programa */}
      <section className="chart-card">
        <h3>🎓 Distribución por programa</h3>
        <div className="chart-wrap">
          {Object.keys(programDist).length ? (
            <Pie data={programPie} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "right" } } }} />
          ) : (
            <p>Sin datos de programas.</p>
          )}
        </div>
      </section>


      {/* Alto riesgo por programa */}
      <section className="chart-card">
        <h3>🚨 ALTO riesgo por programa</h3>
        <div className="chart-wrap">
          <Bar data={highRiskBar} options={commonOptions} />
        </div>
        <small className="muted">{risk_alerts.alert_message || ""}</small>
      </section>

      {/* desglose de riesgo por programa */}
      <section className="chart-card">
        <h3>🧱 Desglose de riesgo por programa</h3>
        <div className="chart-wrap">
          <Bar data={stackedByProgram} options={{ ...commonOptions, scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true } } }} />
        </div>
        <small className="muted">Apilado por nivel (Alto/Medio/Bajo).</small>
      </section>

      {/* Estudiantes en ALTO riesgo */}
      <section className="chart-card">
        <h3>🏷️ Estudiantes en ALTO riesgo (score)</h3>
        <div className="chart-wrap">
          <Bar data={riskScoresBar} options={{ ...commonOptions, scales: { x: { grid: { display: false } }, y: { beginAtZero: true, suggestedMax: 100 } } }} />
        </div>
        <small className="muted">Ordenados por <em>risk score</em>.</small>
      </section>

      {/* data estra */}
      <div className="risk-meta">
        <p>Última actualización: {metadata.last_updated ? new Date(metadata.last_updated).toLocaleString() : "-"}</p>
        <p>Período: {metadata.analysis_period ?? "-"}</p>
      </div>

    </div>
  );
}
