import React, { useEffect, useRef, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { ArrowRight, Bot, Calendar, CheckCircle2, Clock, Instagram, Mail, Users, Zap } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { Link } from "react-router-dom";
import type * as THREE_NS from "three";

declare global {
  interface Window {
    Tawk_API?: Record<string, unknown>;
    Tawk_LoadStart?: Date;
  }
}

const FEATURE_ITEMS: { icon: LucideIcon; title: string; description: string }[] = [
  {
    icon: Bot,
    title: "AI Scheduling",
    description:
      "Generate optimized schedules in one click based on availability, skills, and labor laws.",
  },
  {
    icon: Calendar,
    title: "Smart Calendar",
    description:
      "Interactive drag-and-drop calendar with real-time conflict detection and updates.",
  },
  {
    icon: Users,
    title: "Team Management",
    description:
      "Centralized employee profiles, skill tracking, and performance monitoring.",
  },
  {
    icon: Clock,
    title: "Time Tracking",
    description: "Seamless clock-in/out and timesheet management for accurate payroll.",
  },
  {
    icon: CheckCircle2,
    title: "Labor Compliance",
    description: "Automatically flag overtime and break violations before they happen.",
  },
];

function Hero3DBackground() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const prefersReducedMotion = reduceMotion;

    const container = containerRef.current;
    if (!container) return;

    let rafId = 0;
    let isRunning = !prefersReducedMotion;
    let cleanup: undefined | (() => void);

    const init = async () => {
      type ThreeModule = typeof import("three");
      const THREE = (await import("three")) as ThreeModule;

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 100);
      camera.position.set(0, 0, 5.2);

      const renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: false,
        powerPreference: "high-performance",
      });
      renderer.setClearColor(0x000000, 0);
      renderer.setPixelRatio(Math.min(1.5, window.devicePixelRatio || 1));
      container.appendChild(renderer.domElement);

      let group: THREE_NS.Group | undefined;
      let tiles: THREE_NS.InstancedMesh | undefined;
      let ring: THREE_NS.Mesh | undefined;
      let tileBaseX: Float32Array | undefined;
      let tileBaseY: Float32Array | undefined;
      let tileBaseZ: Float32Array | undefined;
      let tileAngle: Float32Array | undefined;
      let tilePhase: Float32Array | undefined;
      let tileDummy: THREE_NS.Object3D | undefined;

      let mouseTargetX = 0;
      let mouseTargetY = 0;
      let mouseX = 0;
      let mouseY = 0;

      const disposeGroup = () => {
        if (!group) return;
        scene.remove(group);
        group.traverse((obj) => {
          const disposable = obj as unknown as {
            geometry?: { dispose?: () => void };
            material?: { dispose?: () => void };
          };
          disposable.geometry?.dispose?.();
          disposable.material?.dispose?.();
        });
        group = undefined;
        tiles = undefined;
        ring = undefined;
        tileBaseX = undefined;
        tileBaseY = undefined;
        tileBaseZ = undefined;
        tileAngle = undefined;
        tilePhase = undefined;
        tileDummy = undefined;
      };

      const buildScene = () => {
        disposeGroup();
        group = new THREE.Group();

        const { width } = container.getBoundingClientRect();
        const count = width < 640 ? 1600 : 3200;
        const positions = new Float32Array(count * 3);
        const colors = new Float32Array(count * 3);

        const colorA = new THREE.Color(0x22c55e);
        const colorB = new THREE.Color(0xffffff);

        for (let i = 0; i < count; i++) {
          const i3 = i * 3;
          const r = 1.55 + Math.random() * 0.75;
          const theta = Math.random() * Math.PI * 2;
          const phi = Math.acos(2 * Math.random() - 1);

          const x = r * Math.sin(phi) * Math.cos(theta);
          const y = r * Math.cos(phi);
          const z = r * Math.sin(phi) * Math.sin(theta);

          positions[i3] = x;
          positions[i3 + 1] = y;
          positions[i3 + 2] = z;

          const mix = Math.random() * 0.75;
          const c = colorA.clone().lerp(colorB, mix);
          colors[i3] = c.r;
          colors[i3 + 1] = c.g;
          colors[i3 + 2] = c.b;
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

        const material = new THREE.PointsMaterial({
          size: 0.02,
          sizeAttenuation: true,
          transparent: true,
          opacity: 0.9,
          vertexColors: true,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        });

        group.add(new THREE.Points(geometry, material));

        const wireGeom = new THREE.IcosahedronGeometry(1.6, 1);
        const wireMat = new THREE.MeshBasicMaterial({
          color: 0x22c55e,
          wireframe: true,
          transparent: true,
          opacity: 0.16,
        });
        group.add(new THREE.Mesh(wireGeom, wireMat));

        const wireGeom2 = new THREE.IcosahedronGeometry(2.35, 0);
        const wireMat2 = new THREE.MeshBasicMaterial({
          color: 0xffffff,
          wireframe: true,
          transparent: true,
          opacity: 0.05,
        });
        const outer = new THREE.Mesh(wireGeom2, wireMat2);
        group.add(outer);

        const tileCount = width < 640 ? 72 : 120;
        tileBaseX = new Float32Array(tileCount);
        tileBaseY = new Float32Array(tileCount);
        tileBaseZ = new Float32Array(tileCount);
        tileAngle = new Float32Array(tileCount);
        tilePhase = new Float32Array(tileCount);
        tileDummy = new THREE.Object3D();

        const tileGeom = new THREE.BoxGeometry(0.26, 0.14, 0.06);
        const tileMat = new THREE.MeshBasicMaterial({
          transparent: true,
          opacity: 0.6,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          vertexColors: true,
        });
        tiles = new THREE.InstancedMesh(tileGeom, tileMat, tileCount);
        tiles.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

        const tileColorA = new THREE.Color(0x22c55e);
        const tileColorB = new THREE.Color(0xffffff);

        for (let i = 0; i < tileCount; i++) {
          const a = (i / tileCount) * Math.PI * 2;
          const r = 1.75 + Math.random() * 0.95;
          const x = Math.cos(a) * r;
          const z = Math.sin(a) * r;
          const y = (Math.random() - 0.5) * 0.75;

          tileBaseX[i] = x;
          tileBaseY[i] = y;
          tileBaseZ[i] = z;
          tileAngle[i] = a;
          tilePhase[i] = Math.random() * Math.PI * 2;

          const mix = Math.random() * 0.45;
          tiles.setColorAt(i, tileColorA.clone().lerp(tileColorB, mix));

          tileDummy.position.set(x, y, z);
          tileDummy.rotation.set(0.35, a, 0);
          tileDummy.scale.set(1, 1, 1);
          tileDummy.updateMatrix();
          tiles.setMatrixAt(i, tileDummy.matrix);
        }
        tiles.instanceMatrix.needsUpdate = true;
        if (tiles.instanceColor) tiles.instanceColor.needsUpdate = true;
        group.add(tiles);

        const ringGeom = new THREE.TorusGeometry(1.28, 0.02, 6, width < 640 ? 120 : 180);
        const ringMat = new THREE.MeshBasicMaterial({
          color: 0x22c55e,
          transparent: true,
          opacity: 0.2,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        });
        ring = new THREE.Mesh(ringGeom, ringMat);
        ring.rotation.x = Math.PI / 2.45;
        group.add(ring);

        scene.add(group);
      };

      const resize = () => {
        const rect = container.getBoundingClientRect();
        const w = Math.max(1, Math.floor(rect.width));
        const h = Math.max(1, Math.floor(rect.height));
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h, false);
        buildScene();
      };

      const renderFrame = (time: number) => {
        if (!group) return;
        const t = time * 0.00035;
        const t2 = time * 0.001;

        mouseX += (mouseTargetX - mouseX) * 0.06;
        mouseY += (mouseTargetY - mouseY) * 0.06;

        group.rotation.y = t * 0.75 + mouseX * 0.2;
        group.rotation.x = Math.sin(t * 0.9) * 0.22 - mouseY * 0.18;
        group.rotation.z = Math.cos(t * 0.6) * 0.08;

        if (tiles && tileDummy && tileBaseX && tileBaseY && tileBaseZ && tileAngle && tilePhase) {
          const n = tileBaseX.length;
          for (let i = 0; i < n; i++) {
            const phase = tilePhase[i];
            const bob = Math.sin(t2 * 0.9 + phase) * 0.12;
            const wobble = Math.cos(t2 * 0.7 + phase) * 0.08;
            const pulse = 1 + Math.sin(t2 * 0.6 + phase) * 0.06;

            tileDummy.position.set(tileBaseX[i], tileBaseY[i] + bob, tileBaseZ[i]);
            tileDummy.rotation.set(0.32 + wobble, tileAngle[i] + t * 0.6, wobble * 0.25);
            tileDummy.scale.set(1, pulse, 1);
            tileDummy.updateMatrix();
            tiles.setMatrixAt(i, tileDummy.matrix);
          }
          tiles.instanceMatrix.needsUpdate = true;
        }

        if (ring) {
          const pulse = 1 + Math.sin(t2 * 0.55) * 0.025;
          ring.scale.setScalar(pulse);
          ring.rotation.z = t * 1.1;
        }

        camera.position.x = mouseX * 0.65;
        camera.position.y = -mouseY * 0.35;
        camera.position.z = 5.2 + Math.sin(t * 0.7) * 0.12;
        camera.lookAt(0, 0, 0);
        renderer.render(scene, camera);
      };

      const loop = (time: number) => {
        renderFrame(time);
        if (!isRunning) return;
        rafId = window.requestAnimationFrame(loop);
      };

      const onVisibilityChange = () => {
        const shouldRun = !document.hidden && !prefersReducedMotion;
        if (shouldRun === isRunning) return;
        isRunning = shouldRun;
        if (isRunning) {
          rafId = window.requestAnimationFrame(loop);
        } else {
          window.cancelAnimationFrame(rafId);
        }
      };

      const onPointerMove = (event: PointerEvent) => {
        const rect = container.getBoundingClientRect();
        const w = Math.max(1, rect.width);
        const h = Math.max(1, rect.height);
        const nx = (event.clientX - rect.left) / w - 0.5;
        const ny = (event.clientY - rect.top) / h - 0.5;
        mouseTargetX = Math.max(-0.5, Math.min(0.5, nx));
        mouseTargetY = Math.max(-0.5, Math.min(0.5, ny));
      };

      resize();
      window.addEventListener("resize", resize, { passive: true });
      document.addEventListener("visibilitychange", onVisibilityChange);
      if (!prefersReducedMotion) {
        window.addEventListener("pointermove", onPointerMove, { passive: true });
      }

      if (prefersReducedMotion) {
        renderFrame(0);
      } else {
        rafId = window.requestAnimationFrame(loop);
      }

      return () => {
        window.cancelAnimationFrame(rafId);
        window.removeEventListener("resize", resize);
        document.removeEventListener("visibilitychange", onVisibilityChange);
        window.removeEventListener("pointermove", onPointerMove);
        disposeGroup();
        renderer.dispose();
        if (renderer.domElement && renderer.domElement.parentNode) {
          renderer.domElement.parentNode.removeChild(renderer.domElement);
        }
      };
    };

    void init().then((maybeCleanup) => {
      cleanup = maybeCleanup;
    });

    return () => {
      cleanup?.();
    };
  }, [reduceMotion]);

  return (
    <div ref={containerRef} aria-hidden className="pointer-events-none absolute inset-0" />
  );
}

