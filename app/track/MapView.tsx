"use client";

import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { useEffect, useState, useRef } from "react";
import { Share2, LocateFixed } from "lucide-react";

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
  onStopSharing?: () => void;
};

const DRIVER_ID = "cmc9m0e5d0000epyk3ynnchjn";

// 🔄 Locate button that uses geolocation API
function LocateMeButton() {
  const map = useMap();

  const handleLocate = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        map.setView([latitude, longitude], 15);
      },
      (err) => {
        alert("Failed to get location.");
        console.error("Geolocation error:", err);
      }
    );
  };

  return (
    <button
      onClick={handleLocate}
      className="absolute bottom-20 right-4 mb-20 z-[1001] rounded-full shadow-lg bg-white hover:bg-gray-100 p-3"
      aria-label="Locate Me"
    >
      <LocateFixed className="w-6 h-6 text-gray-800" />
    </button>
  );
}

export default function MapView({ location, driver, onStopSharing }: Props) {
  const [shareUrl, setShareUrl] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Get driverId from localStorage for all logic
  const driverId =
    typeof window !== "undefined" ? localStorage.getItem("driverId") : null;

  // Only show sharing controls if this browser is the tracker
  const isTracker =
    typeof window !== "undefined" &&
    localStorage.getItem("isTracking") === "true" &&
    driverId;

  useEffect(() => {
    // Always share the viewer link (no mode=tracker)
    if (typeof window !== "undefined" && driverId) {
      setShareUrl(`${window.location.origin}/track?driverId=${driverId}`);
    }
  }, [driverId]);

  useEffect(() => {
    const driverId = localStorage.getItem("driverId");
    const lastUpdated = localStorage.getItem("lastUpdatedAt");

    if (driverId && lastUpdated) {
      const expiryMs = 60 * 1000;
      const isExpired = Date.now() - Number(lastUpdated) > expiryMs;

      if (isExpired) {
        localStorage.removeItem("driverId");
        localStorage.removeItem("isTracking");
        localStorage.removeItem("lastUpdatedAt");
      }
    }
  }, []);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch(`/api/location?driverId=${DRIVER_ID}`);

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
    const interval = setInterval(fetchStatus, 10000); // every 10s
    return () => clearInterval(interval);
  }, []);

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: `Track ${driver.name}`,
          text: `Live location for ${driver.name} (${driver.phone})`,
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

  const handleStopSharing = async () => {
    if (onStopSharing) {
      await onStopSharing();
      alert("Location sharing stopped.");
    }

    const driverId = localStorage.getItem("driverId");
    if (!driverId) return;

    try {
      // Stop polling
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }

      // Remove location from backend
      await fetch(`/api/location?driverId=${driverId}`, {
        method: "DELETE",
      });

      // Clear local storage
      localStorage.removeItem("driverId");
      localStorage.removeItem("isTracking");
      localStorage.removeItem("lastUpdatedAt");

      alert("Location sharing stopped.");
      // Optionally, redirect or show a message instead of reloading
      // window.location.reload();
    } catch (error) {
      console.error("Error stopping location sharing:", error);
      alert("Failed to stop sharing location.");
    }
  };

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
        {isTracker && <LocateMeButton />}
      </MapContainer>

      {/* Show share and stop buttons only for tracker */}
      {isTracker && (
        <>
          <button
            onClick={handleShare}
            className="absolute bottom-4 right-4 z-[1001] mb-20 rounded-full shadow-lg bg-blue-600 hover:bg-blue-700 text-white p-3"
            aria-label="Share Location"
          >
            <Share2 className="w-6 h-6" />
          </button>
          <button
            type="button"
            onClick={handleStopSharing}
            className="absolute bottom-4 left-4 z-[1001] mb-20 px-4 py-2 bg-red-600 text-white rounded shadow hover:bg-red-700"
          >
            Stop Sharing
          </button>
        </>
      )}

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
