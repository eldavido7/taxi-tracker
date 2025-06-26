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
  const mode = searchParams.get("mode");
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(
    null
  );
  const [driver, setDriver] = useState<Driver | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [stopped, setStopped] = useState(false);

  useEffect(() => {
    if (!driverId) return;

    // Only set localStorage if mode=tracker
    if (
      typeof window !== "undefined" &&
      mode === "tracker" &&
      (localStorage.getItem("driverId") !== driverId ||
        localStorage.getItem("isTracking") !== "true")
    ) {
      localStorage.setItem("driverId", driverId);
      localStorage.setItem("isTracking", "true");
      localStorage.setItem("lastUpdatedAt", Date.now().toString());
    }

    // Only post location if isTracking is true and driverId matches and not stopped
    const isTracking =
      typeof window !== "undefined" &&
      localStorage.getItem("isTracking") === "true" &&
      localStorage.getItem("driverId") === driverId &&
      !stopped;

    const updateLocationAndFetch = () => {
      if (!("geolocation" in navigator)) return;

      if (isTracking) {
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

              // Fetch location and driver as before
              const locRes = await fetch(`/api/location?driverId=${driverId}`);
              if (locRes.status === 410 || locRes.status === 404) {
                setIsOffline(true);
                setLocation(null);
              } else {
                const locData = await locRes.json();
                if (locData && locData.latitude && locData.longitude) {
                  setLocation({
                    lat: locData.latitude,
                    lng: locData.longitude,
                  });
                  setIsOffline(false);
                }
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
      } else {
        // Viewers only fetch location and driver info
        fetch(`/api/location?driverId=${driverId}`).then(async (res) => {
          if (res.status === 410 || res.status === 404) {
            setIsOffline(true);
            setLocation(null);
          } else {
            const locData = await res.json();
            if (locData && locData.latitude && locData.longitude) {
              setLocation({ lat: locData.latitude, lng: locData.longitude });
              setIsOffline(false);
            }
          }
        });
        fetch(`/api/driver/${driverId}`)
          .then((res) => res.json())
          .then((driverData) => setDriver(driverData));
      }
    };

    updateLocationAndFetch();
    const interval = setInterval(updateLocationAndFetch, 5000);

    // Clear tracking flags on unload if this is the tracker
    const handleUnload = () => {
      if (isTracking) {
        localStorage.removeItem("driverId");
        localStorage.removeItem("isTracking");
        localStorage.removeItem("lastUpdatedAt");
        fetch(`/api/location?driverId=${driverId}`, { method: "DELETE" });
      }
    };
    window.addEventListener("beforeunload", handleUnload);

    return () => {
      clearInterval(interval);
      window.removeEventListener("beforeunload", handleUnload);
    };
  }, [driverId, mode, stopped]);

  // Handler for stopping sharing, passed to MapView
  const handleStopSharing = async () => {
    setStopped(true);
    localStorage.removeItem("driverId");
    localStorage.removeItem("isTracking");
    localStorage.removeItem("lastUpdatedAt");
    await fetch(`/api/location?driverId=${driverId}`, { method: "DELETE" });
  };

  if (isOffline) {
    return (
      <div className="flex items-center justify-center h-screen text-gray-600">
        Driver is offline or has stopped sharing.
      </div>
    );
  }

  if (!location || !driver) {
    return (
      <div className="flex items-center justify-center h-screen text-gray-600">
        Loading driver location...
      </div>
    );
  }

  return (
    <MapView
      location={location}
      driver={driver}
      onStopSharing={handleStopSharing}
    />
  );
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