function CTA3DBackground() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let rafId = 0;
    let cleanup: undefined | (() => void);

    const init = async () => {
      type ThreeModule = typeof import("three");
      const THREE = (await import("three")) as ThreeModule;

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
      camera.position.set(0, 0.2, 4.6);

      const renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: false,
        powerPreference: "high-performance",
      });
      renderer.setClearColor(0x000000, 0);
      renderer.setPixelRatio(Math.min(1.35, window.devicePixelRatio || 1));
      container.appendChild(renderer.domElement);

      let group: THREE_NS.Group | undefined;
      let isVisible = true;
      let isRunning = !reduceMotion;

      const disposeGroup = () => {
        if (!group) return;
        scene.remove(group);
        group.traverse((obj) => {
          const disposable = obj as unknown as {
            geometry?: { dispose?: () => void };
            material?: { dispose?: () => void };
          };
          disposable.geometry?.dispose?.();
          disposable.material?.dispose?.();
        });
        group = undefined;
      };

      const buildScene = () => {
        disposeGroup();
        group = new THREE.Group();

        const { width } = container.getBoundingClientRect();
        const count = width < 640 ? 900 : 1700;
        const positions = new Float32Array(count * 3);
        const colors = new Float32Array(count * 3);

        const colorA = new THREE.Color(0x22c55e);
        const colorB = new THREE.Color(0xffffff);

        for (let i = 0; i < count; i++) {
          const i3 = i * 3;
          const r = 1.2 + Math.random() * 1.25;
          const theta = Math.random() * Math.PI * 2;
          const phi = Math.acos(2 * Math.random() - 1);

          positions[i3] = r * Math.sin(phi) * Math.cos(theta);
          positions[i3 + 1] = r * Math.cos(phi) * 0.85;
          positions[i3 + 2] = r * Math.sin(phi) * Math.sin(theta);

          const mix = Math.random() * 0.65;
          const c = colorA.clone().lerp(colorB, mix);
          colors[i3] = c.r;
          colors[i3 + 1] = c.g;
          colors[i3 + 2] = c.b;
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

        const material = new THREE.PointsMaterial({
          size: 0.018,
          sizeAttenuation: true,
          transparent: true,
          opacity: 0.85,
          vertexColors: true,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        });
        group.add(new THREE.Points(geometry, material));

        const knotGeom = new THREE.TorusKnotGeometry(0.95, 0.28, width < 640 ? 80 : 110, 12);
        const knotMat = new THREE.MeshBasicMaterial({
          color: 0x22c55e,
          wireframe: true,
          transparent: true,
          opacity: 0.12,
        });
        const knot = new THREE.Mesh(knotGeom, knotMat);
        knot.rotation.x = Math.PI / 2.8;
        group.add(knot);

        const ringGeom = new THREE.TorusGeometry(1.55, 0.02, 6, width < 640 ? 120 : 180);
        const ringMat = new THREE.MeshBasicMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: 0.05,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        });
        const ring = new THREE.Mesh(ringGeom, ringMat);
        ring.rotation.x = Math.PI / 2.25;
        group.add(ring);

        scene.add(group);
      };

      const resize = () => {
        const rect = container.getBoundingClientRect();
        const w = Math.max(1, Math.floor(rect.width));
        const h = Math.max(1, Math.floor(rect.height));
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h, false);
        buildScene();
      };

      const updateRunning = () => {
        const shouldRun = isVisible && !document.hidden && !reduceMotion;
        if (shouldRun === isRunning) return;
        isRunning = shouldRun;
        if (isRunning) {
          rafId = window.requestAnimationFrame(loop);
        } else {
          window.cancelAnimationFrame(rafId);
        }
      };

      const renderFrame = (time: number) => {
        if (!group) return;
        const t = time * 0.00028;
        const pulse = 1 + Math.sin(time * 0.00055) * 0.02;
        group.rotation.y = t * 1.15;
        group.rotation.x = Math.sin(t * 0.9) * 0.12;
        group.scale.setScalar(pulse);
        renderer.render(scene, camera);
      };

      const loop = (time: number) => {
        renderFrame(time);
        if (!isRunning) return;
        rafId = window.requestAnimationFrame(loop);
      };

      const onVisibilityChange = () => {
        updateRunning();
      };

      const observer = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          isVisible = Boolean(entry?.isIntersecting);
          updateRunning();
        },
        { threshold: 0.08 },
      );
      observer.observe(container);

      resize();
      window.addEventListener("resize", resize, { passive: true });
      document.addEventListener("visibilitychange", onVisibilityChange);

      if (reduceMotion) {
        renderFrame(0);
      } else {
        rafId = window.requestAnimationFrame(loop);
      }

      return () => {
        observer.disconnect();
        window.cancelAnimationFrame(rafId);
        window.removeEventListener("resize", resize);
        document.removeEventListener("visibilitychange", onVisibilityChange);
        disposeGroup();
        renderer.dispose();
        if (renderer.domElement && renderer.domElement.parentNode) {
          renderer.domElement.parentNode.removeChild(renderer.domElement);
        }
      };
    };

    void init().then((maybeCleanup) => {
      cleanup = maybeCleanup;
    });

    return () => {
      cleanup?.();
    };
  }, [reduceMotion]);

  return (
    <div ref={containerRef} aria-hidden className="pointer-events-none absolute inset-0 opacity-80" />
  );
}

