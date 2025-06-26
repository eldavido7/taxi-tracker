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
  const [sharingStarted, setSharingStarted] = useState(false);
  const [hasLocationPermission, setHasLocationPermission] = useState(false);

  const shouldShowStartButton = mode === "tracker" && !sharingStarted;

  // Only set localStorage if mode=tracker
  useEffect(() => {
    if (!driverId) return;
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
  }, [driverId, mode]);

  // Polling effect, only after permission is granted
  useEffect(() => {
    if (!driverId) return;

    // Only post location if isTracking is true and driverId matches and not stopped
    const isTracking =
      typeof window !== "undefined" &&
      localStorage.getItem("isTracking") === "true" &&
      localStorage.getItem("driverId") === driverId &&
      !stopped &&
      (mode !== "tracker" || sharingStarted);

    if (mode === "tracker" && !sharingStarted) {
      // Don't start polling until sharingStarted is true
      return;
    }
    if (mode === "tracker" && !hasLocationPermission) {
      // Don't start polling until permission granted
      return;
    }

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
            setIsOffline(true);
            setLocation(null);
            alert(
              err.code === 1
                ? "Location permission denied. Please allow location access in your browser settings."
                : `Failed to get your location (error ${err.code}): ${err.message}`
            );
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
  }, [driverId, mode, stopped, sharingStarted, hasLocationPermission]);

  // Handler for stopping sharing, passed to MapView
  const handleStopSharing = async () => {
    setStopped(true);
    localStorage.removeItem("driverId");
    localStorage.removeItem("isTracking");
    localStorage.removeItem("lastUpdatedAt");
    await fetch(`/api/location?driverId=${driverId}`, { method: "DELETE" });
  };

  // Button click handler: ask for permission ONCE
  const handleStartSharing = () => {
    if (!("geolocation" in navigator)) {
      alert("Geolocation is not supported by your browser.");
      return;
    }
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setHasLocationPermission(true);
        setSharingStarted(true);
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        navigator.geolocation.clearWatch(watchId); // Only need one update for permission
      },
      (err) => {
        alert(
          err.code === 1
            ? "Location permission denied. Please allow location access in your browser settings."
            : `Failed to get your location (error ${err.code}): ${err.message}`
        );
        setHasLocationPermission(false);
        navigator.geolocation.clearWatch(watchId);
      }
    );
  };

  if (shouldShowStartButton) {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-gray-600">
        {/* iOS-specific guidance */}
        <div className="mb-4 max-w-xs text-center text-white text-sm font-medium">
          <span>
            <b>iPhone/iPad users:</b> If you see &quot;Location permission
            denied&quot;, go to
            <br />
            <b>Settings &gt; Privacy &amp; Security &gt; Location Services</b>,
            <br />
            make sure Location Services are ON, and set Safari (or your browser)
            to &quot;While Using the App&quot;.
          </span>
        </div>
        <button
          className="px-6 py-3 bg-blue-600 text-white rounded shadow text-lg"
          onClick={handleStartSharing}
        >
          Start Sharing Location
        </button>
        <p className="mt-4 text-sm text-gray-500 max-w-xs text-center">
          To protect your privacy, you must tap the button above to allow
          location sharing on your device.
        </p>
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
