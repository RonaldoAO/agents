import { useState } from 'react';
import TopBar from './components/TopBar';
import Sidebar from './components/Sidebar';
import AgentChat from './components/AgentChat';
import TutorChat from './components/TutorChat';
import Footer from './components/Footer';
import Welcome from './components/Welcome';

export default function App() {
  const [selected, setSelected] = useState(""); // inicio sin selección

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        paddingTop: 90, 
        background: "#ffffff",
      }}
    >
      <TopBar />

      <div style={{ display: "flex", flexGrow: 1 }}>
        <Sidebar onSelect={setSelected} />
        <div style={{ flexGrow: 1, padding: "2rem" }}>
          {selected === "" && <Welcome />}
          {selected === "transcribe" && <AgentChat />}
          {selected === "educativo" && <TutorChat />}
        </div>
      </div>

      <Footer />
    </div>
  );
}
