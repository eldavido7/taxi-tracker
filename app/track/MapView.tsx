"use client";

import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
} from "react-leaflet";
import L from "leaflet";
import { useEffect, useState } from "react";
import type { LatLngTuple } from "leaflet";

// Fix default marker icons for leaflet
delete (L.Icon.Default.prototype as unknown as { _getIconUrl: unknown })
  ._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "/leaflet/marker-icon-2x.png",
  iconUrl: "/leaflet/marker-icon.png",
  shadowUrl: "/leaflet/marker-shadow.png",
});

type Props = {
  location: { lat: number; lng: number };
  driver: { name: string; phone: string; email: string };
  session: {
    id: string;
    origin: string;
    destination: string;
    startedAt: string;
    status: string;
  };
  destination?: { lat: number; lng: number } | null;
};

function parseLatLng(coordinate: string): [number, number] {
  const [lat, lng] = coordinate.split(",").map(Number);
  return [lat, lng];
}

export default function MapView({
  location,
  driver,
  session,
  destination,
}: Props) {
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch(`/api/location?sessionId=${session.id}`);
        const sessionRes = await fetch(`/api/sessions/${session.id}`);

        if (sessionRes.ok) {
          const sessionData = await sessionRes.json();
          if (sessionData.status === "ended") {
            setIsOffline(false);
            return; // Let page.tsx handle the ended state
          }
        }

        if (res.status === 200) {
          const data = await res.json();
          setLastUpdated(new Date(data.updatedAt));
          setIsOffline(false);
        } else if (res.status === 410 || res.status === 404) {
          setIsOffline(true);
          setLastUpdated(null);
        } else {
          console.warn("Unexpected response:", res.status);
          setIsOffline(true);
        }
      } catch (err) {
        console.error("Failed to fetch driver status:", err);
        setIsOffline(true);
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 5000); // Match app's polling
    return () => clearInterval(interval);
  }, [session.id]);

  const origin: LatLngTuple = parseLatLng(session.origin);
  const destinationCoords: LatLngTuple = destination
    ? [destination.lat, destination.lng]
    : parseLatLng(session.destination);

  function formatTimeAgo(date: Date): string {
    const diff = Math.floor((Date.now() - date.getTime()) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
  }

  return (
    <div className="relative h-screen w-full">
      <MapContainer
        center={[location.lat, location.lng]}
        zoom={15}
        scrollWheelZoom
        className="h-full w-full"
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="© OpenStreetMap contributors"
        />
        <Marker position={[location.lat, location.lng]}>
          <Popup>
            <div className="text-sm">
              <p className="font-semibold">{driver.name}</p>
              <p>{driver.phone}</p>
              <p>{driver.email}</p>
            </div>
          </Popup>
        </Marker>
        <Marker position={destinationCoords}>
          <Popup>
            <div className="text-sm">
              <p className="font-semibold">Destination</p>
              <p>{session.destination}</p>
            </div>
          </Popup>
        </Marker>
        <Polyline positions={[origin, destinationCoords]} color="blue" />
      </MapContainer>
      <div className="absolute top-4 right-4 bg-white px-3 py-2 rounded shadow text-sm z-[1001]">
        {isOffline ? (
          <span className="text-red-600 font-semibold">Driver is offline</span>
        ) : lastUpdated ? (
          <span className="text-gray-800">
            Last active: {formatTimeAgo(lastUpdated)}
          </span>
        ) : (
          <span>Loading status…</span>
        )}
      </div>
    </div>
  );
}
