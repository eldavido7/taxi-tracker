"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";

const MapView = dynamic(() => import("./MapView"), { ssr: false });

type Driver = {
  name: string;
  phone: string;
  email: string;
};

type Session = {
  id: string;
  driverId: string;
  origin: string;
  destination: string;
  status: string;
  startedAt: string;
  endedAt: string | null;
};

function LiveTrackingContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("sessionId");
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(
    null
  );
  const [driver, setDriver] = useState<Driver | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [destinationCoords, setDestinationCoords] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  useEffect(() => {
    if (!sessionId) return;

    const fetchData = async () => {
      try {
        const [locRes, sessionRes] = await Promise.all([
          fetch(`/api/location?sessionId=${sessionId}`),
          fetch(`/api/sessions/${sessionId}`),
        ]);

        if (locRes.status === 410 || locRes.status === 404) {
          setIsOffline(true);
          setLocation(null);
        } else {
          const locData = await locRes.json();
          if (locData && locData.latitude && locData.longitude) {
            setLocation({ lat: locData.latitude, lng: locData.longitude });
            setIsOffline(false);
          }
        }

        if (sessionRes.ok) {
          const sessionData = await sessionRes.json();
          setSession(sessionData);

          const driverRes = await fetch(`/api/driver/${sessionData.driverId}`);
          if (driverRes.ok) {
            const driverData = await driverRes.json();
            setDriver(driverData);
          }

          const [destLat, destLng] = sessionData.destination
            .split(",")
            .map(Number);
          if (!isNaN(destLat) && !isNaN(destLng)) {
            setDestinationCoords({ lat: destLat, lng: destLng });
          }
        }
      } catch (err) {
        console.error("Error fetching data:", err);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [sessionId]);

  if (!sessionId) {
    return (
      <div className="flex items-center justify-center h-screen text-gray-600">
        Missing sessionId in URL.
      </div>
    );
  }

  if (isOffline) {
    return (
      <div className="flex items-center justify-center h-screen text-gray-600">
        Driver is offline or has stopped sharing.
      </div>
    );
  }

  if (!location || !driver || !session) {
    return (
      <div className="flex items-center justify-center h-screen text-gray-600">
        Loading driver location…
      </div>
    );
  }

  return (
    <MapView
      location={location}
      driver={driver}
      session={session}
      destination={destinationCoords}
    />
  );
}

export default function LiveTrackingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-screen text-gray-600">
          Loading…
        </div>
      }
    >
      <LiveTrackingContent />
    </Suspense>
  );
}