function useTawkToWidget() {
  useEffect(() => {
    const propertyId = (import.meta.env.VITE_TAWK_PROPERTY_ID as string | undefined) ?? "";
    const widgetId = (import.meta.env.VITE_TAWK_WIDGET_ID as string | undefined) ?? "";

    if (!propertyId || !widgetId) return;
    if (typeof window === "undefined") return;

    const existing = document.getElementById("tawkto-script");
    if (existing) return;

    window.Tawk_API = window.Tawk_API ?? {};
    window.Tawk_LoadStart = new Date();

    const script = document.createElement("script");
    script.id = "tawkto-script";
    script.async = true;
    script.src = `https://embed.tawk.to/${propertyId}/${widgetId}`;
    script.charset = "UTF-8";
    script.setAttribute("crossorigin", "*");

    const firstScript = document.getElementsByTagName("script")[0];
    if (firstScript?.parentNode) {
      firstScript.parentNode.insertBefore(script, firstScript);
    } else {
      document.head.appendChild(script);
    }
  }, []);
}

function FloatingHeroBadges() {
  const reduceMotion = useReducedMotion();

  const floatA = reduceMotion
    ? undefined
    : {
        y: [0, -10, 0],
        rotate: [0, -2, 0],
        transition: { duration: 6.5, repeat: Infinity, ease: "easeInOut" as const },
      };

  const floatB = reduceMotion
    ? undefined
    : {
        y: [0, 12, 0],
        rotate: [0, 3, 0],
        transition: { duration: 8, repeat: Infinity, ease: "easeInOut" as const, delay: 0.3 },
      };

  const floatC = reduceMotion
    ? undefined
    : {
        y: [0, -8, 0],
        rotate: [0, 2, 0],
        transition: { duration: 7.2, repeat: Infinity, ease: "easeInOut" as const, delay: 0.6 },
      };

  const badgeClass =
    "pointer-events-none select-none rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md shadow-[0_0_60px_rgba(34,197,94,0.15)]";

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-[5]">
      <motion.div
        animate={floatA}
        className={`${badgeClass} absolute left-6 top-24 hidden items-center gap-3 px-4 py-3 md:flex`}
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <Calendar className="h-5 w-5" />
        </div>
        <div>
          <div className="text-sm font-semibold text-white">Drag & drop</div>
          <div className="text-xs text-gray-400">Smart calendar</div>
        </div>
      </motion.div>

      <motion.div
        animate={floatB}
        className={`${badgeClass} absolute right-6 top-28 hidden items-center gap-3 px-4 py-3 md:flex`}
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <Clock className="h-5 w-5" />
        </div>
        <div>
          <div className="text-sm font-semibold text-white">Real-time</div>
          <div className="text-xs text-gray-400">Shift updates</div>
        </div>
      </motion.div>

      <motion.div
        animate={floatC}
        className={`${badgeClass} absolute bottom-10 left-1/2 hidden -translate-x-1/2 items-center gap-3 px-4 py-3 md:flex`}
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <Users className="h-5 w-5" />
        </div>
        <div>
          <div className="text-sm font-semibold text-white">Team-ready</div>
          <div className="text-xs text-gray-400">Invite & notify</div>
        </div>
      </motion.div>
    </div>
  );
}

