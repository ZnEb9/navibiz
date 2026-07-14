"use client";

import dynamic from "next/dynamic";

// Memanggil komponen peta secara dinamis dengan menonaktifkan SSR
const MapComponent = dynamic(() => import("./MapComponent"), {
  ssr: false,
  loading: () => <p style={{ textAlign: "center", padding: "50px" }}>Menginisialisasi Sistem Peta...</p>,
});

export default function HomePage() {
  return (
    <main style={{ fontFamily: "sans-serif", height: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Header Dashboard */}
      <header style={{ background: "#1e293b", color: "#fff", padding: "15px 20px", boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }}>
        <h1 style={{ margin: 0, fontSize: "20px" }}>🗺️ NaviBiz - Dashboard SIG UMKM Jakarta Barat</h1>
        <p style={{ margin: "5px 0 0 0", fontSize: "12px", color: "#cbd5e1" }}>
          Integrasi Next.js, FastAPI Spasial, dan Cloud Database Neon.tech
        </p>
      </header>

      {/* Area Peta */}
      <div style={{ flex: 1, padding: "20px", background: "#f1f5f9" }}>
        <div style={{ height: "100%", width: "100%", background: "#fff", boxShadow: "0 4px 6px rgba(0,0,0,0.05)", borderRadius: "8px" }}>
          <MapComponent />
        </div>
      </div>
    </main>
  );
}