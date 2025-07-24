import React, { useEffect, useState } from "react";

export default function InstallAppButton() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShow(true);
    };
    window.addEventListener("beforeinstallprompt", handler);

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        console.log("App instalado");
      }
      setDeferredPrompt(null);
      setShow(false);
    }
  };

  return (
    show && (
      <div className="mt-4">
        <button className="btn btn-primary btn-lg" onClick={handleInstall}>
          📲 Instalar Web App
        </button>
      </div>
    )
  );
}
