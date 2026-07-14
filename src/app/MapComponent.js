"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Perbaikan bug ikon Leaflet default yang sering hilang di Next.js
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

export default function MapComponent() {
  const [umkmList, setUmkmList] = useState([]);
  const [loading, setLoading] = useState(true);

  // 1. Ambil data 1.222 UMKM dari Backend Vercel secara otomatis
  useEffect(() => {
    fetch("https://navibiz-x6xv.vercel.app/api/umkm")
      .then((res) => res.json())
      .then((resData) => {
        if (resData.status === "success") {
          setUmkmList(resData.data);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Gagal memuat data UMKM:", err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div style={{ textAlign: "center", padding: "20px" }}>Sedang memuat peta 1.222 UMKM Jakarta Barat...</div>;
  }

  return (
    <MapContainer
      center={[-6.1645, 106.7224]} // Titik tengah otomatis di Jakarta Barat
      zoom={13}
      style={{ height: "100%", width: "100%", borderRadius: "8px" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* 2. Rampingkan visualisasi dengan melakukan pemetaan (mapping) titik koordinat */}
      {umkmList.map((umkm) => (
        <Marker key={umkm.id} position={[umkm.latitude, umkm.longitude]}>
          <Popup>
            <strong>{umkm.nama_umkm}</strong> <br />
            Kategori: {umkm.kategori_amenity || umkm.kategori_shop || "UMKM"}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}