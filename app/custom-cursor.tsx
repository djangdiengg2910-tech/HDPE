"use client";

import { useEffect, useRef } from "react";

const INTERACTIVE_SELECTOR = "button, a, [role='button']";
const CURSOR_ASSETS = [
  "/assets/panda-bamboo-cursor-idle.png",
  "/assets/panda-bamboo-cursor-paw-up.png",
  "/assets/panda-bamboo-cursor-tap.png",
] as const;

/** A mouse-only decorative cursor that never intercepts pointer events. */
export function CustomCursor() {
  const cursorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const cursor = cursorRef.current;
    if (!cursor) return;

    const desktopMouse = window.matchMedia("(hover: hover) and (pointer: fine)");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const root = document.documentElement;
    let cleanup: (() => void) | undefined;
    let assetLoadId = 0;
    let tapTimer: number | undefined;

    const clearTap = () => {
      if (tapTimer !== undefined) window.clearTimeout(tapTimer);
      tapTimer = undefined;
      cursor.classList.remove("is-tapping");
    };

    const deactivate = () => {
      cleanup?.();
      cleanup = undefined;
      clearTap();
      root.classList.remove("has-custom-cursor", "custom-cursor-active");
      cursor.classList.remove("is-visible", "is-hovering", "is-pressed", "is-tapping");
    };

    const activate = () => {
      if (!desktopMouse.matches || reducedMotion.matches || cleanup) return;
      const move = (event: PointerEvent) => {
        if (event.pointerType !== "mouse") return;
        const target = event.target instanceof Element ? event.target : null;
        cursor.style.setProperty("--cursor-x", `${event.clientX}px`);
        cursor.style.setProperty("--cursor-y", `${event.clientY}px`);
        cursor.classList.add("is-visible");
        root.classList.add("custom-cursor-active");
        cursor.classList.toggle("is-hovering", Boolean(target?.closest(INTERACTIVE_SELECTOR)));
      };
      const press = (event: PointerEvent) => {
        if (event.pointerType !== "mouse") return;
        clearTap();
        cursor.classList.add("is-pressed");
      };
      const release = (event: PointerEvent) => {
        if (event.pointerType !== "mouse") return;
        cursor.classList.remove("is-pressed");
        cursor.classList.add("is-tapping");
        tapTimer = window.setTimeout(clearTap, 130);
      };
      const cancel = () => {
        cursor.classList.remove("is-pressed");
        clearTap();
      };
      const hide = () => cursor.classList.remove("is-visible");
      const show = () => cursor.classList.add("is-visible");

      root.classList.add("has-custom-cursor");
      window.addEventListener("pointermove", move, { passive: true });
      document.addEventListener("pointerdown", press, { passive: true });
      document.addEventListener("pointerup", release, { passive: true });
      document.addEventListener("pointercancel", cancel, { passive: true });
      document.addEventListener("pointerleave", hide);
      document.addEventListener("pointerenter", show);
      cleanup = () => {
        window.removeEventListener("pointermove", move);
        document.removeEventListener("pointerdown", press);
        document.removeEventListener("pointerup", release);
        document.removeEventListener("pointercancel", cancel);
        document.removeEventListener("pointerleave", hide);
        document.removeEventListener("pointerenter", show);
      };
    };

    const updateCapability = () => {
      const currentLoad = ++assetLoadId;
      deactivate();
      if (!desktopMouse.matches || reducedMotion.matches) return;
      let loaded = 0;
      CURSOR_ASSETS.forEach((source) => {
        const asset = new Image();
        asset.onload = () => {
          loaded += 1;
          if (loaded === CURSOR_ASSETS.length && currentLoad === assetLoadId) activate();
        };
        asset.onerror = () => {
          if (currentLoad === assetLoadId) deactivate();
        };
        asset.src = source;
      });
    };

    updateCapability();
    desktopMouse.addEventListener("change", updateCapability);
    reducedMotion.addEventListener("change", updateCapability);
    return () => {
      desktopMouse.removeEventListener("change", updateCapability);
      reducedMotion.removeEventListener("change", updateCapability);
      assetLoadId += 1;
      deactivate();
    };
  }, []);

  return <div ref={cursorRef} className="custom-cursor" aria-hidden="true" />;
}
