"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three-stdlib";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

const OBLIQUITY = THREE.MathUtils.degToRad(23.44);
const YEAR_MS = 1000 * 60 * 60 * 24 * 365;
const START_EPOCH = Date.UTC(2025, 2, 20); // March 20, 2025 (near vernal equinox)

function seasonLabel(phase: number) {
  const angle = (phase % 1) * 2 * Math.PI;
  // 0 -> vernal equinox
  if (angle >= 0 && angle < Math.PI / 2) return "Northern Spring / Southern Autumn";
  if (angle >= Math.PI / 2 && angle < Math.PI) return "Northern Summer / Southern Winter";
  if (angle >= Math.PI && angle < (3 * Math.PI) / 2)
    return "Northern Autumn / Southern Spring";
  return "Northern Winter / Southern Summer";
}

function dateLabel(phase: number) {
  const ms = START_EPOCH + phase * YEAR_MS;
  const d = new Date(ms);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function subsolarLatitude(phase: number) {
  // declination δ = ε * sin(orbital angle)
  return THREE.MathUtils.radToDeg(OBLIQUITY * Math.sin(phase * 2 * Math.PI));
}

export default function Page() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const orbitPhaseRef = useRef(0.18); // start around June solstice-ish
  const uiSyncRef = useRef(0);
  const [phase, setPhase] = useState(0.18);
  const [isPlaying, setIsPlaying] = useState(true);
  const [heatVisible, setHeatVisible] = useState(true);
  const [heatOpacity, setHeatOpacity] = useState(0.85);
  const [showClouds, setShowClouds] = useState(true);
  const [showOrbit, setShowOrbit] = useState(true);
  const [spinRate, setSpinRate] = useState(1);
  const controlsRef = useRef({
    heatVisible: true,
    heatOpacity: 0.85,
    showClouds: true,
    showOrbit: true,
    spinRate: 1,
    isPlaying: true,
  });

  const stats = useMemo(() => {
    const decl = subsolarLatitude(phase);
    return {
      date: dateLabel(phase),
      season: seasonLabel(phase),
      decl,
      hemisphere: decl > 0 ? "Sun over Northern Hemisphere" : decl < 0 ? "Sun over Southern Hemisphere" : "Directly over equator",
    };
  }, [phase]);

  // keep a mutable snapshot for the renderer loop
  useEffect(() => {
    controlsRef.current.heatVisible = heatVisible;
  }, [heatVisible]);

  useEffect(() => {
    controlsRef.current.heatOpacity = heatOpacity;
  }, [heatOpacity]);

  useEffect(() => {
    controlsRef.current.showClouds = showClouds;
  }, [showClouds]);

  useEffect(() => {
    controlsRef.current.showOrbit = showOrbit;
  }, [showOrbit]);

  useEffect(() => {
    controlsRef.current.spinRate = spinRate;
  }, [spinRate]);

  useEffect(() => {
    controlsRef.current.isPlaying = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    if (!mountRef.current) return;

    const container = mountRef.current;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#030712");

    const camera = new THREE.PerspectiveCamera(
      55,
      mountRef.current.clientWidth / mountRef.current.clientHeight,
      0.1,
      200,
    );

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.maxDistance = 40;
    controls.minDistance = 4;

    // Planetary system container (lets us nudge left to make room for UI)
    const system = new THREE.Group();
    system.position.x = -3.5;
    scene.add(system);

    // Lighting & sun
    const sun = new THREE.PointLight(0xffffff, 2.8, 0, 2);
    sun.position.set(0, 0, 0);
    system.add(sun);

    const sunMesh = new THREE.Mesh(
      new THREE.SphereGeometry(2.6, 48, 48),
      new THREE.MeshBasicMaterial({ color: 0xffe29f }),
    );
    system.add(sunMesh);

    // Starfield backdrop
    const starTexture = new THREE.TextureLoader().load("/textures/starfield.png");
    starTexture.colorSpace = THREE.SRGBColorSpace;
    const starfield = new THREE.Mesh(
      new THREE.SphereGeometry(140, 64, 64),
      new THREE.MeshBasicMaterial({ map: starTexture, side: THREE.BackSide, depthWrite: false }),
    );
    scene.add(starfield);

    // Orbit ring
    const orbitRadius = 16;
    const orbitPoints: THREE.Vector3[] = [];
    const segments = 256;
    for (let i = 0; i <= segments; i++) {
      const a = (i / segments) * Math.PI * 2;
      orbitPoints.push(new THREE.Vector3(Math.sin(a) * orbitRadius, 0, -Math.cos(a) * orbitRadius));
    }
    const orbitCurve = new THREE.BufferGeometry().setFromPoints(orbitPoints);
    const orbitMaterial = new THREE.LineBasicMaterial({ color: new THREE.Color("#64748b"), transparent: true, opacity: 0.35 });
    const orbitLine = new THREE.LineLoop(orbitCurve, orbitMaterial);
    system.add(orbitLine);

    // Earth system
    const earthGroup = new THREE.Group();
    system.add(earthGroup);

    const earthTilt = new THREE.Group();
    earthTilt.rotation.z = OBLIQUITY;
    earthGroup.add(earthTilt);

    const loader = new THREE.TextureLoader();
    const [dayTex, nightTex, specTex, normTex, cloudsTex] = [
      "/textures/earth_daymap.jpg",
      "/textures/earth_night.jpg",
      "/textures/earth_specular.jpg",
      "/textures/earth_normal.jpg",
      "/textures/earth_clouds.png",
    ].map((src) => loader.load(src));
    [dayTex, nightTex, specTex, normTex, cloudsTex].forEach((t) => {
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 8;
    });

    const earthUniforms = {
      dayTexture: { value: dayTex },
      nightTexture: { value: nightTex },
      specularMap: { value: specTex },
      normalMap: { value: normTex },
      sunDirection: { value: new THREE.Vector3(1, 0, 0) },
      heatEnabled: { value: controlsRef.current.heatVisible ? 1.0 : 0.0 },
      heatOpacity: { value: controlsRef.current.heatOpacity },
      time: { value: 0 },
    } satisfies Record<string, THREE.IUniform>;

    const earthMaterial = new THREE.ShaderMaterial({
      uniforms: earthUniforms,
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vWorldNormal;
        void main() {
          vUv = uv;
          vNormal = normal;
          vWorldNormal = normalize(mat3(modelMatrix) * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        precision highp float;
        uniform sampler2D dayTexture;
        uniform sampler2D nightTexture;
        uniform sampler2D specularMap;
        uniform sampler2D normalMap;
        uniform vec3 sunDirection;
        uniform float heatEnabled;
        uniform float heatOpacity;
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vWorldNormal;

        vec3 heatGradient(float h) {
          // soft blue -> cyan -> amber -> white
          vec3 c1 = vec3(0.12, 0.62, 0.98);
          vec3 c2 = vec3(0.0, 0.9, 0.8);
          vec3 c3 = vec3(1.0, 0.47, 0.05);
          vec3 c4 = vec3(1.0, 0.95, 0.82);
          float m1 = smoothstep(0.0, 0.35, h);
          float m2 = smoothstep(0.3, 0.7, h);
          float m3 = smoothstep(0.65, 1.0, h);
          vec3 base = mix(c1, c2, m1);
          base = mix(base, c3, m2);
          base = mix(base, c4, m3);
          return base;
        }

        void main() {
          vec3 n = normalize(vWorldNormal);
          vec3 l = normalize(sunDirection);
          float ndotl = dot(n, l);
          float daylight = smoothstep(-0.05, 0.12, ndotl);

          vec3 dayCol = texture2D(dayTexture, vUv).rgb;
          vec3 nightCol = texture2D(nightTexture, vUv).rgb * 0.65;

          // simple specular using ndotl
          float spec = pow(max(ndotl, 0.0), 32.0) * 0.15;
          vec3 base = mix(nightCol, dayCol + spec, daylight);

          float heat = max(ndotl, 0.0);
          heat = pow(heat, 0.6);
          vec3 heatCol = heatGradient(heat);
          base = mix(base, mix(base, heatCol, 0.7), heatEnabled * heatOpacity * heat);

          gl_FragColor = vec4(base, 1.0);
        }
      `,
    });

    const earth = new THREE.Mesh(new THREE.SphereGeometry(1, 96, 96), earthMaterial);
    earthTilt.add(earth);

    // Clouds
    const clouds = new THREE.Mesh(
      new THREE.SphereGeometry(1.01, 72, 72),
      new THREE.MeshPhongMaterial({
        map: cloudsTex,
        transparent: true,
        opacity: 0.35,
        depthWrite: false,
      }),
    );
    earthTilt.add(clouds);

    // Axis line
    const axisMaterial = new THREE.LineBasicMaterial({ color: new THREE.Color("#e2e8f0"), transparent: true, opacity: 0.7 });
    const axisGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, -2, 0),
      new THREE.Vector3(0, 2, 0),
    ]);
    const axisLine = new THREE.Line(axisGeometry, axisMaterial);
    earthTilt.add(axisLine);

    const clock = new THREE.Clock();
    let frameId: number;
    const earthWorld = new THREE.Vector3();

    function updateOrbitPosition() {
      const angle = orbitPhaseRef.current * Math.PI * 2;
      earthGroup.position.set(Math.sin(angle) * orbitRadius, 0, -Math.cos(angle) * orbitRadius);
    }

    updateOrbitPosition();
    earthGroup.getWorldPosition(earthWorld);
    camera.position.copy(earthWorld.clone().add(new THREE.Vector3(10, 6, 10)));
    controls.target.copy(earthWorld);
    controls.update();

    function animate() {
      const delta = clock.getDelta();
      const elapsed = clock.elapsedTime;

      if (controlsRef.current.isPlaying) {
        orbitPhaseRef.current = (orbitPhaseRef.current + delta * 0.025) % 1; // ~40s per orbit
      }
      if (controlsRef.current.showOrbit !== orbitLine.visible) orbitLine.visible = controlsRef.current.showOrbit;

      uiSyncRef.current += delta;
      if (uiSyncRef.current > 0.08) {
        setPhase(orbitPhaseRef.current);
        uiSyncRef.current = 0;
      }

      updateOrbitPosition();

      // spin
      earth.rotation.y += delta * 1.5 * controlsRef.current.spinRate;
      clouds.rotation.y += delta * 1.1 * controlsRef.current.spinRate;
      clouds.visible = controlsRef.current.showClouds;

      // sun direction in world space (from Earth toward Sun)
      const earthPositionWorld = earth.getWorldPosition(new THREE.Vector3());
      const sunDirWorld = new THREE.Vector3().subVectors(sun.position, earthPositionWorld).normalize();
      earthUniforms.sunDirection.value.copy(sunDirWorld);
      earthUniforms.heatEnabled.value = controlsRef.current.heatVisible ? 1.0 : 0.0;
      earthUniforms.heatOpacity.value = controlsRef.current.heatOpacity;
      earthUniforms.time.value = elapsed;

      controls.target.lerp(earthPositionWorld, 0.1);
      controls.update();
      renderer.render(scene, camera);
      frameId = requestAnimationFrame(animate);
    }

    frameId = requestAnimationFrame(animate);

    const handleResize = () => {
      if (!container) return;
      const { clientWidth, clientHeight } = container;
      camera.aspect = clientWidth / clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(clientWidth, clientHeight);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(frameId);
      renderer.dispose();
      container?.removeChild(renderer.domElement);
      scene.clear();
    };
  }, []);

  // Sync slider -> orbit
  useEffect(() => {
    orbitPhaseRef.current = phase;
  }, [phase]);

  return (
    <main className="relative min-h-screen bg-space">
      <div className="noise-overlay pointer-events-none" />
      <div className="relative flex min-h-screen flex-col gap-6 px-4 py-4 lg:flex-row lg:gap-6 lg:px-8 lg:py-8">
        <div className="relative flex-1 rounded-3xl border border-white/10 bg-black/10 shadow-glass backdrop-blur-xl lg:max-w-[68vw] min-h-[460px] lg:min-h-[760px] overflow-hidden">
          <div ref={mountRef} className="absolute inset-0" />
          <div className="pointer-events-none absolute left-4 top-4 z-10 flex items-center gap-3">
            <Badge className="bg-white/15 text-slate-50 shadow-glass">Earth Seasons Studio</Badge>
            <div className="text-xs uppercase tracking-[0.2em] text-slate-200/80">
              Axial tilt · Orbit · Heat map overlay
            </div>
          </div>
        </div>

        <div className="relative z-10 w-full max-w-[420px] self-start lg:max-w-[460px]">
          <Card className="glass-panel border border-white/10 bg-white/5 text-slate-100 shadow-glass">
            <CardHeader className="flex flex-col gap-3 pb-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-2xl font-semibold tracking-tight text-white">
                    Full-Orbit Heat Simulation
                  </CardTitle>
                  <CardDescription className="text-slate-300">
                    Drag to orbit, scrub the calendar, toggle the heat layer, and watch how the Sun peels across
                    latitudes through the year.
                  </CardDescription>
                </div>
                <div className="flex flex-col gap-2">
                  <Button variant="secondary" size="sm" onClick={() => setPhase(0)}>
                    March Equinox
                  </Button>
                  <Button variant={isPlaying ? "destructive" : "default"} size="sm" onClick={() => setIsPlaying((p) => !p)}>
                    {isPlaying ? "Pause" : "Play"}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label className="flex items-center justify-between text-sm uppercase tracking-[0.14em] text-slate-300">
                  <span>Time of year</span>
                  <span className="text-xs font-mono text-slate-200">{stats.date}</span>
                </Label>
                <Slider
                  value={[phase]}
                  min={0}
                  max={1}
                  step={0.001}
                  onValueChange={([v]) => {
                    setPhase(v);
                    setIsPlaying(false);
                  }}
                />
                <div className="mt-2 flex items-center justify-between text-sm text-slate-300">
                  <span>{stats.season}</span>
                  <span className="font-mono text-amber-200">δ = {stats.decl.toFixed(1)}°</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <StatPill label="Subsolar latitude" value={`${stats.decl.toFixed(1)}°`} accent="amber" />
                <StatPill label="Season" value={stats.season} />
                <StatPill label="Hemisphere" value={stats.hemisphere} accent="cyan" />
                <StatPill label="Heat overlay" value={heatVisible ? `${Math.round(heatOpacity * 100)}%` : "Off"} accent="orange" />
                <StatPill label="Spin rate" value={`${spinRate.toFixed(1)}x day`} />
                <StatPill label="Orbit" value={showOrbit ? "Path visible" : "Hidden"} />
              </div>

              <Separator className="border-slate-800" />

              <div className="space-y-4 rounded-xl border border-white/10 bg-white/5 p-4 shadow-inner shadow-black/40">
                <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-300">Layers</h3>
                <LayerToggle
                  label="Heat map"
                  description="False-color irradiance overlay"
                  checked={heatVisible}
                  onCheckedChange={setHeatVisible}
                />
                <Slider
                  value={[heatOpacity]}
                  min={0}
                  max={1}
                  step={0.05}
                  onValueChange={([v]) => setHeatOpacity(v)}
                />
                <LayerToggle
                  label="Clouds"
                  description="Fast-moving volumetric wrap"
                  checked={showClouds}
                  onCheckedChange={setShowClouds}
                />
                <LayerToggle
                  label="Orbit trace"
                  description="Keep the elliptical path visible"
                  checked={showOrbit}
                  onCheckedChange={setShowOrbit}
                />
                <LayerToggle
                  label="Faster spin"
                  description="Speed up Earth days"
                  checked={spinRate > 1}
                  onCheckedChange={(v) => setSpinRate(v ? 2 : 1)}
                />
                <div className="pt-2 text-xs text-slate-400">
                  Tip: toggle the heat layer to compare visible-light texture vs energy distribution. The overlay is purely computed from solar incidence.
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}

function LayerToggle({
  label,
  description,
  checked,
  onCheckedChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-white/5 px-3 py-2">
      <div>
        <div className="text-sm font-medium text-slate-100">{label}</div>
        {description ? <div className="text-xs text-slate-400">{description}</div> : null}
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

function StatPill({ label, value, accent }: { label: string; value: string; accent?: "amber" | "cyan" | "orange" }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 shadow-md shadow-black/20">
      <div className="text-[11px] uppercase tracking-[0.22em] text-slate-400">{label}</div>
      <div
        className={cn(
          "mt-1 text-sm font-semibold text-slate-100",
          accent === "amber" && "text-amber-200",
          accent === "cyan" && "text-cyan-200",
          accent === "orange" && "text-orange-200",
        )}
      >
        {value}
      </div>
    </div>
  );
}
