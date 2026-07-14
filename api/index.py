from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import psycopg2
from psycopg2.extras import RealDictCursor
import os
import networkx as nx
import osmnx as ox
from shapely.geometry import mapping

app = FastAPI(title="NaviBiz API", docs_url="/api/docs", openapi_url="/api/openapi.json")

# Mengaktifkan CORS agar Frontend Next.js bisa mengakses API tanpa terblokir browser
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ambil Connection String Neon.tech dari Environment Variable Vercel nanti
DATABASE_URL = os.getenv("DATABASE_URL")

def get_db_connection():
    return psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)

# =====================================================================
# LOAD GRAPH JALAN UNTUK ROUTING (Dialihkan dari pgRouting ke Backend)
# =====================================================================
print("Loading jaringan jalan Jakarta Barat ke memori server...")
# Mengunduh graf jalan raya Jakarta Barat sekali saat server pertama kali menyala
try:
    G = ox.graph_from_place("Jakarta Barat, Indonesia", network_type="drive")
    # Mengoptimalkan graf untuk pencarian rute terpendek (Dijkstra)
    G = ox.utils_graph.get_largest_component(G, strongly=True)
except Exception as e:
    print(f"Gagal memuat graf jalan OSM: {e}")
    G = None

# =====================================================================
# ENDPOINT 1: AMBIL SEMUA DATA UMKM (Untuk MarkerCluster Leaflet.js)
# =====================================================================
@app.get("/api/umkm")
def get_all_umkm():
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        # Mengubah data geometri Point menjadi format GeoJSON langsung dari database
        query = """
        SELECT id, nama_umkm, kategori_amenity, kategori_shop, latitude, longitude,
               ST_AsGeoJSON(geom)::json as geojson
        FROM umkm;
        """
        cursor.execute(query)
        rows = cursor.fetchall()
        return {"status": "success", "total": len(rows), "data": rows}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()

# =====================================================================
# ENDPOINT 2: RADIUS SEARCH (Menggunakan Fungsi Spasial ST_DWithin)
# =====================================================================
@app.get("/api/radius")
def get_umkm_in_radius(lat: float, lon: float, radius_meter: float):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        # Kueri spasial andalan proyek: memfilter titik berdasarkan jarak lingkaran geografis
        query = """
        SELECT id, nama_umkm, kategori_amenity, kategori_shop, latitude, longitude,
               ST_Distance(geom, ST_SetSRID(ST_MakePoint(%s, %s), 4326)::geography) as jarak_meter
        FROM umkm
        WHERE ST_DWithin(geom::geography, ST_SetSRID(ST_MakePoint(%s, %s), 4326)::geography, %s)
        ORDER BY jarak_meter ASC;
        """
        cursor.execute(query, (lon, lat, lon, lat, radius_meter))
        rows = cursor.fetchall()
        return {"status": "success", "center": {"lat": lat, "lon": lon}, "radius": radius_meter, "total": len(rows), "data": rows}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()

# =====================================================================
# ENDPOINT 3: RUTE NAVIGASI (Algoritma Dijkstra via NetworkX)
# =====================================================================
@app.post("/api/route")
def calculate_route(start_lat: float, start_lon: float, end_lat: float, end_lon: float):
    if G is None:
        raise HTTPException(status_code=500, detail="Sistem graf jaringan jalan tidak aktif.")
    
    try:
        # 1. Cari node terdekat di peta berdasarkan koordinat klik User & koordinat Toko
        orig_node = ox.nearest_nodes(G, X=start_lon, Y=start_lat)
        dest_node = ox.nearest_nodes(G, X=end_lon, Y=end_lat)
        
        # 2. Eksekusi Algoritma Dijkstra untuk mencari rute dengan bobot jarak terpendek (length)
        shortest_path = nx.shortest_path(G, orig_node, dest_node, weight='length')
        
        # 3. Konversi potongan kepingan node jalan menjadi satu garis utuh (LineString GeoJSON)
        route_coords = []
        for node in shortest_path:
            route_coords.append([G.nodes[node]['x'], G.nodes[node]['y']]) # [lon, lat]
        
        return {
            "status": "success",
            "algorithm": "Dijkstra via NetworkX",
            "geometry": {
                "type": "LineString",
                "coordinates": route_coords
            }
        }
    except nx.NetworkNoPath:
        raise HTTPException(status_code=404, detail="Jalur transportasi tidak ditemukan antar titik tersebut.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))