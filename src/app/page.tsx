"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three-stdlib";

const OBLIQUITY = THREE.MathUtils.degToRad(23.44);
const YEAR_MS = 1000 * 60 * 60 * 24 * 365;
const START_EPOCH = Date.UTC(2025, 2, 20);

const SEASON_DATA = [
  { name: "Vernal Equinox", icon: "🌱", north: "Spring", south: "Autumn" },
  { name: "Summer Solstice", icon: "☀️", north: "Summer", south: "Winter" },
  { name: "Autumnal Equinox", icon: "🍂", north: "Autumn", south: "Spring" },
  { name: "Winter Solstice", icon: "❄️", north: "Winter", south: "Summer" },
];

function getSeasonIndex(phase: number) {
  const angle = (phase % 1) * 4;
  return Math.floor(angle) % 4;
}

function dateLabel(phase: number) {
  const ms = START_EPOCH + phase * YEAR_MS;
  const d = new Date(ms);
  return {
    full: d.toLocaleDateString("en-US", { month: "long", day: "numeric" }),
    short: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    month: d.toLocaleDateString("en-US", { month: "short" }),
    day: d.getDate(),
  };
}

function subsolarLatitude(phase: number) {
  return THREE.MathUtils.radToDeg(OBLIQUITY * Math.sin(phase * 2 * Math.PI));
}

