"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { onValue, ref } from "firebase/database";
import {
  AlertTriangle,
  CheckCircle2,
  Cpu,
  Droplets,
  Leaf,
  Moon,
  Power,
  RefreshCw,
  Sprout,
  Sun,
  Thermometer,
  Wifi,
  WifiOff,
} from "lucide-react";
import { database } from "@/lib/firebase";

const DRY_SOIL_THRESHOLD = 30;
const themeListeners = new Set();

function subscribeTheme(callback) {
  themeListeners.add(callback);
  return () => themeListeners.delete(callback);
}

function getThemeSnapshot() {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

function getThemeServerSnapshot() {
  return null;
}

function setDocumentTheme(nextTheme) {
  document.documentElement.classList.toggle("dark", nextTheme === "dark");
  try {
    localStorage.setItem("theme", nextTheme);
  } catch {
    // Ignore storage errors in restricted browser contexts.
  }
  themeListeners.forEach((listener) => listener());
}

function ThemeToggle() {
  const theme = useSyncExternalStore(
    subscribeTheme,
    getThemeSnapshot,
    getThemeServerSnapshot
  );

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={() => setDocumentTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 shadow-xs transition-colors hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-200 dark:shadow-none dark:hover:bg-slate-800"
    >
      {theme === null ? (
        <span className="h-3.5 w-3.5" aria-hidden="true" />
      ) : isDark ? (
        <>
          <Sun className="h-3.5 w-3.5 text-amber-400" />
          <span>Light</span>
        </>
      ) : (
        <>
          <Moon className="h-3.5 w-3.5 text-indigo-600" />
          <span>Dark</span>
        </>
      )}
    </button>
  );
}

function formatReading(value) {
  if (typeof value !== "number" || Number.isNaN(value)) return "--";
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function clampPercent(value, max = 100) {
  if (typeof value !== "number" || Number.isNaN(value)) return 0;
  return Math.min(100, Math.max(0, (value / max) * 100));
}

function getTemperatureMeta(temp) {
  if (typeof temp !== "number") {
    return { label: "No reading", tone: "text-slate-500 dark:text-slate-400" };
  }
  if (temp < 15) return { label: "Cool", tone: "text-sky-600 dark:text-sky-400" };
  if (temp <= 30) {
    return { label: "Optimal", tone: "text-emerald-600 dark:text-emerald-400" };
  }
  if (temp <= 35) return { label: "Warm", tone: "text-amber-600 dark:text-amber-400" };
  return { label: "High Heat", tone: "text-rose-600 dark:text-rose-400" };
}

function getHumidityMeta(humidity) {
  if (typeof humidity !== "number") {
    return { label: "No reading", tone: "text-slate-500 dark:text-slate-400" };
  }
  if (humidity < 35) {
    return { label: "Dry Air", tone: "text-amber-600 dark:text-amber-400" };
  }
  if (humidity <= 75) {
    return { label: "Balanced", tone: "text-sky-600 dark:text-sky-400" };
  }
  return { label: "Humid", tone: "text-cyan-600 dark:text-cyan-400" };
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
        <RefreshCw className="h-5 w-5 animate-spin text-emerald-600 dark:text-emerald-400" />
        <span className="text-sm font-medium tracking-wide">
          Connecting to Smart Garden...
        </span>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((card) => (
          <div
            key={card}
            className="animate-pulse rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800/80 dark:bg-slate-900/60 dark:shadow-none"
          >
            <div className="flex items-center justify-between">
              <div className="h-4 w-28 rounded bg-slate-200 dark:bg-slate-800" />
              <div className="h-10 w-10 rounded-xl bg-slate-200 dark:bg-slate-800" />
            </div>
            <div className="mt-6 h-10 w-24 rounded-lg bg-slate-200 dark:bg-slate-800" />
            <div className="mt-5 h-2 w-full rounded-full bg-slate-200 dark:bg-slate-800" />
            <div className="mt-4 h-3 w-20 rounded bg-slate-200 dark:bg-slate-800" />
          </div>
        ))}
      </div>
    </div>
  );
}

