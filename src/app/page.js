"use client";

import { useState } from "react";
import dynamic from "next/dynamic";

const MapComponent = dynamic(() => import("./MapComponent"), {
  ssr: false,
  loading: () => (
    <div style={{ display: "flex", height: "100%", alignItems: "center", justifyContent: "center", background: "#f8fafc" }}>
      <p style={{ color: "#004c54", fontFamily: "sans-serif", fontWeight: "600" }}>🔄 Menginisialisasi Jaringan Peta Spasial...</p>
    </div>
  ),
});

export default function HomePage() {
  const [activeTab, setActiveTab] = useState("filter");
  const [selectedCategory, setSelectedCategory] = useState("all");
  
  // State untuk Tab Radius
  const [radius, setRadius] = useState(2000);
  const [clickedCoords, setClickedCoords] = useState(null);
  const [radiusResults, setRadiusResults] = useState([]);
  const [loadingRadius, setLoadingRadius] = useState(false);

  // ==========================================
  // STATE BARU UNTUK NAVIGASI RUTE DIJKSTRA
  // ==========================================
  const [startCoords, setStartCoords] = useState(null); // Titik Awal klik user
  const [endCoords, setEndCoords] = useState(null);     // Titik Akhir (UMKM)
  const [targetUmkmName, setTargetUmkmName] = useState("");
  const [routePolyline, setRoutePolyline] = useState([]); // Jalur koordinat rute
  const [loadingRoute, setLoadingRoute] = useState(false);

  const colors = {
    tealPrimary: "#004c54",
    orangeAccent: "#f58220",
    bgLight: "#f4f8f9",
    textDark: "#0f172a",
    borderLight: "#e2e8f0"
  };

  // Fungsi Reset Parameter Jika Pindah Fitur Tab
  const handleTabChange = (tabName) => {
    setActiveTab(tabName);
    // Bersihkan sisa kueri tab lain agar tidak bertabrakan visualnya
    setClickedCoords(null);
    setRadiusResults([]);
    setStartCoords(null);
    setEndCoords(null);
    setRoutePolyline([]);
    setTargetUmkmName("");
  };

  return (
    <main style={{ fontFamily: "'Segoe UI', Roboto, sans-serif", height: "100vh", display: "flex", overflow: "hidden", margin: 0 }}>
      
      {/* SIDEBAR KONTROL (SISI KIRI - 30%) */}
      <section style={{ width: "30%", minWidth: "360px", backgroundColor: "#ffffff", boxShadow: "4px 0 24px rgba(0,0,0,0.05)", display: "flex", flexDirection: "column", zIndex: 10 }}>
        
        {/* Header Branding */}
        <div style={{ padding: "16px 24px", backgroundColor: colors.tealPrimary, color: "#ffffff", display: "flex", alignItems: "center", gap: "16px", borderBottom: `4px solid ${colors.orangeAccent}` }}>
          <div style={{ backgroundColor: "#ffffff", padding: "6px 8px", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.15)", flexShrink: 0 }}>
            <img src="/logo.png" alt="Logo NaviBiz" style={{ height: "46px", width: "auto", objectFit: "contain" }} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: "22px", fontWeight: "700", letterSpacing: "-0.5px" }}>NaviBiz</h1>
            <p style={{ margin: "2px 0 0 0", fontSize: "11px", color: "#a3cbd0" }}>Sistem Informasi Geografis UMKM Jakbar</p>
          </div>
        </div>

        {/* Menu Navigasi Fitur Spasial (Tabs) */}
        <div style={{ display: "flex", borderBottom: `1px solid ${colors.borderLight}`, backgroundColor: colors.bgLight }}>
          <button onClick={() => handleTabChange("filter")} style={{ flex: 1, padding: "14px 10px", border: "none", background: activeTab === "filter" ? "#fff" : "transparent", borderBottom: activeTab === "filter" ? `3px solid ${colors.orangeAccent}` : "none", fontWeight: activeTab === "filter" ? "600" : "normal", color: activeTab === "filter" ? colors.tealPrimary : "#64748b", cursor: "pointer" }}>🔍 Filter & Cari</button>
          <button onClick={() => handleTabChange("radius")} style={{ flex: 1, padding: "14px 10px", border: "none", background: activeTab === "radius" ? "#fff" : "transparent", borderBottom: activeTab === "radius" ? `3px solid ${colors.orangeAccent}` : "none", fontWeight: activeTab === "radius" ? "600" : "normal", color: activeTab === "radius" ? colors.tealPrimary : "#64748b", cursor: "pointer" }}>⭕ Radius</button>
          <button onClick={() => handleTabChange("route")} style={{ flex: 1, padding: "14px 10px", border: "none", background: activeTab === "route" ? "#fff" : "transparent", borderBottom: activeTab === "route" ? `3px solid ${colors.orangeAccent}` : "none", fontWeight: activeTab === "route" ? "600" : "normal", color: activeTab === "route" ? colors.tealPrimary : "#64748b", cursor: "pointer" }}>🛣️ Rute Tercepat</button>
        </div>

        {/* Konten Dinamis Tab */}
        <div style={{ flex: 1, padding: "24px", overflowY: "auto", color: colors.textDark }}>
          
          {activeTab === "filter" && (
            <div>
              <h3 style={{ margin: "0 0 16px 0", fontSize: "16px", fontWeight: "600", color: colors.tealPrimary }}>Filter Kategori Bisnis</h3>
              <label style={{ display: "block", fontSize: "14px", marginBottom: "8px", fontWeight: "500" }}>Pilih Jenis UMKM:</label>
              <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} style={{ width: "100%", padding: "10px", borderRadius: "6px", border: `1px solid ${colors.borderLight}`, backgroundColor: "#fff", marginBottom: "20px", outline: "none" }}>
                <option value="all">Semua Data (1.222 UMKM)</option>
                <option value="restaurant">Makanan & Restoran</option>
                <option value="convenience">Toko Kelontong / Minimarket</option>
                <option value="cafe">Kafe (Cafe)</option>
                <option value="supermarket">Supermarket</option>
              </select>
              <div style={{ padding: "12px", background: "#e6f4f5", borderLeft: `4px solid ${colors.tealPrimary}`, borderRadius: "4px", fontSize: "13px", color: colors.tealPrimary }}>
                💡 Peta saat ini menyaring kategori secara *real-time* berdasarkan pilihan di atas.
              </div>
            </div>
          )}

          {activeTab === "radius" && (
            <div>
              <h3 style={{ margin: "0 0 16px 0", fontSize: "16px", fontWeight: "600", color: colors.tealPrimary }}>Analisis Jarak (PostGIS)</h3>
              <label style={{ display: "block", fontSize: "14px", marginBottom: "8px", fontWeight: "500" }}>Jangkauan Radius (Meter):</label>
              <input type="number" value={radius} onChange={(e) => { setRadius(Number(e.target.value)); setClickedCoords(null); setRadiusResults([]); }} style={{ width: "93%", padding: "10px", borderRadius: "6px", border: `1px solid ${colors.borderLight}`, marginBottom: "20px", outline: "none" }} />
              <div style={{ padding: "12px", background: "#fef3c7", borderLeft: `4px solid ${colors.orangeAccent}`, borderRadius: "4px", fontSize: "13px", color: "#b45309", marginBottom: "20px" }}>
                📍 <strong>Cara Pakai:</strong> Tentukan radius meter di atas, lalu **klik di mana saja** pada peta untuk mencari UMKM di sekitarnya.
              </div>
              {loadingRadius && <p style={{ fontSize: "14px", color: colors.tealPrimary, fontWeight: "500" }}>⏳ Memproses data spasial PostGIS...</p>}
              {!loadingRadius && radiusResults.length > 0 && (
                <div>
                  <h4 style={{ margin: "0 0 12px 0", fontSize: "14px", fontWeight: "600", color: colors.tealPrimary }}>📌 Ditemukan {radiusResults.length} UMKM Terdekat:</h4>
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {radiusResults.map((umkm) => (
                      <div key={umkm.id} style={{ padding: "12px", background: "#ffffff", border: `1px solid ${colors.borderLight}`, borderRadius: "8px", borderLeft: `4px solid ${colors.tealPrimary}` }}>
                        <div style={{ fontWeight: "600", fontSize: "14px" }}>{umkm.nama_umkm}</div>
                        <div style={{ display: "inline-block", marginTop: "6px", padding: "3px 6px", background: "#fef3c7", color: "#b45309", borderRadius: "4px", fontSize: "11px", fontWeight: "700" }}>🏃 Jarak: {Math.round(umkm.jarak_meter)} meter</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "route" && (
            <div>
              <h3 style={{ margin: "0 0 16px 0", fontSize: "16px", fontWeight: "600", color: colors.tealPrimary }}>Optimasi Rute (Dijkstra)</h3>
              <div style={{ padding: "12px", background: "#e6f4f5", borderLeft: `4px solid ${colors.tealPrimary}`, borderRadius: "4px", fontSize: "13px", color: colors.tealPrimary, marginBottom: "20px" }}>
                🗺️ <strong>Panduan Rute:</strong> <br />
                1. **Klik di peta** untuk pasang posisi kamu (Awal).<br />
                2. **Klik pin marker UMKM** mana saja untuk target (Tujuan).
              </div>

              {/* Status Panel Koordinat */}
              <div style={{ background: colors.bgLight, padding: "14px", borderRadius: "6px", border: `1px solid ${colors.borderLight}`, fontSize: "13px", display: "flex", display: "flex", flexDirection: "column", gap: "10px", marginBottom: "20px" }}>
                <div>🟢 <strong>Posisi Kamu:</strong> {startCoords ? <span style={{ color: "#16a34a", fontWeight: "600" }}>📍 Tersedia ({startCoords.lat.toFixed(4)}, {startCoords.lng.toFixed(4)})</span> : <span style={{ color: "#64748b" }}>(Klik area peta untuk menetapkan)</span>}</div>
                <div>🔴 <strong>UMKM Tujuan:</strong> {endCoords ? <span style={{ color: "#ef4444", fontWeight: "600" }}>🏢 {targetUmkmName}</span> : <span style={{ color: "#64748b" }}>(Klik marker UMKM di peta)</span>}</div>
              </div>

              {loadingRoute && <p style={{ fontSize: "14px", color: colors.orangeAccent, fontWeight: "600" }}>⚡ Menghitung rute terpendek Dijkstra via OpenStreetMap...</p>}
              
              {routePolyline.length > 0 && (
                <div style={{ padding: "12px", background: "#f0fdf4", borderLeft: "4px solid #16a34a", borderRadius: "4px", fontSize: "13px", color: "#166534" }}>
                  🎉 <strong>Rute Berhasil Dibuat!</strong> Garis rute berwarna biru kini telah digambar melintasi jaringan jalan raya menuju lokasi target.
                </div>
              )}
            </div>
          )}
        </div>

        <div style={{ padding: "16px 24px", borderTop: `1px solid ${colors.borderLight}`, fontSize: "11px", color: "#94a3b8", textAlign: "center", backgroundColor: colors.bgLight }}>
          NaviBiz Kelompok SIG &copy; 2026
        </div>
      </section>

      {/* OPER SELURUH PROPS NAVIGASI KE MAP */}
      <section style={{ flex: 1, height: "100vh", position: "relative" }}>
        <MapComponent 
          selectedCategory={selectedCategory} 
          activeTab={activeTab}
          radius={radius}
          clickedCoords={clickedCoords} setClickedCoords={setClickedCoords}
          radiusResults={radiusResults} setRadiusResults={setRadiusResults}
          setLoadingRadius={setLoadingRadius}
          
          // Props Rute Tambahan
          startCoords={startCoords} setStartCoords={setStartCoords}
          endCoords={endCoords} setEndCoords={setEndCoords}
          routePolyline={routePolyline} setRoutePolyline={setRoutePolyline}
          setTargetUmkmName={setTargetUmkmName}
          setLoadingRoute={setLoadingRoute}
        />
      </section>

    </main>
  );
}