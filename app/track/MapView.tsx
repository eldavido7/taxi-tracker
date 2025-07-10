"use client";

import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  // useMap,
  Polyline,
} from "react-leaflet";
import L from "leaflet";
import { useEffect, useState } from "react";
import { Share2 } from "lucide-react";

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

export default function MapView({ location, driver, session }: Props) {
  const [shareUrl, setShareUrl] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  // const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setShareUrl(`${window.location.origin}/track?sessionId=${session?.id}`);
    }
  }, [session?.id]);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch(`/api/location?sessionId=${session?.id}`);

        if (res.status === 200) {
          const data = await res.json();
          setLastUpdated(new Date(data.updatedAt));
          setIsOffline(false);
        } else if (res.status === 410) {
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
    const interval = setInterval(fetchStatus, 10000);
    return () => clearInterval(interval);
  }, [session?.id]);

  const origin = parseLatLng(session.origin);
  const destination = parseLatLng(session.destination);

  function formatTimeAgo(date: Date): string {
    const diff = Math.floor((Date.now() - date.getTime()) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
  }

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: `Track ${driver.name}`,
          text: `Live session for ${driver.name}`,
          url: shareUrl,
        });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        alert("Link copied to clipboard.");
      }
    } catch (err) {
      console.error("Share failed:", err);
    }
  };

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

        <Marker position={destination}>
          <Popup>
            <div className="text-sm">
              <p className="font-semibold">Destination</p>
              <p>{session.destination}</p>
            </div>
          </Popup>
        </Marker>

        <Polyline positions={[origin, destination]} color="blue" />
      </MapContainer>

      <button
        onClick={handleShare}
        className="absolute bottom-4 right-4 z-[1001] mb-20 rounded-full shadow-lg bg-blue-600 hover:bg-blue-700 text-white p-3"
        aria-label="Share Location"
      >
        <Share2 className="w-6 h-6" />
      </button>

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
