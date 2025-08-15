import React, { useEffect, useRef, useState } from "react";

export default function ScrollTopButton({ threshold = 500 }) {
    const [visible, setVisible] = useState(false);
    const ticking = useRef(false);

    useEffect(() => {
        const onScroll = () => {
            if (ticking.current) return;
            ticking.current = true;
            requestAnimationFrame(() => {
                setVisible(window.scrollY > threshold);
                ticking.current = false;
            });
        };
        onScroll();
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, [threshold]);

    const goTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

    return (
        <button
            type="button"
            onClick={goTop}
            aria-label="Voltar ao topo"
            title="Voltar ao topo"
            className={[
                "position-fixed bottom-0 start-0 m-1 z-1",
                "btn btn-primary rounded-pill d-flex align-items-center justify-content-center",
                "px-2 py-2",
                visible ? "" : "opacity-0 pe-none",
                "shadow"
            ].join(" ")}
        >
            <span className="lh-1 fs-5">↑</span>
            <span className="fw-semibold d-none d-sm-inline">Topo</span>
        </button>
    );
}
