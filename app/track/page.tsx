"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";

type Driver = {
  name: string;
  phone: string;
  email: string;
};

const MapView = dynamic(() => import("./MapView"), { ssr: false });

function LiveTrackingContent() {
  const searchParams = useSearchParams();
  const driverId = searchParams.get("driverId");
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(
    null
  );
  const [driver, setDriver] = useState<Driver | null>(null);

  useEffect(() => {
    if (!driverId) return;

    // ✅ Store driverId and isTracking in localStorage
    localStorage.setItem("driverId", driverId);
    if (!localStorage.getItem("isTracking")) {
      localStorage.setItem("isTracking", "true");
    }
    localStorage.setItem("lastUpdatedAt", Date.now().toString());

    const lastUpdated = localStorage.getItem("lastUpdatedAt");
    const expiryMs = 60 * 1000; // 1 minute

    if (lastUpdated && Date.now() - Number(lastUpdated) > expiryMs) {
      // Expired — clear storage
      localStorage.removeItem("driverId");
      localStorage.removeItem("isTracking");
      localStorage.removeItem("lastUpdatedAt");
      return; // Don't start polling
    }

    const updateLocationAndFetch = () => {
      if (!("geolocation" in navigator)) return;

      const isTracking = localStorage.getItem("isTracking") === "true";
      if (!isTracking) return; // 🔐 block viewers from sending location

      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude, longitude } = pos.coords;

          try {
            await fetch("/api/location", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ driverId, latitude, longitude }),
            });

            const locRes = await fetch(`/api/location?driverId=${driverId}`);
            const locData = await locRes.json();
            if (locRes.ok && locData.latitude && locData.longitude) {
              setLocation({ lat: locData.latitude, lng: locData.longitude });
            }

            if (locRes.status === 410) {
              console.warn("Location is stale");
              setLocation(null);
              return;
            }

            const driverRes = await fetch(`/api/driver/${driverId}`);
            const driverData = await driverRes.json();
            if (driverRes.ok) {
              setDriver(driverData);
            }
            localStorage.setItem("lastUpdatedAt", Date.now().toString());
          } catch (err) {
            console.error("Error during update:", err);
          }
        },
        (err) => {
          console.error("GPS error", err);
        },
        {
          enableHighAccuracy: true,
          maximumAge: 5000,
          timeout: 10000,
        }
      );
    };

    updateLocationAndFetch();
    const interval = setInterval(updateLocationAndFetch, 5000);

    // ✅ Clear tracking flags
    return () => {
      clearInterval(interval);
    };
  }, [driverId]);

  if (!location || !driver) {
    return (
      <div className="flex items-center justify-center h-screen text-gray-600">
        Loading driver location...
      </div>
    );
  }

  return <MapView location={location} driver={driver} />;
}

export default function LiveTrackingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-screen text-gray-600">
          Loading...
        </div>
      }
    >
      <LiveTrackingContent />
    </Suspense>
  );
}
