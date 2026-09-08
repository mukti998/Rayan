import { useState, useEffect } from "react";

export default function OfflineIndicator() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const handleOffline = () => {
      setIsOffline(true);
      setShowBanner(true);
    };
    const handleOnline = () => {
      setIsOffline(false);
      // Keep banner visible for 3 seconds after reconnection
      setTimeout(() => setShowBanner(false), 3000);
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    // Show banner immediately if already offline
    if (!navigator.onLine) {
      setShowBanner(true);
    }

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  if (!showBanner) return null;

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-50 px-4 py-2 text-center text-sm font-medium transition-all ${
        isOffline
          ? "bg-amber-500 text-white"
          : "bg-emerald-500 text-white"
      }`}
    >
      {isOffline ? (
        <span>
          📡 You're offline — viewing cached data. Changes will sync when
          connection is restored.
        </span>
      ) : (
        <span>✅ Connection restored — syncing data...</span>
      )}
    </div>
  );
}
