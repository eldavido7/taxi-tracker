"use client";

import { useEffect, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";

type Driver = {
  name: string;
  phone: string;
  email: string;
};

const DRIVER_ID = "cmc9m0e5d0000epyk3ynnchjn";

export default function DriverQRPage() {
  const [driver, setDriver] = useState<Driver | null>(null);

  useEffect(() => {
    fetch(`/api/driver/${DRIVER_ID}`)
      .then((res) => res.json())
      .then((data) => setDriver(data));
  }, []);

  if (!driver) return <p className="p-4 text-gray-600">Loading...</p>;

  const trackerUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/track?driverId=${DRIVER_ID}&mode=tracker`
      : "";
  // const viewerUrl =
  //   typeof window !== "undefined"
  //     ? `${window.location.origin}/track?driverId=${DRIVER_ID}`
  //     : "";

  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-6 bg-gray-100 text-center">
      <h1 className="text-2xl font-semibold text-gray-800 mb-4">
        QR Code for {driver.name}
      </h1>

      <div className="bg-white p-4 rounded-xl shadow-md">
        <QRCodeCanvas value={trackerUrl} size={256} />
      </div>

      <p className="mt-4 text-sm text-gray-500">
        <b>Scan this code to start sharing your location.</b>
        <br />
        {/* <span className="text-xs text-gray-400">
          (Share this link with yourself only. To share your location with
          others, use the share button after scanning.)
        </span> */}
      </p>

      {/* <code className="mt-2 text-xs text-gray-400 bg-gray-200 px-2 py-1 rounded">
        {trackerUrl}
      </code> */}
      {/* 
      <p className="mt-4 text-sm text-gray-500">
        <b>Viewer link (share this with others):</b>
      </p>
      <code className="mt-2 text-xs text-gray-400 bg-gray-200 px-2 py-1 rounded">
        {viewerUrl}
      </code> */}
    </main>
  );
}
