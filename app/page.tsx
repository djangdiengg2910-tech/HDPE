"use client";

import {
  FormEvent,
  KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type CanvasMode = "space" | "reveal" | "wish" | "cake" | "finale";
type WishStatus =
  | "idle"
  | "submitting"
  | "success"
  | "error"
  | "offline"
  | "timeout"
  | "skipped";

type VesselPhase = "flyby" | "open" | "rolling" | "stored";

type StageControls = {
  rotate: (horizontal: number, vertical: number) => void;
  zoom: (amount: number) => void;
  reset: () => void;
};

const birthdayData = {
  recipientName: "Phạm Trường Giang",
  initials: ["P", "T", "G"],
  birthday: "2004-08-15",
  message:
    "Mong bạn luôn giữ được sự tò mò, sự tử tế và bản lĩnh đi đến nơi bạn muốn.\n\nTuổi mới không cần hoàn hảo — chỉ cần có thêm những chuyến đi đáng nhớ, những người thật lòng, và thật nhiều ngày mà bạn thấy mình đang sống đúng ý.\n\nHappy birthday. Cứ rực rỡ theo cách của riêng bạn nhé ✦",
} as const;

const portraitAscii = String.raw`
                 .:-=+++=-:.                 
             .-*%@@@@@@@@@@%*-.              
           .=%@@@@@@@@@@@@@@@@%=.            
          -%@@@@@@@%%%%%@@@@@@@%-            
         =@@@@@@@%*=-::-=*%@@@@@@=           
        +@@@@@@@+.  .--.  .+@@@@@@+          
       =@@@@@@@=   -@@@@-   =@@@@@@=         
       %@@@@@@@.   :@@@@:   .@@@@@@@%        
      :@@@@@@@%     ....     %@@@@@@@:       
      -@@@@@@@%  .-======-.  %@@@@@@@-       
      :@@@@@@@%  =@@@%%@@@=  %@@@@@@@:       
       %@@@@@@@.  .=****=.  .@@@@@@@%        
       =@@@@@@@=     ..     =@@@@@@=         
        +@@@@@@@+.        .+@@@@@@+          
         =@@@@@@@%*=-::-=*%@@@@@@=           
          -%@@@@@@@@%%%%@@@@@@@@%-            
           .=%@@@@@@@@@@@@@@@@%=.             
             .-*%@@@@@@@@@@%*-.               
                 .:-=+++=-:.                  
`;

const sceneNames = [
  "Dramatic intro",
  "Big reveal",
  "Heartfelt wishes",
  "Birthday cake",
  "Make a wish",
  "Blow the candle",
  "Grand finale",
] as const;

function normalizeDateInput(value: string) {
  if (!/^[\d\s/-]*$/.test(value)) {
    return null;
  }

  const digits = value.replace(/\D/g, "");
  if (digits.length !== 8) {
    return null;
  }

  const day = Number(digits.slice(0, 2));
  const month = Number(digits.slice(2, 4));
  const year = Number(digits.slice(4, 8));
  const date = new Date(year, month - 1, day);
  const isCalendarDate =
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day;

  return isCalendarDate ? digits : null;
}

function getBirthdayDigits(isoDate: string) {
  const [year, month, day] = isoDate.split("-");
  return `${day}${month}${year}`;
}

function useReducedMotion() {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  return reducedMotion;
}

function CelebrationCanvas({
  mode,
  reducedMotion,
}: {
  mode: CanvasMode;
  reducedMotion: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }

    let frame = 0;
    let width = 0;
    let height = 0;
    let pixelRatio = 1;

    const stars = Array.from({ length: 72 }, () => ({
      x: Math.random(),
      y: Math.random(),
      size: Math.random() * 1.8 + 0.3,
      speed: Math.random() * 0.00022 + 0.00005,
      opacity: Math.random() * 0.65 + 0.2,
    }));

    const dust = Array.from({ length: 96 }, () => ({
      x: Math.random(),
      y: Math.random(),
      offset: Math.random() * Math.PI * 2,
      radius: Math.random() * 2 + 0.6,
    }));

    const confetti = Array.from({ length: 80 }, () => ({
      x: Math.random(),
      y: Math.random() * -0.5,
      speed: Math.random() * 1.6 + 0.8,
      drift: Math.random() * 0.9 - 0.45,
      size: Math.random() * 6 + 3,
      color: ["#f2be8e", "#c6b4e6", "#a8d4d0", "#e9a7be"][
        Math.floor(Math.random() * 4)
      ],
    }));

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.max(1, Math.floor(width * pixelRatio));
      canvas.height = Math.max(1, Math.floor(height * pixelRatio));
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    };

    const drawStars = (time: number) => {
      for (const star of stars) {
        const y = ((star.y + time * star.speed) % 1) * height;
        context.beginPath();
        context.fillStyle = `rgba(165, 137, 177, ${star.opacity * 0.55})`;
        context.arc(star.x * width, y, star.size, 0, Math.PI * 2);
        context.fill();
      }
    };

    const drawRevealDust = (time: number) => {
      const pulse = (Math.sin(time / 700) + 1) / 2;
      for (const particle of dust) {
        const distance = 0.08 + ((Math.sin(time / 1200 + particle.offset) + 1) / 2) * 0.62;
        const x = width / 2 + (particle.x - 0.5) * width * distance;
        const y = height / 2 + (particle.y - 0.5) * height * distance;
        context.beginPath();
        context.fillStyle = `rgba(240, 174, 183, ${0.2 + pulse * 0.48})`;
        context.arc(x, y, particle.radius + pulse * 0.8, 0, Math.PI * 2);
        context.fill();
      }
    };

    const drawFireworks = (time: number) => {
      const colors = ["#f2be8e", "#c6b4e6", "#a8d4d0", "#e9a7be"];
      for (let burst = 0; burst < 4; burst += 1) {
        const cycle = ((time / 1900 + burst * 0.23) % 1 + 1) % 1;
        const centerX = width * (0.2 + burst * 0.21);
        const centerY = height * (0.22 + ((burst + 1) % 2) * 0.18);
        const radius = 18 + cycle * Math.min(width, height) * 0.19;

        for (let spark = 0; spark < 24; spark += 1) {
          const angle = (Math.PI * 2 * spark) / 24 + burst;
          const x = centerX + Math.cos(angle) * radius;
          const y = centerY + Math.sin(angle) * radius + cycle * cycle * 60;
          context.beginPath();
          context.fillStyle = colors[(spark + burst) % colors.length];
          context.globalAlpha = 1 - cycle;
          context.arc(x, y, 2.2 - cycle * 1.1, 0, Math.PI * 2);
          context.fill();
        }
      }
      context.globalAlpha = 1;

      for (const piece of confetti) {
        const y = ((piece.y + time * piece.speed * 0.00012) % 1.4) * height;
        const x = piece.x * width + Math.sin(time / 440 + piece.drift * 12) * 20;
        context.save();
        context.translate(x, y);
        context.rotate(time / 520 + piece.drift * 7);
        context.fillStyle = piece.color;
        context.globalAlpha = 0.8;
        context.fillRect(-piece.size / 2, -piece.size / 2, piece.size, piece.size * 0.55);
        context.restore();
      }
      context.globalAlpha = 1;
    };

    const draw = (time: number) => {
      context.clearRect(0, 0, width, height);
      drawStars(time);

      if (mode === "reveal") {
        drawRevealDust(time);
      }

      if (mode === "cake") {
        const glow = context.createRadialGradient(
          width / 2,
          height * 0.62,
          0,
          width / 2,
          height * 0.62,
          Math.min(width, height) * 0.48,
        );
        glow.addColorStop(0, "rgba(255, 204, 119, 0.22)");
        glow.addColorStop(1, "rgba(255, 204, 119, 0)");
        context.fillStyle = glow;
        context.fillRect(0, 0, width, height);
      }

      if (mode === "finale") {
        drawFireworks(time);
      }

      if (!reducedMotion) {
        frame = requestAnimationFrame(draw);
      }
    };

    resize();
    draw(performance.now());
    window.addEventListener("resize", resize);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
    };
  }, [mode, reducedMotion]);

  return <canvas className="celebration-canvas" ref={canvasRef} aria-hidden="true" />;
}

