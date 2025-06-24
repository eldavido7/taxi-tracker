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

    const updateLocationAndFetch = () => {
      if (!("geolocation" in navigator)) return;

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

            const driverRes = await fetch(`/api/driver/${driverId}`);
            const driverData = await driverRes.json();
            if (driverRes.ok) {
              setDriver(driverData);
            }
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

    return () => clearInterval(interval);
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
