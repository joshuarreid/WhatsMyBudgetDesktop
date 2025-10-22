import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

/**
 * useViewsAccordion
 *
 * - Manages measuring the content node and producing a maxHeight string suitable
 *   for a CSS max-height transition.
 * - Uses ResizeObserver when available, falls back to window resize.
 *
 * Args:
 * - viewsOpen: boolean - whether the panel is open (controls measured / 0px)
 * - deps: array - additional dependencies that should trigger re-measure (e.g. views array)
 *
 * Returns:
 * - panelRef: ref to attach to the collapsible panel
 * - maxHeight: string (e.g. "120px" | "0px")
 * - recompute: function to force a measurement (useful after async content loads)
 */
export default function useViewsAccordion(viewsOpen, deps = []) {
    const panelRef = useRef(null);
    const [maxHeight, setMaxHeight] = useState(() => (viewsOpen ? "0px" : "0px"));

    const recompute = useCallback(() => {
        try {
            const el = panelRef.current;
            if (!el) {
                console.debug("[useViewsAccordion] recompute: no panelRef.current");
                return;
            }
            const measured = el.scrollHeight;
            const next = viewsOpen ? `${measured}px` : "0px";
            setMaxHeight(next);
            console.debug("[useViewsAccordion] recompute", { measured, viewsOpen, next });
        } catch (err) {
            console.debug("[useViewsAccordion] recompute failed", err);
        }
    }, [viewsOpen]);

    // Measure synchronously before paint so transition starts from the correct value
    useLayoutEffect(() => {
        recompute();
    }, [recompute, viewsOpen, ...deps]);

    useEffect(() => {
        let ro;
        try {
            if (typeof ResizeObserver !== "undefined") {
                ro = new ResizeObserver(() => {
                    try {
                        if (!panelRef.current) return;
                        // Only adjust when open to avoid layout thrash while closed
                        if (viewsOpen) {
                            const h = panelRef.current.scrollHeight;
                            setMaxHeight(`${h}px`);
                            console.debug("[useViewsAccordion] ResizeObserver -> setMaxHeight", { h });
                        }
                    } catch (err) {
                        console.debug("[useViewsAccordion] ResizeObserver handler failed", err);
                    }
                });
                if (panelRef.current) ro.observe(panelRef.current);
            } else {
                // fallback to window resize
                const onResize = () => {
                    if (!panelRef.current) return;
                    if (viewsOpen) {
                        const h = panelRef.current.scrollHeight;
                        setMaxHeight(`${h}px`);
                        console.debug("[useViewsAccordion] window.resize -> setMaxHeight", { h });
                    }
                };
                window.addEventListener("resize", onResize);
                return () => window.removeEventListener("resize", onResize);
            }
        } catch (err) {
            console.debug("[useViewsAccordion] ResizeObserver setup failed", err);
        }

        return () => {
            try {
                if (ro) ro.disconnect();
            } catch (err) {
                console.debug("[useViewsAccordion] ResizeObserver disconnect failed", err);
            }
        };
    }, [viewsOpen, ...deps]);

    return { panelRef, maxHeight, recompute };
}