function ScheduleMiniPreview() {
  const reduceMotion = useReducedMotion();

  return (
    <div className="mb-6 overflow-hidden rounded-xl border border-white/10 bg-black/30 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-sm font-semibold text-white">Schedule preview</div>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <span className="h-2 w-2 rounded-full bg-primary" />
          <span>Live updates</span>
        </div>
      </div>

      <div className="mb-2 grid grid-cols-7 gap-1 text-[10px] text-gray-500">
        {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
          <div key={`${d}-${i}`} className="text-center">
            {d}
          </div>
        ))}
      </div>

      <div className="relative h-20 rounded-lg bg-white/5">
        {!reduceMotion && (
          <motion.div
            className="absolute inset-0 opacity-40"
            animate={{ x: ["-35%", "35%"] }}
            transition={{ duration: 4.5, repeat: Infinity, ease: "linear" }}
            style={{
              background:
                "linear-gradient(90deg, transparent, rgba(34,197,94,0.18), transparent)",
            }}
          />
        )}

        <motion.div
          className="absolute left-[6%] top-[14%] h-3 rounded-md bg-primary/70"
          animate={reduceMotion ? undefined : { x: [0, 10, 0] }}
          transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut" }}
          style={{ width: "56%" }}
        />
        <motion.div
          className="absolute left-[22%] top-[42%] h-3 rounded-md bg-white/35"
          animate={reduceMotion ? undefined : { x: [0, -8, 0] }}
          transition={{ duration: 4.1, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
          style={{ width: "44%" }}
        />
        <motion.div
          className="absolute left-[12%] top-[70%] h-3 rounded-md bg-primary/45"
          animate={reduceMotion ? undefined : { x: [0, 6, 0] }}
          transition={{ duration: 3.8, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
          style={{ width: "64%" }}
        />
      </div>
    </div>
  );
}

export default function LandingPage() {
  useTawkToWidget();
  const privacyKey = "smartcrew:privacyConsent:v1";
  const [hasPrivacyConsent, setHasPrivacyConsent] = useState(() => {
    try {
      return window.localStorage.getItem(privacyKey) === "accepted";
    } catch {
      return true;
    }
  });

  const acceptPrivacyConsent = () => {
    try {
      window.localStorage.setItem(privacyKey, "accepted");
    } catch {
      // ignore
    }
    setHasPrivacyConsent(true);
  };

  const openSupportChat = () => {
    const apply = () => {
      const api = (window as unknown as { Tawk_API?: { showWidget?: () => void; maximize?: () => void } }).Tawk_API;
      if (!api) return false;
      api.showWidget?.();
      api.maximize?.();
      return true;
    };

    if (apply()) return;
    window.setTimeout(apply, 250);
    window.setTimeout(apply, 900);
  };

  return (
    <div className="min-h-screen bg-black text-white selection:bg-primary selection:text-black">
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden">
        <Hero3DBackground />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/10 via-black to-black opacity-60" />
        <FloatingHeroBadges />
        <div className="container mx-auto px-6 relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-primary text-sm font-medium mb-6">
              <Zap className="h-4 w-4" />
              <span>AI-Powered Scheduling is Here</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-r from-white via-gray-200 to-gray-400">
              Build Smart Schedules <br />
              <span className="text-primary">That Actually Work</span>
            </h1>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-8">
              Automate your workforce management with AI. Create conflict-free schedules, track time, and optimize labor costs in seconds.
            </p>
            <div className="flex flex-col md:flex-row items-center justify-center gap-4">
              <Link to="/signup">
                <Button size="lg" className="bg-primary hover:bg-primary/90 text-black font-bold h-12 px-8 text-lg">
                  Start for Free <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Button 
                size="lg" 
                variant="outline" 
                className="h-12 px-8 text-lg border-white/20 bg-transparent hover:bg-white/10 text-white hover:text-white focus:text-white"
                onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
              >
                View Demo
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 bg-zinc-950" id="features">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Everything you need to manage your team</h2>
            <p className="text-gray-400">Streamline operations with our comprehensive suite of tools.</p>
          </div>

          <div className="relative -mx-6 md:mx-0 overflow-hidden">
            <div
              className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-gradient-to-r from-zinc-950 to-transparent md:w-20"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-zinc-950 to-transparent md:w-20"
              aria-hidden
            />

            <div className="flex w-max motion-reduce:animate-none animate-marquee hover:[animation-play-state:paused]">
              <div className="flex gap-6 px-3 md:gap-8 md:px-0">
                {FEATURE_ITEMS.map((item) => (
                  <div key={item.title} className="w-[min(85vw,300px)] shrink-0 md:w-[300px]">
                    <FeatureCard
                      icon={<item.icon className="h-8 w-8 text-primary" aria-hidden />}
                      title={item.title}
                      description={item.description}
                    />
                  </div>
                ))}
              </div>
              <div className="flex gap-6 px-3 md:gap-8 md:px-0" aria-hidden>
                {FEATURE_ITEMS.map((item) => (
                  <div key={`${item.title}-dup`} className="w-[min(85vw,300px)] shrink-0 md:w-[300px]">
                    <FeatureCard
                      icon={<item.icon className="h-8 w-8 text-primary" aria-hidden />}
                      title={item.title}
                      description={item.description}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 bg-black" id="pricing">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Simple, Transparent Pricing</h2>
            <p className="text-gray-400">Choose the plan that fits your team's needs.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
             {/* Starter Plan */}
             <div className="p-8 rounded-2xl bg-zinc-900 border border-zinc-800 flex flex-col">
                <h3 className="text-xl font-bold text-white mb-2">Free</h3>
                <div className="text-4xl font-bold text-white mb-4">$0<span className="text-lg text-gray-400 font-normal">/mo</span></div>
                <p className="text-gray-400 mb-6">Everything you need to start scheduling for free.</p>
                <ul className="space-y-3 mb-8 flex-1">
                    <li className="flex items-center text-gray-300"><CheckCircle2 className="h-5 w-5 text-primary mr-2" /> Scheduling (draft + publish)</li>
                    <li className="flex items-center text-gray-300"><CheckCircle2 className="h-5 w-5 text-primary mr-2" /> Time tracking</li>
                    <li className="flex items-center text-gray-300"><CheckCircle2 className="h-5 w-5 text-primary mr-2" /> Reports & exports</li>
                </ul>
                <Link to="/signup" className="mt-auto w-full">
                    <Button className="w-full bg-zinc-800 hover:bg-zinc-700 text-white">Get Started</Button>
                </Link>
             </div>
             
             {/* Pro Plan */}
             <div className="p-8 rounded-2xl bg-zinc-900 border-2 border-primary relative flex flex-col transform md:-translate-y-4">
                <div className="absolute top-0 right-0 bg-primary text-black text-xs font-bold px-3 py-1 rounded-bl-lg rounded-tr-lg">POPULAR</div>
                <h3 className="text-xl font-bold text-white mb-2">Pro</h3>
                <div className="text-4xl font-bold text-white mb-4">$5<span className="text-lg text-gray-400 font-normal">/mo</span></div>
                <p className="text-gray-400 mb-6">Upgrade for notifications and automation.</p>
                <ul className="space-y-3 mb-8 flex-1">
                    <li className="flex items-center text-gray-300"><CheckCircle2 className="h-5 w-5 text-primary mr-2" /> Email alerts for shift changes</li>
                    <li className="flex items-center text-gray-300"><CheckCircle2 className="h-5 w-5 text-primary mr-2" /> AI auto-scheduling</li>
                    <li className="flex items-center text-gray-300"><CheckCircle2 className="h-5 w-5 text-primary mr-2" /> Priority support</li>
                    <li className="flex items-center text-gray-300"><CheckCircle2 className="h-5 w-5 text-primary mr-2" /> Everything in Free</li>
                </ul>
                <Link to="/signup" className="mt-auto w-full">
                    <Button className="w-full bg-primary hover:bg-primary/90 text-black font-bold">Get Pro</Button>
                </Link>
             </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="py-20 bg-zinc-950" id="about">
        <div className="container mx-auto px-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                <div>
                    <h2 className="text-3xl md:text-4xl font-bold mb-6">About SmartCrew</h2>
                    <p className="text-gray-400 mb-6 leading-relaxed">
                        SmartCrew was born from a simple idea: scheduling shouldn't be a headache. We believe that technology should empower managers to focus on their people, not spreadsheets.
                    </p>
                    <p className="text-gray-400 mb-8 leading-relaxed">
                        Our mission is to revolutionize workforce management through intelligent automation, making it easier for businesses to optimize their operations while improving work-life balance for employees.
                    </p>
                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <div className="text-3xl font-bold text-primary mb-2">10k+</div>
                            <div className="text-sm text-gray-500">Active Users</div>
                        </div>
                        <div>
                            <div className="text-3xl font-bold text-primary mb-2">99%</div>
                            <div className="text-sm text-gray-500">Customer Satisfaction</div>
                        </div>
                    </div>
                </div>
                <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-transparent rounded-2xl transform rotate-3"></div>
                    <div className="bg-zinc-900 p-8 rounded-2xl border border-zinc-800 relative z-10">
                        <ScheduleMiniPreview />
                        <h3 className="text-xl font-bold mb-4">Our Values</h3>
                        <ul className="space-y-4">
                            <li className="flex items-start">
                                <div className="h-6 w-6 rounded-full bg-primary/20 text-primary flex items-center justify-center mr-3 mt-1 text-sm">1</div>
                                <div>
                                    <h4 className="font-bold text-white">Innovation First</h4>
                                    <p className="text-sm text-gray-400">Constantly pushing the boundaries of what's possible with AI.</p>
                                </div>
                            </li>
                            <li className="flex items-start">
                                <div className="h-6 w-6 rounded-full bg-primary/20 text-primary flex items-center justify-center mr-3 mt-1 text-sm">2</div>
                                <div>
                                    <h4 className="font-bold text-white">User-Centric</h4>
                                    <p className="text-sm text-gray-400">Designed for real people, solving real problems.</p>
                                </div>
                            </li>
                            <li className="flex items-start">
                                <div className="h-6 w-6 rounded-full bg-primary/20 text-primary flex items-center justify-center mr-3 mt-1 text-sm">3</div>
                                <div>
                                    <h4 className="font-bold text-white">Reliability</h4>
                                    <p className="text-sm text-gray-400">Systems you can trust to run your business 24/7.</p>
                                </div>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
      </section>

      <section className="py-20 bg-black" id="faq">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Frequently Asked Questions</h2>
            <p className="text-gray-400">Quick answers to common questions about SmartCrew Scheduler.</p>
          </div>

          <div className="mx-auto max-w-3xl space-y-3">
            <details className="group rounded-xl border border-white/10 bg-white/5 p-5">
              <summary className="flex cursor-pointer list-none items-center justify-between text-base font-semibold text-white">
                What is SmartCrew Scheduler?
                <span className="text-gray-400 transition-transform group-open:rotate-180">▾</span>
              </summary>
              <div className="mt-3 text-sm text-gray-300 leading-relaxed">
                SmartCrew Scheduler helps teams create schedules faster, track time, and view reports from one dashboard.
              </div>
            </details>

            <details className="group rounded-xl border border-white/10 bg-white/5 p-5">
              <summary className="flex cursor-pointer list-none items-center justify-between text-base font-semibold text-white">
                Can employees see admin settings?
                <span className="text-gray-400 transition-transform group-open:rotate-180">▾</span>
              </summary>
              <div className="mt-3 text-sm text-gray-300 leading-relaxed">
                No. Employees only see what they need for their shifts, profile, time clock, and time-off requests.
              </div>
            </details>

            <details className="group rounded-xl border border-white/10 bg-white/5 p-5">
              <summary className="flex cursor-pointer list-none items-center justify-between text-base font-semibold text-white">
                How do I invite employees?
                <span className="text-gray-400 transition-transform group-open:rotate-180">▾</span>
              </summary>
              <div className="mt-3 text-sm text-gray-300 leading-relaxed">
                Admins and managers can add employees from the Employees page and send invitations by email.
              </div>
            </details>

            <details className="group rounded-xl border border-white/10 bg-white/5 p-5">
              <summary className="flex cursor-pointer list-none items-center justify-between text-base font-semibold text-white">
                How do I contact support?
                <span className="text-gray-400 transition-transform group-open:rotate-180">▾</span>
              </summary>
              <div className="mt-3 text-sm text-gray-300 leading-relaxed">
                Email{" "}
                <a className="text-primary hover:underline" href="mailto:smartcrewscheduler@gmail.com">
                  smartcrewscheduler@gmail.com
                </a>{" "}
                or use the support chat widget on the home page.
              </div>
            </details>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative overflow-hidden py-20 bg-primary/10">
        <CTA3DBackground />
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div className="absolute -top-24 left-1/2 h-72 w-[42rem] -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" />
          <div className="absolute -bottom-28 left-1/3 h-72 w-[42rem] -translate-x-1/2 rounded-full bg-white/5 blur-3xl" />
          <div
            className="absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage:
                "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.9) 1px, transparent 0)",
              backgroundSize: "26px 26px",
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/5 to-black/20" />
        </div>

        <div className="container mx-auto px-6 text-center relative z-10">
          <h2 className="text-4xl font-bold mb-6">Ready to transform your scheduling?</h2>
          <p className="text-xl text-gray-400 mb-8 max-w-2xl mx-auto">
            Join thousands of businesses saving time and money with SmartCrew Scheduler.
          </p>
          <Link to="/signup">
            <Button size="lg" className="bg-primary hover:bg-primary/90 text-black font-bold h-14 px-10 text-xl">
              Get Started Now
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-black border-t border-white/10">
        <div className="container mx-auto px-6">
          <div className="flex flex-col gap-10 md:grid md:grid-cols-2 md:items-start">
            <div className="order-1 space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
                  <Zap className="h-5 w-5 text-primary-foreground" />
                </div>
                <span className="text-xl font-bold text-white">SmartCrew Scheduler</span>
              </div>
              <div className="hidden md:block text-gray-500 text-sm">© 2026 SmartCrew Scheduler. All rights reserved.</div>
            </div>

            <div className="order-2 grid grid-cols-1 gap-8 sm:grid-cols-2 md:justify-items-end">
              <div className="space-y-3">
                <div className="text-sm font-semibold text-white">Quick Links</div>
                <div className="flex flex-col gap-2 text-sm text-gray-400">
                  <a href="#features" className="hover:text-white transition-colors">
                    Features
                  </a>
                  <a href="#pricing" className="hover:text-white transition-colors">
                    Pricing
                  </a>
                  <Link to="/login" className="hover:text-white transition-colors">
                    Login
                  </Link>
                  <Link to="/signup" className="hover:text-white transition-colors">
                    Sign Up
                  </Link>
                </div>
              </div>

              <div className="space-y-3 sm:text-right">
                <div className="text-sm font-semibold text-white">Connect with us</div>
                <div className="flex items-center gap-2 sm:justify-end">
                  <a
                    href="mailto:smartcrewscheduler@gmail.com"
                    className="inline-flex items-center justify-center rounded-md border border-white/10 bg-white/5 p-2 text-gray-300 transition-colors hover:bg-white/10 hover:text-white"
                    aria-label="Email SmartCrew Scheduler"
                  >
                    <Mail className="h-5 w-5" aria-hidden />
                  </a>
                  <a
                    href="https://www.instagram.com/smartcrewscheduler?igsh=MXhpb2FwaXo3YWkydA%3D%3D&utm_source=qr"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center rounded-md border border-white/10 bg-white/5 p-2 text-gray-300 transition-colors hover:bg-white/10 hover:text-white"
                    aria-label="SmartCrew Scheduler on Instagram"
                  >
                    <Instagram className="h-5 w-5" aria-hidden />
                  </a>
                </div>

                <div className="flex flex-col gap-2 text-sm text-gray-500 sm:items-end">
                  <Link to="/privacy" className="hover:text-white transition-colors">
                    Privacy Policy
                  </Link>
                  <Link to="/terms" className="hover:text-white transition-colors">
                    Terms
                  </Link>
                  <button
                    type="button"
                    onClick={openSupportChat}
                    className="text-left hover:text-white transition-colors sm:text-right"
                  >
                    Contact Support
                  </button>
                </div>
              </div>
            </div>

            <div className="order-3 border-t border-white/10 pt-8 text-center text-gray-500 text-sm md:hidden">
              © 2026 SmartCrew Scheduler. All rights reserved.
            </div>
          </div>
        </div>
      </footer>

      {!hasPrivacyConsent && (
        <div className="fixed bottom-4 left-4 right-4 z-50 rounded-xl border border-white/10 bg-black/95 backdrop-blur md:left-6 md:right-auto md:max-w-xl">
          <div className="px-4 py-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="text-sm text-gray-300">
              By using SmartCrew Scheduler, you agree to our privacy terms.
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Link to="/privacy">
                <Button
                  type="button"
                  variant="outline"
                  className="border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white"
                >
                  Learn more
                </Button>
              </Link>
              <Button
                type="button"
                className="bg-primary hover:bg-primary/90 text-black font-bold"
                onClick={acceptPrivacyConsent}
              >
                Accept
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <motion.div 
      whileHover={{ y: -5 }}
      className="p-8 rounded-2xl bg-white/5 border border-white/10 hover:border-primary/50 transition-colors"
    >
      <div className="mb-4">{icon}</div>
      <h3 className="text-xl font-bold mb-3 text-white">{title}</h3>
      <p className="text-gray-400 leading-relaxed">{description}</p>
    </motion.div>
  );
}