function SensorCard({
  title,
  value,
  unit,
  icon: Icon,
  statusLabel,
  statusTone,
  progress,
  accentClasses,
  barClasses,
  cardClasses = "border-slate-200/90 bg-white shadow-sm hover:border-slate-300 dark:border-slate-800/80 dark:bg-slate-900/70 dark:shadow-none dark:hover:border-slate-700",
  valueClasses = "text-slate-900 dark:text-white",
}) {
  return (
    <article
      className={`relative overflow-hidden rounded-2xl border p-6 backdrop-blur-sm transition-all duration-300 ${cardClasses}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {title}
          </p>
          <div className="mt-3 flex items-baseline gap-1.5">
            <span
              className={`font-mono text-4xl font-bold tracking-tight tabular-nums ${valueClasses}`}
            >
              {value}
            </span>
            <span className="text-base font-medium text-slate-500 dark:text-slate-400">
              {unit}
            </span>
          </div>
        </div>

        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border ${accentClasses}`}
        >
          <Icon className="h-6 w-6" />
        </div>
      </div>

      <div className="mt-6">
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800/90">
          <div
            className={`h-full rounded-full transition-all duration-500 ${barClasses}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between text-xs">
        <span className={`font-medium ${statusTone}`}>{statusLabel}</span>
        <span className="text-slate-400 dark:text-slate-500">Live sensor</span>
      </div>
    </article>
  );
}

function PumpStatusCard({ pumpActive }) {
  return (
    <article
      className={`relative overflow-hidden rounded-2xl border p-6 backdrop-blur-sm transition-all duration-500 ${
        pumpActive
          ? "border-cyan-300 bg-gradient-to-br from-cyan-50 via-white to-emerald-50 shadow-[0_10px_30px_-8px_rgba(6,182,212,0.35)] dark:border-cyan-400/60 dark:from-cyan-950/60 dark:via-slate-900/90 dark:to-emerald-950/50 dark:shadow-[0_0_35px_-6px_rgba(34,211,238,0.45)]"
          : "border-slate-200/90 bg-slate-100/80 text-slate-500 dark:border-slate-800/80 dark:bg-slate-900/50 dark:text-slate-400"
      }`}
    >
      {pumpActive && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 animate-pulse bg-gradient-to-tr from-cyan-400/15 via-transparent to-emerald-400/15 dark:from-cyan-500/10 dark:to-emerald-400/10"
        />
      )}

      <div className="relative flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Pump Status
          </p>
          <div className="mt-3 flex items-center gap-2.5">
            <span
              className={`font-mono text-3xl font-bold tracking-tight ${
                pumpActive
                  ? "text-cyan-700 dark:text-cyan-300"
                  : "text-slate-500 dark:text-slate-400"
              }`}
            >
              {pumpActive ? "ACTIVE" : "IDLE"}
            </span>
          </div>
        </div>

        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border transition-colors ${
            pumpActive
              ? "border-cyan-300 bg-cyan-100 text-cyan-700 dark:border-cyan-400/40 dark:bg-cyan-500/20 dark:text-cyan-300"
              : "border-slate-200 bg-white text-slate-400 dark:border-slate-700/80 dark:bg-slate-800/80 dark:text-slate-500"
          }`}
        >
          {pumpActive ? (
            <RefreshCw className="h-6 w-6 animate-spin" />
          ) : (
            <Power className="h-6 w-6" />
          )}
        </div>
      </div>

      <div className="relative mt-6 flex items-center gap-2">
        <span className="relative flex h-2.5 w-2.5">
          {pumpActive && (
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-500 opacity-75 dark:bg-cyan-400" />
          )}
          <span
            className={`relative inline-flex h-2.5 w-2.5 rounded-full ${
              pumpActive
                ? "bg-cyan-500 dark:bg-cyan-400"
                : "bg-slate-400 dark:bg-slate-600"
            }`}
          />
        </span>
        <span
          className={`text-xs font-medium ${
            pumpActive
              ? "text-cyan-800 dark:text-cyan-200"
              : "text-slate-500"
          }`}
        >
          {pumpActive ? "Watering plants now" : "Standby • Automated relay"}
        </span>
      </div>

      <div className="relative mt-4 flex items-center justify-between text-xs">
        <span
          className={
            pumpActive
              ? "font-medium text-emerald-700 dark:text-emerald-300"
              : "text-slate-500"
          }
        >
          {pumpActive ? "Flow enabled" : "Relay closed"}
        </span>
        <span className="text-slate-400 dark:text-slate-500">ESP32 GPIO</span>
      </div>
    </article>
  );
}

