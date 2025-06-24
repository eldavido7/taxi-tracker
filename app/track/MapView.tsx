"use client";

import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { useEffect, useState } from "react";
import { Share2, LocateFixed } from "lucide-react";

type Props = {
  location: { lat: number; lng: number };
  driver: { name: string; phone: string; email: string };
};

const DRIVER_ID = "cmc9m0e5d0000epyk3ynnchjn"; // Replace with your actual driver ID

// Fix default icon paths
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: () => string })
  ._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "/leaflet/marker-icon-2x.png",
  iconUrl: "/leaflet/marker-icon.png",
  shadowUrl: "/leaflet/marker-shadow.png",
});

// Helper to recenter map from outside
function RecenterButton({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();

  const handleRecenter = () => {
    map.setView([lat, lng], map.getZoom());
  };

  return (
    <button
      onClick={handleRecenter}
      className="absolute bottom-20 right-4 z-[999] rounded-full shadow-lg bg-gray-100 hover:bg-gray-200 p-2"
      type="button"
      aria-label="Recenter"
    >
      <LocateFixed className="w-5 h-5" />
    </button>
  );
}

export default function MapView({ location, driver }: Props) {
  const [shareUrl, setShareUrl] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setShareUrl(`${window.location.origin}/track?driverId=${DRIVER_ID}`);
    }
  }, [driver]);

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
        alert("Share not supported. Link copied to clipboard.");
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

        <RecenterButton lat={location.lat} lng={location.lng} />
      </MapContainer>

      <button
        onClick={handleShare}
        className="absolute bottom-4 right-4 z-[999] rounded-full shadow-lg bg-blue-600 hover:bg-blue-700 text-white p-3"
        type="button"
        aria-label="Share"
      >
        <Share2 className="w-5 h-5" />
      </button>
    </div>
  );
}
