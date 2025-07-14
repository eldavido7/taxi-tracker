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
  const [isEnded, setIsEnded] = useState(false);
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

        const sessionData = await sessionRes.json();
        if (!sessionRes.ok) {
          console.error("Error fetching session:", sessionData);
          setIsOffline(true);
          return;
        }

        setSession(sessionData);
        if (sessionData.status === "ended") {
          setIsEnded(true);
          setIsOffline(false);
          setLocation(null);
          return;
        }

        if (locRes.status === 410 || locRes.status === 404) {
          setIsOffline(true);
          setLocation(null);
        } else if (locRes.ok) {
          const locData = await locRes.json();
          if (locData && locData.latitude && locData.longitude) {
            setLocation({ lat: locData.latitude, lng: locData.longitude });
            setIsOffline(false);
          }
        }

        if (!driver && sessionData.driverId) {
          const driverRes = await fetch(`/api/driver/${sessionData.driverId}`);
          if (driverRes.ok) {
            const driverData = await driverRes.json();
            setDriver(driverData);
          }
        }

        const [destLat, destLng] = sessionData.destination
          .split(",")
          .map(Number);
        if (!isNaN(destLat) && !isNaN(destLng)) {
          setDestinationCoords({ lat: destLat, lng: destLng });
        }
      } catch (err) {
        console.error("Error fetching data:", err);
        setIsOffline(true);
      }
    };

    fetchData();
    if (!isEnded) {
      const interval = setInterval(fetchData, 5000); // Match app's polling
      return () => clearInterval(interval);
    }
  }, [sessionId, isEnded, driver]);

  if (!sessionId) {
    return (
      <div className="flex items-center justify-center h-screen text-gray-600">
        Missing sessionId in URL.
      </div>
    );
  }

  if (isEnded) {
    return (
      <div className="flex items-center justify-center font-bold text-4xl h-screen text-black bg-white">
        Trip has ended.
      </div>
    );
  }

  if (isOffline) {
    return (
      <div className="flex items-center justify-center font-bold text-4xl h-screen text-black bg-white">
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
