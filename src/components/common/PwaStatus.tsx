import { useEffect, useState } from "react";
import { CloudOff, RefreshCw, X } from "lucide-react";
import { useRegisterSW } from "virtual:pwa-register/react";
import type { Copy } from "../../app/content";

export function PwaStatus({ copy }: { copy: Copy }) {
  const [online, setOnline] = useState(() => navigator.onLine);
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (online && !needRefresh) return null;

  return (
    <aside className="pwa-status" role="status" aria-live="polite" aria-atomic="true">
      <div className="pwa-status-copy">
        {needRefresh ? <RefreshCw aria-hidden="true" /> : <CloudOff aria-hidden="true" />}
        <div>
          <strong>{needRefresh ? copy.updateAvailable : copy.offlineTitle}</strong>
          <span>{needRefresh ? copy.updateAvailableText : copy.offlineText}</span>
        </div>
      </div>
      {needRefresh && (
        <div className="pwa-status-actions">
          <button className="primary compact" type="button" onClick={() => void updateServiceWorker(true)}>
            <RefreshCw aria-hidden="true" />
            {copy.updateNow}
          </button>
          <button
            className="icon-button"
            type="button"
            onClick={() => setNeedRefresh(false)}
            aria-label={copy.dismissUpdate}
            title={copy.dismissUpdate}
          >
            <X aria-hidden="true" />
          </button>
        </div>
      )}
    </aside>
  );
}