export default function Page() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const orbitPhaseRef = useRef(0.18);
  const uiSyncRef = useRef(0);
  const [phase, setPhase] = useState(0.18);
  const [isPlaying, setIsPlaying] = useState(true);
  const [heatVisible, setHeatVisible] = useState(true);
  const [heatOpacity, setHeatOpacity] = useState(0.85);
  const [showClouds, setShowClouds] = useState(true);
  const [showOrbit, setShowOrbit] = useState(true);
  const [spinRate, setSpinRate] = useState(1);
  const [showControls, setShowControls] = useState(false);

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
    const date = dateLabel(phase);
    const seasonIdx = getSeasonIndex(phase);
    return {
      date,
      seasonIdx,
      season: SEASON_DATA[seasonIdx],
      decl,
      hemisphere: decl > 0 ? "Northern" : decl < 0 ? "Southern" : "Equator",
      absDecl: Math.abs(decl),
    };
  }, [phase]);

  useEffect(() => { controlsRef.current.heatVisible = heatVisible; }, [heatVisible]);
  useEffect(() => { controlsRef.current.heatOpacity = heatOpacity; }, [heatOpacity]);
  useEffect(() => { controlsRef.current.showClouds = showClouds; }, [showClouds]);
  useEffect(() => { controlsRef.current.showOrbit = showOrbit; }, [showOrbit]);
  useEffect(() => { controlsRef.current.spinRate = spinRate; }, [spinRate]);
  useEffect(() => { controlsRef.current.isPlaying = isPlaying; }, [isPlaying]);

  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#08070b");

    const camera = new THREE.PerspectiveCamera(
      50,
      container.clientWidth / container.clientHeight,
      0.1,
      200
    );

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxDistance = 50;
    controls.minDistance = 3;
    controls.enablePan = false;

    const system = new THREE.Group();
    scene.add(system);

    // Warmer sun light
    const sun = new THREE.PointLight(0xfff4e0, 2.5, 0, 2);
    sun.position.set(0, 0, 0);
    system.add(sun);

    // Subtle ambient light
    const ambient = new THREE.AmbientLight(0x1a1510, 0.15);
    scene.add(ambient);

    // Sun mesh with glow
    const sunMesh = new THREE.Mesh(
      new THREE.SphereGeometry(2.2, 64, 64),
      new THREE.MeshBasicMaterial({ color: 0xffd080 })
    );
    system.add(sunMesh);

    // Sun glow
    const sunGlow = new THREE.Mesh(
      new THREE.SphereGeometry(3.5, 32, 32),
      new THREE.MeshBasicMaterial({
        color: 0xffb040,
        transparent: true,
        opacity: 0.15,
        side: THREE.BackSide,
      })
    );
    system.add(sunGlow);

    // Starfield
    const starTexture = new THREE.TextureLoader().load("/textures/starfield.png");
    starTexture.colorSpace = THREE.SRGBColorSpace;
    const starfield = new THREE.Mesh(
      new THREE.SphereGeometry(150, 64, 64),
      new THREE.MeshBasicMaterial({
        map: starTexture,
        side: THREE.BackSide,
        depthWrite: false,
        transparent: true,
        opacity: 0.7,
      })
    );
    scene.add(starfield);

    // Orbit ring - more elegant
    const orbitRadius = 14;
    const orbitPoints: THREE.Vector3[] = [];
    const segments = 360;
    for (let i = 0; i <= segments; i++) {
      const a = (i / segments) * Math.PI * 2;
      orbitPoints.push(new THREE.Vector3(Math.sin(a) * orbitRadius, 0, -Math.cos(a) * orbitRadius));
    }
    const orbitCurve = new THREE.BufferGeometry().setFromPoints(orbitPoints);
    const orbitMaterial = new THREE.LineBasicMaterial({
      color: new THREE.Color("#d4a574"),
      transparent: true,
      opacity: 0.2,
    });
    const orbitLine = new THREE.LineLoop(orbitCurve, orbitMaterial);
    system.add(orbitLine);

    // Orbit markers (equinoxes and solstices)
    const markerGeo = new THREE.SphereGeometry(0.12, 16, 16);
    const markerMat = new THREE.MeshBasicMaterial({ color: 0xd4a574 });
    [0, 0.25, 0.5, 0.75].forEach((p) => {
      const angle = p * Math.PI * 2;
      const marker = new THREE.Mesh(markerGeo, markerMat);
      marker.position.set(Math.sin(angle) * orbitRadius, 0, -Math.cos(angle) * orbitRadius);
      system.add(marker);
    });

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
          // Deep blue -> teal -> amber -> warm white
          vec3 c1 = vec3(0.08, 0.15, 0.35);
          vec3 c2 = vec3(0.1, 0.45, 0.5);
          vec3 c3 = vec3(0.85, 0.55, 0.2);
          vec3 c4 = vec3(1.0, 0.92, 0.78);
          float m1 = smoothstep(0.0, 0.33, h);
          float m2 = smoothstep(0.28, 0.65, h);
          float m3 = smoothstep(0.6, 1.0, h);
          vec3 base = mix(c1, c2, m1);
          base = mix(base, c3, m2);
          base = mix(base, c4, m3);
          return base;
        }

        void main() {
          vec3 n = normalize(vWorldNormal);
          vec3 l = normalize(sunDirection);
          float ndotl = dot(n, l);
          float daylight = smoothstep(-0.08, 0.15, ndotl);

          vec3 dayCol = texture2D(dayTexture, vUv).rgb;
          vec3 nightCol = texture2D(nightTexture, vUv).rgb * 0.5;

          float spec = pow(max(ndotl, 0.0), 48.0) * 0.2;
          vec3 base = mix(nightCol, dayCol + spec, daylight);

          float heat = max(ndotl, 0.0);
          heat = pow(heat, 0.55);
          vec3 heatCol = heatGradient(heat);
          base = mix(base, mix(base, heatCol, 0.65), heatEnabled * heatOpacity * heat);

          gl_FragColor = vec4(base, 1.0);
        }
      `,
    });

    const earth = new THREE.Mesh(new THREE.SphereGeometry(1, 128, 128), earthMaterial);
    earthTilt.add(earth);

    // Clouds
    const clouds = new THREE.Mesh(
      new THREE.SphereGeometry(1.008, 96, 96),
      new THREE.MeshPhongMaterial({
        map: cloudsTex,
        transparent: true,
        opacity: 0.28,
        depthWrite: false,
      })
    );
    earthTilt.add(clouds);

    // Subtle atmosphere glow
    const atmosphereMat = new THREE.ShaderMaterial({
      uniforms: {
        sunDirection: { value: new THREE.Vector3(1, 0, 0) },
      },
      vertexShader: /* glsl */ `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        varying vec3 vNormal;
        uniform vec3 sunDirection;
        void main() {
          float intensity = pow(0.65 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
          float sunFacing = max(0.0, dot(vNormal, normalize(sunDirection)));
          vec3 color = mix(vec3(0.1, 0.3, 0.6), vec3(0.4, 0.6, 0.9), sunFacing);
          gl_FragColor = vec4(color, intensity * 0.4);
        }
      `,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
    });
    const atmosphere = new THREE.Mesh(new THREE.SphereGeometry(1.08, 64, 64), atmosphereMat);
    earthTilt.add(atmosphere);

    // Axis line - more subtle
    const axisMaterial = new THREE.LineBasicMaterial({
      color: new THREE.Color("#d4a574"),
      transparent: true,
      opacity: 0.35,
    });
    const axisGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, -1.8, 0),
      new THREE.Vector3(0, 1.8, 0),
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
    camera.position.copy(earthWorld.clone().add(new THREE.Vector3(6, 3, 6)));
    controls.target.copy(earthWorld);
    controls.update();

    function animate() {
      const delta = clock.getDelta();
      const elapsed = clock.elapsedTime;

      if (controlsRef.current.isPlaying) {
        orbitPhaseRef.current = (orbitPhaseRef.current + delta * 0.022) % 1;
      }

      if (controlsRef.current.showOrbit !== orbitLine.visible) {
        orbitLine.visible = controlsRef.current.showOrbit;
      }

      uiSyncRef.current += delta;
      if (uiSyncRef.current > 0.06) {
        setPhase(orbitPhaseRef.current);
        uiSyncRef.current = 0;
      }

      updateOrbitPosition();

      earth.rotation.y += delta * 1.2 * controlsRef.current.spinRate;
      clouds.rotation.y += delta * 0.9 * controlsRef.current.spinRate;
      clouds.visible = controlsRef.current.showClouds;

      // Gentle starfield rotation
      starfield.rotation.y += delta * 0.003;

      const earthPositionWorld = earth.getWorldPosition(new THREE.Vector3());
      const sunDirWorld = new THREE.Vector3().subVectors(sun.position, earthPositionWorld).normalize();
      earthUniforms.sunDirection.value.copy(sunDirWorld);
      atmosphereMat.uniforms.sunDirection.value.copy(sunDirWorld);
      earthUniforms.heatEnabled.value = controlsRef.current.heatVisible ? 1.0 : 0.0;
      earthUniforms.heatOpacity.value = controlsRef.current.heatOpacity;
      earthUniforms.time.value = elapsed;

      controls.target.lerp(earthPositionWorld, 0.08);
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

  useEffect(() => {
    orbitPhaseRef.current = phase;
  }, [phase]);

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-obsidian">
      {/* Constellation pattern overlay */}
      <div className="constellation-overlay" />

      {/* Full-screen 3D canvas */}
      <div ref={mountRef} className="absolute inset-0" />

      {/* Top-left: Title and branding */}
      <header className="absolute left-6 top-6 z-20 animate-fade-in">
        <div className="instrument-panel rounded-lg px-5 py-4">
          <h1 className="font-display text-xl font-medium tracking-wide text-cream">
            Celestial Observatory
          </h1>
          <p className="mt-1 font-body text-xs tracking-wider text-cream-dim/70">
            Earth's Journey Through the Seasons
          </p>
        </div>
      </header>

      {/* Top-right: Primary data readouts */}
      <div className="absolute right-6 top-6 z-20 flex flex-col items-end gap-3 animate-fade-in-delay-1">
        {/* Date display */}
        <div className="instrument-panel instrument-panel-glow rounded-lg px-5 py-4 text-right">
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-brass/70">
            Current Date
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="data-readout text-3xl font-bold text-brass-bright">
              {stats.date.day}
            </span>
            <span className="font-display text-lg text-cream">{stats.date.month}</span>
          </div>
        </div>

        {/* Season indicator */}
        <div className="instrument-panel rounded-lg px-5 py-3 text-right">
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-silver/60">
            Northern Hemisphere
          </div>
          <div className="mt-1 font-display text-lg text-cream">
            {stats.season.north}
          </div>
        </div>
      </div>

      {/* Left side: Scientific readouts */}
      <div className="absolute bottom-32 left-6 z-20 flex flex-col gap-3 animate-fade-in-delay-2">
        {/* Declination */}
        <div className="instrument-panel rounded-lg px-4 py-3">
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-silver/60">
            Solar Declination
          </div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="data-readout text-2xl text-amber">
              {stats.decl >= 0 ? "+" : ""}{stats.decl.toFixed(1)}
            </span>
            <span className="font-mono text-sm text-cream-dim">°</span>
          </div>
          <div className="mt-1 font-body text-[11px] text-cream-dim/60">
            Sun over {stats.hemisphere} Hemisphere
          </div>
        </div>

        {/* Axial tilt indicator */}
        <div className="instrument-panel rounded-lg px-4 py-3">
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-silver/60">
            Axial Tilt
          </div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="data-readout text-xl text-cream">23.44</span>
            <span className="font-mono text-sm text-cream-dim">°</span>
          </div>
        </div>
      </div>

      {/* Right side: Layer controls (collapsed by default) */}
      <div className="absolute bottom-32 right-6 z-20 animate-fade-in-delay-3">
        <div className="instrument-panel rounded-lg overflow-hidden">
          <button
            onClick={() => setShowControls(!showControls)}
            className="flex w-full items-center justify-between gap-4 px-4 py-3 transition-colors hover:bg-charcoal-light/30"
          >
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-silver/60">
              Visualization
            </span>
            <svg
              className={`h-4 w-4 text-brass transition-transform ${showControls ? "rotate-180" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showControls && (
            <div className="border-t border-charcoal-light px-4 pb-4 pt-3 space-y-3">
              <ToggleRow
                label="Heat Map"
                active={heatVisible}
                onChange={setHeatVisible}
              />
              {heatVisible && (
                <div className="pl-2">
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={heatOpacity}
                    onChange={(e) => setHeatOpacity(parseFloat(e.target.value))}
                    className="w-full"
                  />
                </div>
              )}
              <ToggleRow
                label="Clouds"
                active={showClouds}
                onChange={setShowClouds}
              />
              <ToggleRow
                label="Orbit Path"
                active={showOrbit}
                onChange={setShowOrbit}
              />
              <ToggleRow
                label="Fast Rotation"
                active={spinRate > 1}
                onChange={(v) => setSpinRate(v ? 2 : 1)}
              />
            </div>
          )}
        </div>
      </div>

      {/* Bottom: Timeline control bar */}
      <div className="absolute bottom-0 left-0 right-0 z-20">
        <div className="timeline-track px-6 py-4">
          <div className="mx-auto flex max-w-4xl items-center gap-6">
            {/* Play/Pause */}
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="group flex h-12 w-12 items-center justify-center rounded-full border border-charcoal-light bg-charcoal transition-all hover:border-brass-dim hover:shadow-glow"
            >
              {isPlaying ? (
                <svg className="h-5 w-5 text-cream group-hover:text-brass" fill="currentColor" viewBox="0 0 24 24">
                  <rect x="6" y="4" width="4" height="16" rx="1" />
                  <rect x="14" y="4" width="4" height="16" rx="1" />
                </svg>
              ) : (
                <svg className="h-5 w-5 text-cream group-hover:text-brass" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>

            {/* Timeline slider */}
            <div className="flex-1">
              <input
                type="range"
                min={0}
                max={1}
                step={0.001}
                value={phase}
                onChange={(e) => {
                  setPhase(parseFloat(e.target.value));
                  setIsPlaying(false);
                }}
                className="w-full"
              />
              {/* Season markers */}
              <div className="mt-2 flex justify-between px-1">
                {SEASON_DATA.map((s, i) => (
                  <button
                    key={s.name}
                    onClick={() => {
                      setPhase(i * 0.25);
                      setIsPlaying(false);
                    }}
                    className={`font-mono text-[10px] uppercase tracking-wider transition-colors ${
                      stats.seasonIdx === i ? "text-brass" : "text-cream-dim/50 hover:text-cream-dim"
                    }`}
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Current season badge */}
            <div className="flex h-12 items-center gap-2 rounded-full border border-brass-dim/50 bg-charcoal px-4">
              <span className="text-lg">{stats.season.icon}</span>
              <span className="font-display text-sm text-cream">{stats.season.north}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Center bottom: Orbit progress ring */}
      <div className="absolute bottom-24 left-1/2 z-10 -translate-x-1/2 pointer-events-none">
        <svg width="120" height="60" viewBox="0 0 120 60" className="opacity-40">
          {/* Background arc */}
          <path
            d="M 10 50 A 50 50 0 0 1 110 50"
            fill="none"
            stroke="#2a2520"
            strokeWidth="2"
          />
          {/* Progress arc */}
          <path
            d="M 10 50 A 50 50 0 0 1 110 50"
            fill="none"
            stroke="#d4a574"
            strokeWidth="2"
            strokeDasharray={`${phase * 157} 157`}
            className="transition-all duration-100"
          />
          {/* Current position dot */}
          <circle
            cx={10 + phase * 100}
            cy={50 - Math.sin(phase * Math.PI) * 35}
            r="4"
            fill="#f5c87a"
            className="glow-indicator"
          />
        </svg>
      </div>
    </main>
  );
}

function ToggleRow({
  label,
  active,
  onChange,
}: {
  label: string;
  active: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="font-body text-sm text-cream-dim">{label}</span>
      <button
        onClick={() => onChange(!active)}
        className={`toggle-switch ${active ? "active" : ""}`}
        role="switch"
        aria-checked={active}
      />
    </div>
  );
}
