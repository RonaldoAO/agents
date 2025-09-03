import React from "react";
import "../style/TopBar.css";
import ipeth2 from "../assets/ipeth2.png";

export default function TopBar() {
  return (
    <header className="topbar">
      <div className="topbar-container">
        <a href="/" className="topbar-logo">
         <img src={ipeth2} alt="IPETH" className="topbar-logo-img" /> 
        </a>
      </div>
    </header>
  );
}
