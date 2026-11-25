import { useEffect, useState } from "react";
import { api } from "../../services/apiClient";

function BackendStatus() {
  const [status, setStatus] = useState("checking");

  useEffect(() => {
    let active = true;

    api
      .get("/v1/health")
      .then(() => {
        if (active) setStatus("connected");
      })
      .catch(() => {
        if (active) setStatus("disconnected");
      });

    return () => {
      active = false;
    };
  }, []);

  const styles = {
    checking: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    connected: "bg-green-500/10 text-green-400 border-green-500/20",
    disconnected: "bg-red-500/10 text-red-400 border-red-500/20",
  };

  const labels = {
    checking: "Checking backend...",
    connected: "Backend connected",
    disconnected: "Backend unavailable",
  };

  return (
    <div
      className={`fixed bottom-4 right-4 z-[45] rounded-full border px-4 py-2 text-xs font-medium shadow-lg backdrop-blur-md ${styles[status]}`}
      role="status"
      aria-live="polite"
    >
      <span className="mr-2">●</span>
      {labels[status]}
    </div>
  );
}

export default BackendStatus;