function CosmicStage({
  active,
  mode,
  candleOut,
  vesselPhase,
  reducedMotion,
  controlsRef,
}: {
  active: boolean;
  mode: number;
  candleOut: boolean;
  vesselPhase: VesselPhase;
  reducedMotion: boolean;
  controlsRef: { current: StageControls | null };
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const modeRef = useRef(mode);
  const candleOutRef = useRef(candleOut);
  const vesselPhaseRef = useRef(vesselPhase);

  useEffect(() => {
    modeRef.current = mode;
    candleOutRef.current = candleOut;
    vesselPhaseRef.current = vesselPhase;
  }, [candleOut, mode, vesselPhase]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !active) return;

    const context = canvas.getContext("2d");
    if (!context) {
      canvas.classList.add("is-fallback");
      return;
    }
    canvas.classList.remove("is-fallback");

    let frame = 0;
    let width = 1;
    let height = 1;
    let pixelRatio = 1;
    let paused = document.visibilityState === "hidden";
    let previousMode = modeRef.current;
    let sceneStartedAt = performance.now();
    let candleStartedAt = 0;
    let burstStartedAt = 0;
    let yaw = -0.42;
    let pitch = 0.16;
    let zoom = 1;
    let dragging = false;
    let lastPointer = { x: 0, y: 0 };

    const stars = Array.from({ length: reducedMotion ? 74 : 160 }, () => ({
      x: Math.random(),
      y: Math.random(),
      z: Math.random() * 0.9 + 0.1,
      size: Math.random() * 1.35 + 0.25,
      drift: Math.random() * 0.00016 + 0.000025,
      tone: Math.random() > 0.72 ? "#96f5ff" : Math.random() > 0.52 ? "#ffc0e7" : "#eee7ff",
    }));

    const cakePoints = Array.from({ length: reducedMotion ? 380 : 860 }, (_, index) => {
      const section = index % 10;
      const isCandle = section === 0;
      const tier = index % 3;
      const radius = isCandle ? 5 : [27, 35, 44][tier] * Math.sqrt(Math.random());
      const angle = Math.random() * Math.PI * 2;
      const y = isCandle
        ? -58 + Math.random() * 28
        : [-21, 6, 34][tier] + (Math.random() - 0.5) * [17, 20, 22][tier];
      const z = (Math.random() - 0.5) * (isCandle ? 9 : [34, 42, 52][tier]);
      const palette = isCandle
        ? ["#fff6b8", "#ffbf68", "#ff81ad"]
        : tier === 0
          ? ["#fff0b4", "#83f5ea", "#d8b6ff"]
          : tier === 1
            ? ["#ffc0e1", "#ac93ff", "#fff3c3"]
            : ["#ff9cc9", "#b5a0ff", "#88e6fa"];
      return {
        x: Math.cos(angle) * radius,
        y,
        z: z + Math.sin(angle) * radius * 0.25,
        size: Math.random() * 1.35 + 0.65,
        color: palette[index % palette.length],
        flame: isCandle && index % 3 === 0,
      };
    });

    const firework = Array.from({ length: reducedMotion ? 44 : 135 }, (_, index) => ({
      angle: (Math.PI * 2 * index) / (reducedMotion ? 44 : 135) + Math.random() * 0.12,
      speed: Math.random() * 0.78 + 0.23,
      size: Math.random() * 1.9 + 0.7,
      color: ["#fff0a1", "#98f5ff", "#f7a8d6", "#c6a9ff"][index % 4],
    }));

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      canvas.width = Math.floor(width * pixelRatio);
      canvas.height = Math.floor(height * pixelRatio);
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    };

    const reset = () => {
      yaw = -0.42;
      pitch = 0.16;
      zoom = 1;
    };

    controlsRef.current = {
      rotate(horizontal, vertical) {
        yaw += horizontal;
        pitch = Math.max(-0.58, Math.min(0.58, pitch + vertical));
      },
      zoom(amount) {
        zoom = Math.max(0.72, Math.min(1.45, zoom + amount));
      },
      reset,
    };

    const project = (x: number, y: number, z: number, scale: number, centerX: number, centerY: number) => {
      const cosYaw = Math.cos(yaw);
      const sinYaw = Math.sin(yaw);
      const cosPitch = Math.cos(pitch);
      const sinPitch = Math.sin(pitch);
      const x1 = x * cosYaw - z * sinYaw;
      const z1 = x * sinYaw + z * cosYaw;
      const y1 = y * cosPitch - z1 * sinPitch;
      const z2 = y * sinPitch + z1 * cosPitch;
      const perspective = 1 / (1 + Math.max(-0.58, z2 / 260));
      return { x: centerX + x1 * scale * perspective, y: centerY + y1 * scale * perspective, depth: perspective };
    };

    const drawBackdrop = (time: number) => {
      const background = context.createLinearGradient(0, 0, width, height);
      background.addColorStop(0, "#060a26");
      background.addColorStop(0.55, "#100b36");
      background.addColorStop(1, "#040817");
      context.fillStyle = background;
      context.fillRect(0, 0, width, height);

      const nebula = context.createRadialGradient(width * 0.7, height * 0.25, 0, width * 0.7, height * 0.25, Math.max(width, height) * 0.7);
      nebula.addColorStop(0, "rgba(126,82,255,.21)");
      nebula.addColorStop(0.42, "rgba(30,208,244,.09)");
      nebula.addColorStop(1, "rgba(9,4,32,0)");
      context.fillStyle = nebula;
      context.fillRect(0, 0, width, height);

      for (const star of stars) {
        const pulse = reducedMotion ? 1 : 0.64 + Math.sin(time * star.drift * 7 + star.z * 11) * 0.36;
        context.globalAlpha = (0.3 + star.z * 0.7) * pulse;
        context.fillStyle = star.tone;
        context.beginPath();
        context.arc(star.x * width, star.y * height, star.size * pulse, 0, Math.PI * 2);
        context.fill();
      }
      context.globalAlpha = 1;
    };

    const stagePosition = (stageMode: number) => {
      if (stageMode === 3) return { x: width * 0.5, y: height * 0.55, scale: Math.min(width, height) * 0.004 * zoom };
      if (stageMode === 4) return { x: width * 0.5, y: height * 0.22, scale: Math.min(width, height) * 0.00235 };
      return { x: width * 0.5, y: height * 0.7, scale: Math.min(width, height) * 0.0046 };
    };

    const drawCake = (time: number, stageMode: number, opacity = 1) => {
      const position = stagePosition(stageMode);
      const flameIsOut = stageMode >= 5 && candleOutRef.current;
      const points = cakePoints.slice().sort((a, b) => a.z - b.z);
      for (const point of points) {
        if (flameIsOut && point.flame) continue;
        const particle = project(point.x, point.y, point.z, position.scale, position.x, position.y);
        context.globalAlpha = opacity * Math.min(1, 0.38 + particle.depth * 0.62);
        context.fillStyle = point.color;
        context.shadowBlur = point.flame ? 11 : 4;
        context.shadowColor = point.color;
        context.beginPath();
        const flamePulse = point.flame && !reducedMotion ? 0.8 + Math.sin(time / 90 + point.y) * 0.25 : 1;
        context.arc(particle.x, particle.y, point.size * particle.depth * flamePulse, 0, Math.PI * 2);
        context.fill();
      }
      context.globalAlpha = 1;
      context.shadowBlur = 0;
    };

    const drawVessel = (time: number, stageMode: number) => {
      if (stageMode < 4) return;
      const elapsed = time - sceneStartedAt;
      let x = width * 0.5;
      let y = height * 0.64;
      let rotation = 0;
      let size = Math.min(width, height) * 0.14;

      if (stageMode === 4) {
        const arrival = Math.min(1, elapsed / (reducedMotion ? 1 : 1750));
        x = width * (1.17 - arrival * 0.67);
        y = height * (0.18 + arrival * 0.46) - Math.sin(arrival * Math.PI) * height * 0.2;
        rotation = -0.44 + arrival * 0.44;
        size *= 0.78 + arrival * 0.22;
      } else if (stageMode === 5 && candleOutRef.current) {
        if (!candleStartedAt) candleStartedAt = time;
        const launch = Math.min(1, (time - candleStartedAt) / (reducedMotion ? 1 : 3600));
        const orbit = Math.min(1, launch / 0.62);
        const angle = orbit * Math.PI * 2;
        x = width * 0.5 + Math.cos(angle) * width * 0.18 * (1 - Math.max(0, launch - 0.5) * 1.5);
        y = height * 0.45 + Math.sin(angle) * height * 0.13 - Math.max(0, launch - 0.55) * height * 1.5;
        rotation = angle + 0.3;
        size *= 0.9 - launch * 0.35;
      }

      context.save();
      context.translate(x, y);
      context.rotate(rotation);
      const glass = context.createLinearGradient(-size, -size, size, size);
      glass.addColorStop(0, "rgba(229,251,255,.56)");
      glass.addColorStop(0.45, "rgba(103,190,241,.2)");
      glass.addColorStop(1, "rgba(168,119,255,.42)");
      context.fillStyle = glass;
      context.strokeStyle = "rgba(220,247,255,.82)";
      context.lineWidth = Math.max(1, size * 0.045);
      context.beginPath();
      context.roundRect(-size, -size * 0.44, size * 2, size * 0.88, size * 0.42);
      context.fill();
      context.stroke();
      context.fillStyle = "rgba(255,245,203,.92)";
      context.fillRect(-size * 0.16, -size * 0.17, size * 0.82, size * 0.34);
      context.strokeStyle = "rgba(90,51,137,.7)";
      context.strokeRect(-size * 0.16, -size * 0.17, size * 0.82, size * 0.34);
      context.fillStyle = "#dfb75b";
      context.fillRect(-size * 0.62, -size * 0.29, size * 0.22, size * 0.58);
      context.fillStyle = "#3ee8f0";
      context.beginPath();
      context.arc(-size * 0.75, 0, size * 0.13, 0, Math.PI * 2);
      context.fill();
      context.restore();

      if (stageMode === 4 && vesselPhaseRef.current === "rolling") {
        context.strokeStyle = "rgba(255,239,182,.94)";
        context.lineWidth = 2;
        context.beginPath();
        context.moveTo(x + size * 0.5, y);
        context.quadraticCurveTo(x + size * 1.65, y - size * 0.3, x + size * 0.1, y - size * 0.05);
        context.stroke();
      }
    };

    const drawFirework = (time: number) => {
      const elapsed = Math.max(0, time - burstStartedAt);
      const cycle = reducedMotion ? 0.62 : Math.min(1, elapsed / 2200);
      const centerX = width * 0.5;
      const centerY = height * 0.14;
      const radius = Math.min(width, height) * (0.05 + cycle * 0.37);
      for (const spark of firework) {
        const distance = radius * spark.speed;
        context.globalAlpha = (1 - cycle * 0.72) * (0.66 + spark.speed * 0.34);
        context.strokeStyle = spark.color;
        context.fillStyle = spark.color;
        context.lineWidth = Math.max(1, spark.size * (1 - cycle * 0.45));
        const x = centerX + Math.cos(spark.angle) * distance;
        const y = centerY + Math.sin(spark.angle) * distance + cycle * cycle * height * 0.22;
        context.beginPath();
        context.moveTo(centerX + Math.cos(spark.angle) * distance * 0.58, centerY + Math.sin(spark.angle) * distance * 0.58);
        context.lineTo(x, y);
        context.stroke();
        context.beginPath();
        context.arc(x, y, spark.size * (1 - cycle * 0.5), 0, Math.PI * 2);
        context.fill();
      }
      context.globalAlpha = 1;
    };

    const draw = (time: number) => {
      if (paused) return;
      const stageMode = modeRef.current;
      if (stageMode !== previousMode) {
        previousMode = stageMode;
        sceneStartedAt = time;
        candleStartedAt = 0;
        if (stageMode === 6) burstStartedAt = time;
      }
      drawBackdrop(time);
      if (stageMode <= 5) drawCake(time, stageMode);
      if (stageMode >= 4 && stageMode <= 5) drawVessel(time, stageMode);
      if (stageMode === 6) drawFirework(time);
      if (!reducedMotion) frame = requestAnimationFrame(draw);
    };

    const onVisibilityChange = () => {
      paused = document.visibilityState === "hidden";
      if (!paused && !reducedMotion) frame = requestAnimationFrame(draw);
    };
    const onPointerDown = (event: PointerEvent) => {
      if (modeRef.current !== 3) return;
      dragging = true;
      lastPointer = { x: event.clientX, y: event.clientY };
      canvas.setPointerCapture(event.pointerId);
    };
    const onPointerMove = (event: PointerEvent) => {
      if (!dragging) return;
      yaw += (event.clientX - lastPointer.x) * 0.012;
      pitch = Math.max(-0.58, Math.min(0.58, pitch + (event.clientY - lastPointer.y) * 0.008));
      lastPointer = { x: event.clientX, y: event.clientY };
    };
    const onPointerUp = (event: PointerEvent) => {
      dragging = false;
      if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    };
    const onWheel = (event: WheelEvent) => {
      if (modeRef.current !== 3) return;
      event.preventDefault();
      zoom = Math.max(0.72, Math.min(1.45, zoom - event.deltaY * 0.0012));
    };

    resize();
    draw(performance.now());
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", onVisibilityChange);
    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointercancel", onPointerUp);
    canvas.addEventListener("wheel", onWheel, { passive: false });

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerUp);
      canvas.removeEventListener("wheel", onWheel);
      controlsRef.current = null;
    };
  }, [active, controlsRef, reducedMotion]);

  return (
    <>
      <canvas className={`cosmic-stage ${active ? "is-active" : ""}`} ref={canvasRef} aria-hidden="true" />
      <div className="cosmic-fallback-cake" aria-hidden="true" />
    </>
  );
}

