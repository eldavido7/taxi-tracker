"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { QRCodeCanvas } from "qrcode.react";

type Driver = {
  name: string;
  phone: string;
  email: string;
  // Add other fields as needed
};

export default function DriverQRPage() {
  const { id: driverId } = useParams();
  const [driver, setDriver] = useState<Driver | null>(null);

  useEffect(() => {
    fetch(`/api/driver/${driverId}`)
      .then((res) => res.json())
      .then((data) => setDriver(data));
  }, [driverId]);

  if (!driver) return <p className="p-4 text-gray-600">Loading...</p>;

  const url = `${
    typeof window !== "undefined" ? window.location.origin : ""
  }/track?driverId=${driverId}`;

  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-6 bg-gray-100 text-center">
      <h1 className="text-2xl font-semibold text-gray-800 mb-4">
        QR Code for {driver.name}
      </h1>

      <div className="bg-white p-4 rounded-xl shadow-md">
        <QRCodeCanvas value={url} size={256} />
      </div>

      <p className="mt-4 text-sm text-gray-500">
        Scan this code to open the driver’s live tracking page.
      </p>

      <code className="mt-2 text-xs text-gray-400 bg-gray-200 px-2 py-1 rounded">
        {url}
      </code>
    </main>
  );
}