export default function DashboardPage() {
  const [gardenData, setGardenData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    if (!database) return;

    const gardenRef = ref(database, "balcony_garden");
    const unsubscribe = onValue(
      gardenRef,
      (snapshot) => {
        setGardenData(snapshot.val());
        setLastUpdated(new Date());
        setError(null);
        setLoading(false);
      },
      (err) => {
        setError(err?.message || "Unable to read from Firebase Realtime Database.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const isConfigured = Boolean(database);
  const isLoading = isConfigured && loading;
  const temperature = gardenData?.sensors?.temperature;
  const humidity = gardenData?.sensors?.humidity;
  const soilMoisture = gardenData?.sensors?.soilMoisture;
  const pumpActive = Boolean(gardenData?.status?.pumpActive);

  const isDrySoil =
    typeof soilMoisture === "number" && soilMoisture < DRY_SOIL_THRESHOLD;
  const tempMeta = getTemperatureMeta(temperature);
  const humidityMeta = getHumidityMeta(humidity);

  return (
    <div className="relative flex-1 bg-slate-50 text-slate-900 transition-colors duration-300 dark:bg-slate-950 dark:text-slate-100">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-gradient-to-b from-emerald-500/10 via-sky-500/5 to-transparent dark:from-emerald-500/10 dark:via-cyan-500/5"
      />

      <main className="relative mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        <header className="flex flex-col gap-4 border-b border-slate-200 pb-6 dark:border-slate-800/80 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-100 text-emerald-700 shadow-xs dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-400 dark:shadow-inner">
              <Sprout className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
                Smart Balcony Garden
              </h1>
              <p className="mt-0.5 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                <Cpu className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                <span>ESP32 Real-Time Telemetry &amp; Irrigation Monitor</span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {lastUpdated && !isLoading && (
              <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 font-mono text-xs text-slate-600 shadow-xs dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-400 dark:shadow-none">
                Updated {lastUpdated.toLocaleTimeString()}
              </span>
            )}

            <div
              className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-semibold ${
                !isConfigured || error
                  ? "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300"
                  : isLoading
                    ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300"
                    : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300"
              }`}
            >
              {!isConfigured || error ? (
                <>
                  <WifiOff className="h-3.5 w-3.5" />
                  <span>Disconnected</span>
                </>
              ) : isLoading ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span>Connecting</span>
                </>
              ) : (
                <>
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75 dark:bg-emerald-400" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500 dark:bg-emerald-400" />
                  </span>
                  <Wifi className="h-3.5 w-3.5" />
                  <span>Live RTDB</span>
                </>
              )}
            </div>

            <ThemeToggle />
          </div>
        </header>

        {!isConfigured && (
          <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600 dark:text-rose-400" />
            <div>
              <p className="font-semibold">Firebase environment variables missing</p>
              <p className="mt-1 text-rose-700 dark:text-rose-200/80">
                Add your <code className="font-mono">NEXT_PUBLIC_FIREBASE_*</code> keys
                to <code className="font-mono">.env.local</code> and restart the Next.js
                dev server.
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600 dark:text-rose-400" />
            <div>
              <p className="font-semibold">Realtime Database Error</p>
              <p className="mt-1 text-rose-700 dark:text-rose-200/80">{error}</p>
            </div>
          </div>
        )}

        {isLoading ? (
          <DashboardSkeleton />
        ) : (
          isConfigured && (
            <>
              {!gardenData && !error && (
                <div className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
                  <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
                  <span>
                    Connected to Firebase, waiting for ESP32 payload at{" "}
                    <code className="font-mono">/balcony_garden</code>.
                  </span>
                </div>
              )}

              <section
                aria-label="Garden telemetry metrics"
                className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4"
              >
                <SensorCard
                  title="Temperature"
                  value={formatReading(temperature)}
                  unit="°C"
                  icon={Thermometer}
                  statusLabel={tempMeta.label}
                  statusTone={tempMeta.tone}
                  progress={clampPercent(temperature, 50)}
                  accentClasses="border-amber-200 bg-amber-50 text-amber-600 dark:border-amber-500/30 dark:bg-amber-500/15 dark:text-amber-400"
                  barClasses="bg-gradient-to-r from-amber-500 to-orange-400"
                />

                <SensorCard
                  title="Humidity"
                  value={formatReading(humidity)}
                  unit="%"
                  icon={Droplets}
                  statusLabel={humidityMeta.label}
                  statusTone={humidityMeta.tone}
                  progress={clampPercent(humidity, 100)}
                  accentClasses="border-sky-200 bg-sky-50 text-sky-600 dark:border-sky-500/30 dark:bg-sky-500/15 dark:text-sky-400"
                  barClasses="bg-gradient-to-r from-sky-500 to-cyan-400"
                />

                <SensorCard
                  title="Soil Moisture"
                  value={formatReading(soilMoisture)}
                  unit="%"
                  icon={Leaf}
                  statusLabel={
                    typeof soilMoisture !== "number"
                      ? "No reading"
                      : isDrySoil
                        ? "Dry Soil — Water Needed"
                        : "Optimal Moisture"
                  }
                  statusTone={
                    typeof soilMoisture !== "number"
                      ? "text-slate-500 dark:text-slate-400"
                      : isDrySoil
                        ? "text-orange-600 dark:text-orange-400"
                        : "text-emerald-600 dark:text-emerald-400"
                  }
                  progress={clampPercent(soilMoisture, 100)}
                  cardClasses={
                    isDrySoil
                      ? "border-orange-300 bg-orange-50/90 shadow-[0_8px_24px_-8px_rgba(249,115,22,0.28)] dark:border-orange-500/50 dark:bg-orange-950/20 dark:shadow-[0_0_25px_-8px_rgba(249,115,22,0.35)]"
                      : "border-slate-200/90 bg-white shadow-sm hover:border-slate-300 dark:border-slate-800/80 dark:bg-slate-900/70 dark:shadow-none dark:hover:border-slate-700"
                  }
                  valueClasses={
                    isDrySoil
                      ? "text-orange-600 dark:text-orange-400"
                      : "text-slate-900 dark:text-white"
                  }
                  accentClasses={
                    isDrySoil
                      ? "border-orange-300 bg-orange-100 text-orange-600 dark:border-orange-500/40 dark:bg-orange-500/20 dark:text-orange-400"
                      : "border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-400"
                  }
                  barClasses={
                    isDrySoil
                      ? "bg-gradient-to-r from-red-500 to-orange-400"
                      : "bg-gradient-to-r from-emerald-500 to-lime-400"
                  }
                />

                <PumpStatusCard pumpActive={pumpActive} />
              </section>

              <section className="flex flex-col gap-3 rounded-2xl border border-slate-200/90 bg-white px-5 py-4 shadow-xs dark:border-slate-800/80 dark:bg-slate-900/50 dark:shadow-none sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  {isDrySoil ? (
                    <AlertTriangle className="h-5 w-5 shrink-0 text-orange-500 dark:text-orange-400" />
                  ) : (
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  )}
                  <p className="text-sm text-slate-700 dark:text-slate-300">
                    {isDrySoil ? (
                      <>
                        Soil moisture is below{" "}
                        <span className="font-semibold text-orange-600 dark:text-orange-300">
                          {DRY_SOIL_THRESHOLD}%
                        </span>
                        .{" "}
                        {pumpActive
                          ? "Pump is currently irrigating your balcony plants."
                          : "Consider activating irrigation soon."}
                      </>
                    ) : (
                      "All balcony garden parameters are within healthy ranges."
                    )}
                  </p>
                </div>

                <span className="font-mono text-xs text-slate-400 dark:text-slate-500">
                  Node: /balcony_garden
                </span>
              </section>
            </>
          )
        )}
      </main>
    </div>
  );
}
