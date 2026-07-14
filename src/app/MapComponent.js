"use client";

import { useEffect, useState } from "react";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";

L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

// Listener Klik Peta Khusus untuk Menangani Radius Search dan Set Titik Awal Rute
function MapClickHandler({ activeTab, radius, setClickedCoords, setRadiusResults, setLoadingRadius, setStartCoords, setRoutePolyline, endCoords, triggerRouteCalculation }) {
  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng;

      // Kasus A: Jika Sedang Berada di Fitur Tab Radius
      if (activeTab === "radius") {
        setClickedCoords({ lat, lng });
        setLoadingRadius(true);
        fetch(`https://navibiz-x6xv.vercel.app/api/radius?lat=${lat}&lon=${lng}&radius_meter=${radius}`)
          .then((res) => res.json())
          .then((resData) => {
            if (resData.status === "success") setRadiusResults(resData.data);
            setLoadingRadius(false);
          })
          .catch(() => { setRadiusResults([]); setLoadingRadius(false); });
      }

      // Kasus B: Jika Sedang Berada di Fitur Tab Rute (Menentukan Titik Asal)
      if (activeTab === "route") {
        setStartCoords({ lat, lng });
        setRoutePolyline([]); // Hapus rute lama jika ada perubahan titik awal
        
        // Jika titik tujuan sudah dipilih duluan, langsung hitung rute otomatis
        if (endCoords) {
          triggerRouteCalculation({ lat, lng }, endCoords);
        }
      }
    },
  });
  return null;
}

export default function MapComponent({ 
  selectedCategory, activeTab, radius, clickedCoords, setClickedCoords, radiusResults, setRadiusResults, setLoadingRadius,
  startCoords, setStartCoords, endCoords, setEndCoords, routePolyline, setRoutePolyline, setTargetUmkmName, setLoadingRoute
}) {
  const [umkmList, setUmkmList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("https://navibiz-x6xv.vercel.app/api/umkm")
      .then((res) => res.json())
      .then((resData) => {
        if (resData.status === "success") setUmkmList(resData.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Fungsi Mandiri Pemicu POST Request Perhitungan Rute Dijkstra ke Backend
  const triggerRouteCalculation = (start, end) => {
    setLoadingRoute(true);
    
    fetch("https://navibiz-x6xv.vercel.app/api/route", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        start_lat: start.lat,
        start_lon: start.lng,
        end_lat: end.lat,
        end_lon: end.lng
      })
    })
      .then((res) => res.json())
      .then((resData) => {
        // Asumsi backend mengembalikan array koordinat: [[lat, lon], [lat, lon], ...] atau struktur GeoJSON
        if (resData.status === "success" && resData.polyline) {
          setRoutePolyline(resData.polyline);
        } else if (Array.isArray(resData)) {
          // Fallback jika backend langsung mengembalikan list array koordinat mentah
          setRoutePolyline(resData);
        }
        setLoadingRoute(false);
      })
      .catch((err) => {
        console.error("Gagal kueri optimasi rute:", err);
        setLoadingRoute(false);
      });
  };

  // Handler khusus ketika salah satu marker UMKM diklik pada mode Rute
  const handleMarkerClickForRoute = (umkm) => {
    if (activeTab !== "route") return;
    
    const targetEnd = { lat: umkm.latitude, lng: umkm.longitude };
    setEndCoords(targetEnd);
    setTargetUmkmName(umkm.nama_umkm);
    
    // Jika titik awal sudah ditentukan user, eksekusi pemanggilan rute
    if (startCoords) {
      triggerRouteCalculation(startCoords, targetEnd);
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", height: "100%", alignItems: "center", justifyContent: "center", background: "#f8fafc" }}>
        <p style={{ color: "#004c54", fontFamily: "sans-serif", fontWeight: "600" }}>🔄 Memuat seluruh data spasial UMKM...</p>
      </div>
    );
  }

  const filteredUmkm = umkmList.filter((umkm) => {
    if (selectedCategory === "all") return true;
    return (umkm.kategori_amenity || "").toLowerCase() === selectedCategory || (umkm.kategori_shop || "").toLowerCase() === selectedCategory;
  });

  return (
    <MapContainer center={[-6.1645, 106.7224]} zoom={13} style={{ height: "100%", width: "100%" }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <MapClickHandler 
        activeTab={activeTab} radius={radius} setClickedCoords={setClickedCoords} setRadiusResults={setRadiusResults} setLoadingRadius={setLoadingRadius}
        setStartCoords={setStartCoords} setRoutePolyline={setRoutePolyline} endCoords={endCoords} triggerRouteCalculation={triggerRouteCalculation}
      />

      {/* RENDER GEOMETRI A: LINGKARAN RADIUS */}
      {activeTab === "radius" && clickedCoords && (
        <Circle center={[clickedCoords.lat, clickedCoords.lng]} radius={radius} pathOptions={{ color: "#f58220", fillColor: "#f58220", fillOpacity: 0.12, weight: 2 }} />
      )}

      {/* RENDER GEOMETRI B: GARIS RUTE JALAN RAYA (POLYLINE) */}
      {activeTab === "route" && routePolyline.length > 0 && (
        <Polyline positions={routePolyline} pathOptions={{ color: "#3b82f6", weight: 5, opacity: 0.8, lineJoin: "round" }} />
      )}

      {/* PIN KHUSUS PENANDA LOKASI AWAL USER (TITIK A) */}
      {activeTab === "route" && startCoords && (
        <Circle center={[startCoords.lat, startCoords.lng]} radius={40} pathOptions={{ color: "#16a34a", fillColor: "#16a34a", fillOpacity: 0.8 }} />
      )}

      {/* RENDER KUMPULAN MARKER UMKM */}
      {activeTab === "radius" && clickedCoords
        ? radiusResults.map((umkm) => (
            <Marker key={`rad-${umkm.id}`} position={[umkm.latitude, umkm.longitude]}>
              <Popup><div style={{ fontFamily: "sans-serif" }}><strong style={{ color: "#004c54" }}>{umkm.nama_umkm}</strong><br />🏃 Jarak: {Math.round(umkm.jarak_meter)} meter</div></Popup>
            </Marker>
          ))
        : filteredUmkm.map((umkm) => (
            <Marker 
              key={umkm.id} 
              position={[umkm.latitude, umkm.longitude]}
              eventHandlers={{ click: () => handleMarkerClickForRoute(umkm) }}
            >
              <Popup>
                <div style={{ fontFamily: "sans-serif", fontSize: "13px" }}>
                  <strong style={{ color: "#004c54", fontSize: "14px" }}>{umkm.nama_umkm}</strong>
                  <hr style={{ margin: "5px 0", border: "0", borderTop: "1px solid #e2e8f0" }} />
                  Kategori: {umkm.kategori_amenity || umkm.kategori_shop || "UMKM"}
                  {activeTab === "route" && <div style={{ color: "#3b82f6", fontWeight: "600", marginTop: "4px" }}>🎯 Dijadikan Target Tujuan Rute</div>}
                </div>
              </Popup>
            </Marker>
          ))
      }
    </MapContainer>
  );
}