function BearTrio({ placement }: { placement: "lock" | "shell" }) {
  return (
    <div className={`bear-trio bear-trio-${placement}`} aria-hidden="true">
      <span className="bear bear-ice"><i /><i /><b /></span>
      <span className="bear bear-grizz"><i /><i /><b /></span>
      <span className="bear bear-panda"><i /><i /><b /></span>
    </div>
  );
}

function PartyDecorations() {
  return (
    <div className="party-decorations" aria-hidden="true">
      <div className="party-garland">{Array.from({ length: 13 }, (_, index) => <i key={index} />)}</div>
      <div className="balloon-cluster balloon-cluster-left"><i /><i /><i /></div>
      <div className="balloon-cluster balloon-cluster-right"><i /><i /><i /></div>
      <div className="rising-balloons">{Array.from({ length: 10 }, (_, index) => <i key={index} />)}</div>
    </div>
  );
}

function BearAntics() {
  return (
    <div className="bear-antics" aria-hidden="true">
      <span className="bear-balloon-rider">
        <i className="ride-balloon ride-balloon-one" />
        <i className="ride-balloon ride-balloon-two" />
        <span className="bear bear-ice"><i /><i /><b /></span>
      </span>
      <span className="bear-rope-hanger">
        <i className="swing-rope" />
        <span className="bear bear-panda"><i /><i /><b /></span>
      </span>
      <span className="bear-garland-runner">
        <span className="bear bear-grizz"><i /><i /><b /></span>
      </span>
    </div>
  );
}

function getCanvasMode(scene: number): CanvasMode {
  if (scene === 1) return "reveal";
  return "space";
}

function getWishStatusText(status: WishStatus) {
  if (status === "success") return "Điều ước đã được cuộn vào lọ và gửi vào vũ trụ ✨";
  if (status === "error") return "Hãy viết một điều ước trước đã nhé.";
  if (status === "offline") return "Bạn đang offline. Bạn vẫn có thể cuộn điều ước vào lọ để tiếp tục.";
  if (status === "timeout") return "Kết nối mất nhiều thời gian hơn dự kiến. Hãy thử lại hoặc tiếp tục.";
  if (status === "skipped") return "Điều ước được giữ riêng trong lọ.";
  return "";
}

export default function Home() {
  const reducedMotion = useReducedMotion();
  const audioRef = useRef<{
    context: AudioContext;
    gain: GainNode;
    oscillators: OscillatorNode[];
  } | null>(null);
  const stageControlsRef = useRef<StageControls | null>(null);
  const wishTimerRef = useRef<number | null>(null);

  const [isUnlocked, setIsUnlocked] = useState(false);
  const [dateInput, setDateInput] = useState("");
  const [dateError, setDateError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [scene, setScene] = useState(0);
  const [wish, setWish] = useState("");
  const [wishStatus, setWishStatus] = useState<WishStatus>("idle");
  const [vesselPhase, setVesselPhase] = useState<VesselPhase>("flyby");
  const [candleOut, setCandleOut] = useState(false);
  const [musicOn, setMusicOn] = useState(false);

  const birthdayDigits = useMemo(() => getBirthdayDigits(birthdayData.birthday), []);

  const stopMusic = useCallback(() => {
    const sound = audioRef.current;
    if (!sound) return;

    const now = sound.context.currentTime;
    sound.gain.gain.cancelScheduledValues(now);
    sound.gain.gain.setTargetAtTime(0.0001, now, 0.08);
    window.setTimeout(() => {
      sound.oscillators.forEach((oscillator) => oscillator.stop());
      sound.context.close().catch(() => undefined);
    }, 180);
    audioRef.current = null;
  }, []);

  const turnMusicOn = useCallback(() => {
    if (audioRef.current || typeof window === "undefined") return;

    try {
      const AudioContextConstructor = window.AudioContext;
      const context = new AudioContextConstructor();
      const gain = context.createGain();
      gain.gain.value = 0.0001;
      gain.connect(context.destination);

      const oscillators = [130.81, 196, 261.63].map((frequency, index) => {
        const oscillator = context.createOscillator();
        oscillator.type = index === 1 ? "triangle" : "sine";
        oscillator.frequency.value = frequency;
        oscillator.detune.value = index === 2 ? 7 : 0;
        oscillator.connect(gain);
        oscillator.start();
        return oscillator;
      });

      gain.gain.exponentialRampToValueAtTime(0.018, context.currentTime + 0.75);
      context.resume().catch(() => undefined);
      audioRef.current = { context, gain, oscillators };
      setMusicOn(true);
    } catch {
      setMusicOn(false);
    }
  }, []);

  useEffect(() => () => stopMusic(), [stopMusic]);

  useEffect(() => {
    if (scene !== 4) return;
    const timer = window.setTimeout(
      () => setVesselPhase("open"),
      reducedMotion ? 1 : 1750,
    );
    return () => window.clearTimeout(timer);
  }, [reducedMotion, scene]);

  useEffect(() => () => {
    if (wishTimerRef.current) window.clearTimeout(wishTimerRef.current);
  }, []);

  useEffect(() => {
    if (!isUnlocked || scene !== 0) return;
    const introDuration = reducedMotion ? 2200 : birthdayData.initials.length * 1350 + 1250;
    const timeout = window.setTimeout(() => setScene(1), introDuration);
    return () => window.clearTimeout(timeout);
  }, [isUnlocked, reducedMotion, scene]);

  useEffect(() => {
    if (!isUnlocked || scene !== 1) return;
    const timeout = window.setTimeout(() => setScene(2), reducedMotion ? 3200 : 6500);
    return () => window.clearTimeout(timeout);
  }, [isUnlocked, reducedMotion, scene]);

  useEffect(() => {
    if (!isUnlocked || scene !== 5 || !candleOut) return;
    const timeout = window.setTimeout(() => setScene(6), reducedMotion ? 700 : 3900);
    return () => window.clearTimeout(timeout);
  }, [candleOut, isUnlocked, reducedMotion, scene]);

  const unlockGift = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedInput = normalizeDateInput(dateInput);
    if (normalizedInput !== birthdayDigits) {
      setAttempt((count) => count + 1);
      setDateError(true);
      return;
    }

    setDateError(false);
    setIsUnlocked(true);
    turnMusicOn();
  };

  const toggleMusic = () => {
    if (musicOn) {
      stopMusic();
      setMusicOn(false);
    } else {
      turnMusicOn();
    }
  };

  const moveTo = (nextScene: number) => {
    const next = Math.max(0, Math.min(nextScene, sceneNames.length - 1));
    if (next === 4) setVesselPhase("flyby");
    setScene(next);
  };

  const storeWishInVessel = () => {
    setVesselPhase("rolling");
    if (wishTimerRef.current) window.clearTimeout(wishTimerRef.current);
    wishTimerRef.current = window.setTimeout(() => {
      setVesselPhase("stored");
      wishTimerRef.current = null;
    }, reducedMotion ? 1 : 720);
  };

  const submitWish = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!wish.trim()) {
      setWishStatus("error");
      return;
    }

    if (!navigator.onLine) {
      setWishStatus("offline");
      return;
    }

    setWishStatus("submitting");
    if (wishTimerRef.current) window.clearTimeout(wishTimerRef.current);
    // Phase 1 deliberately keeps delivery local/mock. The state transitions and
    // duplicate-submit guard are the same ones the Phase 4 API will use.
    wishTimerRef.current = window.setTimeout(() => {
      setWishStatus("success");
      storeWishInVessel();
    }, reducedMotion ? 1 : 820);
  };

  const skipWish = () => {
    setWishStatus("skipped");
    storeWishInVessel();
    window.setTimeout(() => moveTo(5), reducedMotion ? 1 : 820);
  };

  const handleCakeKey = (event: KeyboardEvent<HTMLDivElement>) => {
    const controls = stageControlsRef.current;
    if (!controls) return;
    const keyActions: Record<string, () => void> = {
      ArrowLeft: () => controls.rotate(-0.16, 0),
      ArrowRight: () => controls.rotate(0.16, 0),
      ArrowUp: () => controls.rotate(0, -0.12),
      ArrowDown: () => controls.rotate(0, 0.12),
      "+": () => controls.zoom(0.11),
      "=": () => controls.zoom(0.11),
      "-": () => controls.zoom(-0.11),
      r: controls.reset,
      R: controls.reset,
    };
    const action = keyActions[event.key];
    if (!action) return;
    event.preventDefault();
    action();
  };

  const replay = () => {
    if (wishTimerRef.current) window.clearTimeout(wishTimerRef.current);
    setScene(0);
    setWish("");
    setWishStatus("idle");
    setVesselPhase("flyby");
    setCandleOut(false);
  };

  if (!isUnlocked) {
    return (
      <main className="birthday-page lock-page">
        <CelebrationCanvas mode="space" reducedMotion={reducedMotion} />
        <section className="lock-card" aria-labelledby="lock-title">
          <div className="lock-orb" aria-hidden="true"><span /></div>
          <p className="eyebrow">A private little universe</p>
          <h1 id="lock-title">Có một món quà đang chờ bạn.</h1>
          <p className="lock-copy">Nhập ngày sinh để mở ra nhé ✦</p>
          <form onSubmit={unlockGift} noValidate>
            <label htmlFor="birthday-input">Ngày sinh</label>
            <input
              id="birthday-input"
              className={dateError ? "input-shake" : ""}
              value={dateInput}
              onChange={(event) => {
                setDateInput(event.target.value);
                setDateError(false);
              }}
              placeholder="DD/MM/YYYY"
              inputMode="numeric"
              autoComplete="bday"
              aria-invalid={dateError}
              aria-describedby="date-help date-error"
            />
            <p id="date-help" className="form-help">Ví dụ: 15/08/2004, 15-08-2004 hoặc 15082004</p>
            <p id="date-error" className="form-error" role="status">
              {dateError ? "Chưa đúng rồi — thử lại một lần nữa nhé." : " "}
            </p>
            <button className="primary-button" type="submit">
              Mở món quà <span aria-hidden="true">→</span>
            </button>
          </form>
          <span className="attempt-marker" aria-hidden="true">{attempt > 0 ? "✦" : ""}</span>
          <BearTrio placement="lock" />
        </section>
      </main>
    );
  }

  return (
    <main className={`birthday-page scene-${scene + 1}`}>
      <CelebrationCanvas mode={getCanvasMode(scene)} reducedMotion={reducedMotion} />
      <div className="experience-shell">
        <PartyDecorations />
        <BearAntics />
        <aside className="ascii-panel" aria-label="Chân dung ASCII">
          <div className="ascii-panel-top">
            <span className="ascii-dot" aria-hidden="true" />
            <span>birthday glow</span>
          </div>
          <pre className="ascii-portrait">{portraitAscii}</pre>
          <div className="ascii-caption">
            <strong>{birthdayData.recipientName}</strong>
            <span>pastel bloom / 01</span>
          </div>
        </aside>

        <section className="scene-panel" aria-labelledby="scene-title">
          <CosmicStage
            active={scene >= 3}
            mode={scene}
            candleOut={candleOut}
            vesselPhase={vesselPhase}
            reducedMotion={reducedMotion}
            controlsRef={stageControlsRef}
          />
          <header className="scene-header">
            <div>
              <p className="eyebrow">scene {String(scene + 1).padStart(2, "0")} / 07</p>
              <p className="scene-name">{sceneNames[scene]}</p>
            </div>
            <button className="icon-button" type="button" onClick={toggleMusic} aria-pressed={musicOn}>
              <span aria-hidden="true">{musicOn ? "♫" : "♩"}</span>
              <span className="sr-only">{musicOn ? "Tắt nhạc" : "Bật nhạc"}</span>
            </button>
          </header>

          <div className="progress-track" aria-label={`Tiến trình scene ${scene + 1} trên 7`}>
            <span style={{ width: `${((scene + 1) / 7) * 100}%` }} />
          </div>

          <div className="scene-content">
            {scene === 0 && (
              <section className="intro-scene cinematic-intro" aria-labelledby="scene-title">
                <p className="intro-lead">Một điều bất ngờ đang tiến lại gần...</p>
                <div className="initials-orbit cinematic-initials" aria-label={`Initials ${birthdayData.initials.join(" ")}`}>
                  {birthdayData.initials.map((initial, index) => (
                    <span key={`${initial}-${index}`} aria-hidden="true" style={{ animationDelay: `${index * 1.35}s` }}>{initial}</span>
                  ))}
                </div>
                <button className="text-button" type="button" onClick={() => moveTo(1)}>Bỏ qua hiệu ứng</button>
              </section>
            )}

            {scene === 1 && (
              <section className="reveal-scene" aria-labelledby="scene-title">
                <p className="reveal-kicker">from the stars, with love</p>
                <h1 id="scene-title" className="birthday-title">Happy<br />Birthday</h1>
                <p className="recipient-name">{birthdayData.recipientName}</p>
                <div className="floating-shapes" aria-hidden="true"><i /><i /><i /></div>
                <button className="primary-button" type="button" onClick={() => moveTo(2)}>Đọc lời chúc <span aria-hidden="true">→</span></button>
              </section>
            )}

            {scene === 2 && (
              <section className="message-scene" aria-labelledby="scene-title">
                <div className="glass-card">
                  <p className="card-label">dear {birthdayData.recipientName.split(" ").at(-1)},</p>
                  <p className="birthday-message">{birthdayData.message}</p>
                  <span className="message-signoff">with a little stardust ✦</span>
                </div>
                <button className="primary-button" type="button" onClick={() => moveTo(3)}>Có bánh đang chờ <span aria-hidden="true">→</span></button>
              </section>
            )}

            {scene === 3 && (
              <section className="cake-scene cosmic-scene" aria-labelledby="scene-title">
                <p className="scene-copy">Một chiếc bánh point-cloud đang hội tụ từ bụi sao. Kéo trực tiếp để ngắm kỹ hơn.</p>
                <div
                  className="cake-explorer"
                  tabIndex={0}
                  role="group"
                  aria-label="Vùng điều khiển bánh 3D: dùng các phím mũi tên để xoay, cộng trừ để zoom và R để đặt lại"
                  onKeyDown={handleCakeKey}
                >
                  <span>kéo / vuốt để xoay</span>
                  <div className="cake-controls">
                    <button type="button" className="stage-control" onClick={() => stageControlsRef.current?.zoom(-0.11)} aria-label="Thu nhỏ bánh">−</button>
                    <button type="button" className="stage-control" onClick={() => stageControlsRef.current?.reset()} aria-label="Đặt lại góc bánh">↺</button>
                    <button type="button" className="stage-control" onClick={() => stageControlsRef.current?.zoom(0.11)} aria-label="Phóng to bánh">+</button>
                  </div>
                </div>
                <p className="cake-prompt">Mỗi chấm sáng đều là một lời chúc nhỏ.</p>
                <button className="primary-button" type="button" onClick={() => moveTo(4)}>Ước một điều <span aria-hidden="true">→</span></button>
              </section>
            )}

            {scene === 4 && (
              <section className={`wish-scene cosmic-scene vessel-${vesselPhase}`} aria-labelledby="scene-title">
                <div className="wish-form-wrap">
                  <p className="eyebrow">make a wish</p>
                  <h2 id="scene-title">Viết điều bạn muốn gửi vào vũ trụ.</h2>
                  <p className="wish-disclosure">Tàu-lọ đã hạ cánh. Bản Phase 1 lưu luồng gửi giả lập, nên bạn luôn có thể đi tiếp dù đang offline.</p>
                  <form onSubmit={submitWish}>
                    <label className="sr-only" htmlFor="wish-input">Điều ước của bạn</label>
                    <textarea
                      id="wish-input"
                      maxLength={500}
                      value={wish}
                      onChange={(event) => {
                        setWish(event.target.value);
                        if (wishStatus === "error") setWishStatus("idle");
                      }}
                      placeholder="Ước một điều thật đẹp..."
                    />
                    <div className="wish-actions">
                      <span>{wish.length}/500</span>
                      <button className="primary-button" type="submit" disabled={wishStatus === "submitting"}>
                        {wishStatus === "submitting" ? "Đang gửi..." : "Gửi điều ước"}
                      </button>
                    </div>
                  </form>
                  <div className={`wish-status status-${wishStatus}`} role="status">
                    {getWishStatusText(wishStatus)}
                  </div>
                  <button className="text-button" type="button" onClick={wishStatus === "success" || wishStatus === "skipped" ? () => moveTo(5) : skipWish}>
                    {wishStatus === "success" || wishStatus === "skipped" ? "Tới ngọn nến" : "Cuộn vào lọ và tiếp tục"}
                  </button>
                </div>
              </section>
            )}

            {scene === 5 && (
              <section className="blow-scene cosmic-scene" aria-labelledby="scene-title">
                <p className="eyebrow">one last little thing</p>
                <h2 id="scene-title">Chạm vào ngọn nến để thổi nào.</h2>
                <div className={`candle-stage cosmic-candle-stage ${candleOut ? "candle-blown" : ""}`}>
                  {!candleOut && (
                    <button className="candle-trigger" type="button" onClick={() => setCandleOut(true)}>
                      <span className="sr-only">Thổi tắt ngọn nến</span>
                    </button>
                  )}
                  {candleOut && <div className="wind-trail" aria-hidden="true">≈ ≋ ≈</div>}
                </div>
                <p className="blow-status" role="status">{candleOut ? "Điều ước đã lên đường..." : "Chạm, nhấn Enter hoặc Space vào ngọn nến."}</p>
              </section>
            )}

            {scene === 6 && (
              <section className="finale-scene cosmic-scene" aria-labelledby="scene-title">
                <p className="eyebrow">for this next orbit around the sun</p>
                <h1 id="scene-title">Wishing you<br /><em>all the best!</em> ✦</h1>
                <p className="finale-copy">Từ đúng điểm tàu-lọ bùng nổ, cả bầu trời đã sáng lên. Cứ rực rỡ theo cách của riêng bạn, {birthdayData.recipientName.split(" ").at(-1)} nhé.</p>
                <div className="finale-actions">
                  <button className="primary-button" type="button" onClick={replay}>Xem lại <span aria-hidden="true">↺</span></button>
                  <button className="secondary-button" type="button" onClick={() => moveTo(2)}>Mở lại lời chúc</button>
                </div>
              </section>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
