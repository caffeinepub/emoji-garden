import { Toaster } from "@/components/ui/sonner";
import { Droplets, Loader2, LogIn, LogOut, Trash2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import type { Plant } from "./backend.d";
import { useInternetIdentity } from "./hooks/useInternetIdentity";
import {
  useClearPlot,
  useGetGarden,
  usePlantSeed,
  useWaterPlant,
} from "./hooks/useQueries";

// ─── Types & Constants ────────────────────────────────────────────────────────

type SeedKey =
  | "sunflower"
  | "rose"
  | "cactus"
  | "mushroom"
  | "cherry"
  | "tulip";

interface SeedDef {
  id: SeedKey;
  name: string;
  color: string;
  stages: [string, string, string, string];
}

const SEEDS: SeedDef[] = [
  {
    id: "sunflower",
    name: "Sunflower",
    color: "seed-sunflower",
    stages: ["🌱", "🌿", "🌻", "🌻✨"],
  },
  {
    id: "rose",
    name: "Rose",
    color: "seed-rose",
    stages: ["🌱", "🌿", "🌹", "🌹✨"],
  },
  {
    id: "cactus",
    name: "Cactus",
    color: "seed-cactus",
    stages: ["🌱", "🌵", "🌵", "🌵✨"],
  },
  {
    id: "mushroom",
    name: "Mushroom",
    color: "seed-mushroom",
    stages: ["🌱", "🍄", "🍄", "🍄✨"],
  },
  {
    id: "cherry",
    name: "Cherry",
    color: "seed-cherry",
    stages: ["🌱", "🌿", "🍒", "🍒✨"],
  },
  {
    id: "tulip",
    name: "Tulip",
    color: "seed-tulip",
    stages: ["🌱", "🌿", "🌷", "🌷✨"],
  },
];

const SEED_MAP = Object.fromEntries(SEEDS.map((s) => [s.id, s])) as Record<
  SeedKey,
  SeedDef
>;

// Waters needed to advance each stage
const WATERS_PER_STAGE: Record<number, number> = { 0: 3, 1: 4, 2: 5 };

// Stable keys for the 12 plots (avoid array-index-key lint rule)
const PLOT_KEYS = [
  "plot-0",
  "plot-1",
  "plot-2",
  "plot-3",
  "plot-4",
  "plot-5",
  "plot-6",
  "plot-7",
  "plot-8",
  "plot-9",
  "plot-10",
  "plot-11",
] as const;

function getPlantEmoji(plant: Plant): string {
  const def = SEED_MAP[plant.seedType as SeedKey];
  if (!def) return "🌱";
  const stage = Number(plant.growthStage);
  return def.stages[Math.min(stage, 3)];
}

function getWaterProgress(plant: Plant): number {
  const stage = Number(plant.growthStage);
  if (stage >= 3) return 100;
  const needed = WATERS_PER_STAGE[stage] ?? 3;
  const waterCount = Number(plant.waterCount);
  return Math.min((waterCount / needed) * 100, 100);
}

// ─── Sparkle ──────────────────────────────────────────────────────────────────

interface SparkleItem {
  id: number;
  x: number;
  y: number;
  emoji: string;
}

function FloatingSparkle({
  sparkle,
  onDone,
}: { sparkle: SparkleItem; onDone: (id: number) => void }) {
  return (
    <motion.div
      className="fixed pointer-events-none z-50 text-2xl select-none"
      style={{ left: sparkle.x, top: sparkle.y }}
      initial={{ opacity: 1, y: 0, scale: 0.5 }}
      animate={{ opacity: 0, y: -65, scale: 1.6 }}
      transition={{ duration: 0.9, ease: "easeOut" }}
      onAnimationComplete={() => onDone(sparkle.id)}
    >
      {sparkle.emoji}
    </motion.div>
  );
}

// ─── Context Menu ─────────────────────────────────────────────────────────────

interface ContextMenuState {
  plotIndex: number;
  x: number;
  y: number;
}

// ─── Plot Cell ────────────────────────────────────────────────────────────────

interface PlotCellProps {
  plot: Plant | null;
  index: number;
  selectedSeed: SeedKey | null;
  onPlant: (index: number, e: React.MouseEvent) => void;
  onWater: (index: number, e: React.MouseEvent) => void;
  onBloom: (index: number, e: React.MouseEvent) => void;
  onContextMenu: (index: number, e: React.MouseEvent) => void;
  isLoading: boolean;
  animKey: number;
}

function PlotCell({
  plot,
  index,
  selectedSeed,
  onPlant,
  onWater,
  onBloom,
  onContextMenu,
  isLoading,
  animKey,
}: PlotCellProps) {
  const isEmpty = plot === null;
  const canPlant = isEmpty && selectedSeed !== null;
  const stage = plot ? Number(plot.growthStage) : 0;
  const isBloomed = stage === 3;
  const emoji = plot ? getPlantEmoji(plot) : "";
  const progress = plot ? getWaterProgress(plot) : 0;

  function handleClick(e: React.MouseEvent) {
    if (isLoading) return;
    if (isEmpty) {
      if (canPlant) onPlant(index, e);
    } else if (isBloomed) {
      onBloom(index, e);
    } else {
      onWater(index, e);
    }
  }

  return (
    <motion.button
      data-ocid={`garden.plot.${index + 1}`}
      className={[
        "relative flex flex-col items-center justify-center rounded-2xl select-none",
        "transition-all duration-150 outline-none",
        "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
        isEmpty && !canPlant ? "cursor-default" : "cursor-pointer",
        isLoading ? "opacity-70 cursor-wait" : "",
      ].join(" ")}
      style={{
        aspectRatio: "1",
        background: isEmpty
          ? "radial-gradient(ellipse at 40% 35%, oklch(0.62 0.1 55) 0%, oklch(0.48 0.1 48) 55%, oklch(0.38 0.08 42) 100%)"
          : isBloomed
            ? "radial-gradient(ellipse at 40% 35%, oklch(0.68 0.14 62) 0%, oklch(0.52 0.12 52) 55%, oklch(0.4 0.09 44) 100%)"
            : "radial-gradient(ellipse at 40% 35%, oklch(0.62 0.1 55) 0%, oklch(0.48 0.1 48) 55%, oklch(0.38 0.08 42) 100%)",
        boxShadow:
          "inset 0 2px 6px rgba(0,0,0,0.28), 0 3px 8px rgba(0,0,0,0.18)",
      }}
      onClick={handleClick}
      onContextMenu={(e) => {
        if (!isEmpty) {
          e.preventDefault();
          onContextMenu(index, e);
        }
      }}
      whileHover={
        (canPlant || !isEmpty) && !isLoading
          ? { scale: 1.08, y: -2 }
          : { scale: 1.02 }
      }
      whileTap={!isLoading ? { scale: 0.9 } : {}}
      aria-label={
        isEmpty
          ? canPlant
            ? `Plant ${selectedSeed} here`
            : "Empty plot"
          : `${plot?.seedType} — stage ${stage}, progress ${Math.round(progress)}%`
      }
    >
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/10 z-10">
          <Loader2 size={16} className="animate-spin text-white/80" />
        </div>
      )}

      {isEmpty ? (
        <>
          {canPlant ? (
            <motion.span
              className="text-2xl opacity-40 pointer-events-none select-none"
              animate={{ scale: [1, 1.08, 1] }}
              transition={{
                duration: 1.8,
                repeat: Number.POSITIVE_INFINITY,
                ease: "easeInOut",
              }}
            >
              {SEED_MAP[selectedSeed!]?.stages[0] ?? "🌱"}
            </motion.span>
          ) : (
            <span className="text-base opacity-20 pointer-events-none select-none">
              ·
            </span>
          )}
          {/* Soil texture lines */}
          <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none opacity-20">
            <div
              className="absolute w-full"
              style={{
                top: "38%",
                height: "2px",
                background: "oklch(0.28 0.06 45)",
                borderRadius: "999px",
              }}
            />
            <div
              className="absolute w-3/4"
              style={{
                left: "12%",
                top: "56%",
                height: "1.5px",
                background: "oklch(0.28 0.06 45)",
                borderRadius: "999px",
              }}
            />
          </div>
        </>
      ) : (
        <>
          {/* Plant emoji */}
          <motion.span
            key={`emoji-${animKey}`}
            className="text-3xl sm:text-4xl pointer-events-none select-none leading-none"
            initial={{ scale: 0.6, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 20 }}
          >
            {emoji}
          </motion.span>

          {/* Bloom glow */}
          {isBloomed && (
            <motion.div
              className="absolute inset-0 rounded-2xl pointer-events-none"
              animate={{
                boxShadow: [
                  "0 0 0px 0px rgba(255,210,60,0)",
                  "0 0 16px 6px rgba(255,210,60,0.6)",
                  "0 0 0px 0px rgba(255,210,60,0)",
                ],
              }}
              transition={{
                duration: 2.4,
                repeat: Number.POSITIVE_INFINITY,
                ease: "easeInOut",
              }}
            />
          )}

          {/* Water progress bar */}
          {!isBloomed && (
            <div className="absolute bottom-2 left-2 right-2">
              <div
                className="h-1.5 rounded-full overflow-hidden"
                style={{ background: "oklch(0.25 0.04 50 / 0.5)" }}
              >
                <motion.div
                  className="h-full rounded-full"
                  style={{
                    background:
                      "linear-gradient(90deg, oklch(0.62 0.18 220), oklch(0.76 0.14 210))",
                  }}
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.45, ease: "easeOut" }}
                />
              </div>
            </div>
          )}
        </>
      )}
    </motion.button>
  );
}

// ─── Seed Button ──────────────────────────────────────────────────────────────

interface SeedButtonProps {
  seed: SeedDef;
  index: number;
  isSelected: boolean;
  onSelect: (id: SeedKey) => void;
}

function SeedButton({ seed, index, isSelected, onSelect }: SeedButtonProps) {
  return (
    <motion.button
      data-ocid={`seed.item.${index + 1}`}
      className={[
        "flex flex-col items-center gap-1 px-2 py-2.5 rounded-xl",
        "transition-all duration-150 outline-none",
        "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1",
        isSelected
          ? "ring-2 ring-offset-1 ring-primary/80"
          : "hover:brightness-95",
      ].join(" ")}
      style={{
        background: isSelected
          ? "oklch(0.93 0.1 145 / 0.85)"
          : "oklch(0.96 0.04 145 / 0.6)",
        boxShadow: isSelected
          ? "0 0 0 2px oklch(0.5 0.16 145), 0 4px 12px oklch(0.5 0.16 145 / 0.25)"
          : "0 1px 3px rgba(0,0,0,0.08)",
      }}
      onClick={() => onSelect(seed.id)}
      whileHover={{ scale: 1.06, y: -1 }}
      whileTap={{ scale: 0.94 }}
      aria-pressed={isSelected}
      aria-label={`${seed.name} seed${isSelected ? ", selected" : ""}`}
    >
      <span className="text-2xl leading-none">{seed.stages[3]}</span>
      <span
        className="text-xs font-semibold leading-tight"
        style={{
          color: isSelected ? "oklch(0.28 0.1 145)" : "oklch(0.42 0.08 145)",
        }}
      >
        {seed.name}
      </span>
      {isSelected && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="w-1.5 h-1.5 rounded-full"
          style={{ background: "oklch(0.5 0.16 145)" }}
        />
      )}
    </motion.button>
  );
}

// ─── Login Screen ─────────────────────────────────────────────────────────────

function LoginScreen({
  onLogin,
  isLoggingIn,
}: { onLogin: () => void; isLoggingIn: boolean }) {
  return (
    <div className="min-h-screen garden-bg flex flex-col items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="flex flex-col items-center gap-6 max-w-sm w-full"
      >
        {/* Garden header */}
        <motion.div
          className="text-center"
          animate={{ y: [0, -6, 0] }}
          transition={{
            duration: 3,
            repeat: Number.POSITIVE_INFINITY,
            ease: "easeInOut",
          }}
        >
          <div className="text-7xl mb-3">🌻</div>
          <h1
            className="text-4xl font-bold tracking-tight"
            style={{
              fontFamily: "Fraunces, serif",
              color: "oklch(0.24 0.09 140)",
            }}
          >
            Emoji Garden
          </h1>
          <p className="mt-2 text-sm" style={{ color: "oklch(0.44 0.1 140)" }}>
            Plant seeds · Water them · Watch them bloom
          </p>
        </motion.div>

        {/* Decorative plants */}
        <div className="flex gap-4 text-4xl" aria-hidden="true">
          {(["🌷-0", "🌵-1", "🍄-2", "🌹-3", "🍒-4"] as const).map(
            (emKey, i) => (
              <motion.span
                key={emKey}
                animate={{ rotate: ["-3deg", "3deg", "-3deg"] }}
                transition={{
                  duration: 2.5 + i * 0.3,
                  repeat: Number.POSITIVE_INFINITY,
                  ease: "easeInOut",
                  delay: i * 0.2,
                }}
              >
                {emKey.replace(/-\d$/, "")}
              </motion.span>
            ),
          )}
        </div>

        {/* Login card */}
        <motion.div
          className="w-full rounded-3xl p-6 flex flex-col items-center gap-4"
          style={{
            background: "oklch(0.97 0.02 90 / 0.82)",
            boxShadow:
              "0 8px 32px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.9)",
            backdropFilter: "blur(16px)",
            border: "1.5px solid oklch(0.86 0.06 145 / 0.5)",
          }}
        >
          <p
            className="text-center text-sm leading-relaxed"
            style={{ color: "oklch(0.38 0.07 145)" }}
          >
            Sign in to save your garden and watch your plants grow across
            visits! 🌱
          </p>

          <motion.button
            data-ocid="login.button"
            className="w-full flex items-center justify-center gap-2.5 px-6 py-3 rounded-2xl font-semibold text-base"
            style={{
              background: "oklch(0.5 0.16 145)",
              color: "oklch(0.98 0.01 90)",
              boxShadow: "0 4px 16px oklch(0.5 0.16 145 / 0.4)",
            }}
            onClick={onLogin}
            disabled={isLoggingIn}
            whileHover={{ scale: 1.02, y: -1 }}
            whileTap={{ scale: 0.98 }}
          >
            {isLoggingIn ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <LogIn size={18} />
            )}
            {isLoggingIn ? "Connecting..." : "Sign In to Garden"}
          </motion.button>
        </motion.div>

        {/* Footer */}
        <p
          className="text-xs text-center"
          style={{ color: "oklch(0.44 0.06 220)" }}
        >
          © {new Date().getFullYear()}.{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:opacity-75 transition-opacity"
          >
            Built with ❤️ using caffeine.ai
          </a>
        </p>
      </motion.div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
  const { identity, login, clear, isLoggingIn, isInitializing } =
    useInternetIdentity();
  const isAuthenticated = !!identity;

  const { data: garden, isLoading: gardenLoading } = useGetGarden();

  const plantSeedMutation = usePlantSeed();
  const waterPlantMutation = useWaterPlant();
  const clearPlotMutation = useClearPlot();

  const [selectedSeed, setSelectedSeed] = useState<SeedKey>("sunflower");
  const [animKeys, setAnimKeys] = useState<number[]>(() => Array(12).fill(0));
  const [sparkles, setSparkles] = useState<SparkleItem[]>([]);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [pendingPlots, setPendingPlots] = useState<Set<number>>(new Set());
  const sparkleIdRef = useRef(0);

  const addSparkle = useCallback((x: number, y: number, emoji: string) => {
    const id = ++sparkleIdRef.current;
    setSparkles((prev) => [...prev, { id, x: x - 16, y: y - 24, emoji }]);
  }, []);

  const removeSparkle = useCallback((id: number) => {
    setSparkles((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const bumpAnimKey = useCallback((index: number) => {
    setAnimKeys((prev) => {
      const next = [...prev];
      next[index] = prev[index] + 1;
      return next;
    });
  }, []);

  const handlePlant = useCallback(
    async (index: number, e: React.MouseEvent) => {
      if (!isAuthenticated || pendingPlots.has(index)) return;
      const cx = e.clientX;
      const cy = e.clientY;
      setPendingPlots((s) => new Set([...s, index]));
      try {
        await plantSeedMutation.mutateAsync({
          plotIndex: BigInt(index),
          seedType: selectedSeed,
        });
        bumpAnimKey(index);
        addSparkle(cx, cy, "🌱");
        toast.success(`${SEED_MAP[selectedSeed].name} planted! 🌱`, {
          duration: 1800,
        });
      } catch {
        toast.error("Could not plant seed");
      } finally {
        setPendingPlots((s) => {
          const n = new Set(s);
          n.delete(index);
          return n;
        });
      }
    },
    [
      isAuthenticated,
      selectedSeed,
      plantSeedMutation,
      bumpAnimKey,
      addSparkle,
      pendingPlots,
    ],
  );

  const handleWater = useCallback(
    async (index: number, e: React.MouseEvent) => {
      if (!isAuthenticated || pendingPlots.has(index)) return;
      const cx = e.clientX;
      const cy = e.clientY;
      const plot = garden?.plots[index];
      const prevStage = plot ? Number(plot.growthStage) : 0;
      setPendingPlots((s) => new Set([...s, index]));
      try {
        await waterPlantMutation.mutateAsync({ plotIndex: BigInt(index) });
        bumpAnimKey(index);
        addSparkle(cx, cy, "💧");
        // We check after refetch via the garden data
        const updatedPlot = garden?.plots[index];
        const newStage = updatedPlot
          ? Number(updatedPlot.growthStage)
          : prevStage;
        if (newStage > prevStage && newStage === 3) {
          const seedName = plot
            ? (SEED_MAP[plot.seedType as SeedKey]?.name ?? plot.seedType)
            : "";
          toast.success(`${seedName} bloomed! 🌸`, { duration: 2400 });
          addSparkle(cx - 8, cy - 20, "🌸");
          addSparkle(cx + 12, cy - 30, "✨");
        }
      } catch {
        toast.error("Could not water plant");
      } finally {
        setPendingPlots((s) => {
          const n = new Set(s);
          n.delete(index);
          return n;
        });
      }
    },
    [
      isAuthenticated,
      garden,
      waterPlantMutation,
      bumpAnimKey,
      addSparkle,
      pendingPlots,
    ],
  );

  const handleBloom = useCallback(
    (_index: number, e: React.MouseEvent) => {
      const cx = e.clientX;
      const cy = e.clientY;
      addSparkle(cx - 10, cy - 15, "✨");
      addSparkle(cx + 8, cy - 30, "🌟");
      addSparkle(cx - 5, cy - 40, "🎉");
    },
    [addSparkle],
  );

  const handleContextMenu = useCallback(
    (index: number, e: React.MouseEvent) => {
      e.preventDefault();
      setContextMenu({ plotIndex: index, x: e.clientX, y: e.clientY });
    },
    [],
  );

  const handleClearPlot = useCallback(
    async (index: number) => {
      setContextMenu(null);
      if (!isAuthenticated || pendingPlots.has(index)) return;
      setPendingPlots((s) => new Set([...s, index]));
      try {
        await clearPlotMutation.mutateAsync({ plotIndex: BigInt(index) });
        bumpAnimKey(index);
        toast("Plot cleared 🪴", { duration: 1600 });
      } catch {
        toast.error("Could not clear plot");
      } finally {
        setPendingPlots((s) => {
          const n = new Set(s);
          n.delete(index);
          return n;
        });
      }
    },
    [isAuthenticated, clearPlotMutation, bumpAnimKey, pendingPlots],
  );

  // Show initializing state
  if (isInitializing) {
    return (
      <div className="min-h-screen garden-bg flex items-center justify-center">
        <motion.div
          data-ocid="garden.loading_state"
          className="flex flex-col items-center gap-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <motion.span
            className="text-5xl"
            animate={{ rotate: [0, 15, -10, 8, 0] }}
            transition={{
              duration: 1.8,
              repeat: Number.POSITIVE_INFINITY,
              ease: "easeInOut",
            }}
          >
            🌻
          </motion.span>
          <p
            style={{
              color: "oklch(0.3 0.08 140)",
              fontFamily: "Fraunces, serif",
            }}
          >
            Growing your garden…
          </p>
        </motion.div>
      </div>
    );
  }

  // Login screen
  if (!isAuthenticated) {
    return (
      <>
        <LoginScreen onLogin={login} isLoggingIn={isLoggingIn} />
        <Toaster position="top-center" richColors />
      </>
    );
  }

  const plots = garden?.plots ?? Array(12).fill(null);
  const stats = garden?.stats ?? { totalBlooms: 0n, totalWaters: 0n };
  const totalBlooms = Number(stats.totalBlooms);
  const totalWaters = Number(stats.totalWaters);
  const principal = identity?.getPrincipal().toString() ?? "";
  const shortPrincipal = `${principal.slice(0, 5)}…${principal.slice(-3)}`;

  return (
    <div
      className="min-h-screen garden-bg flex flex-col"
      onClick={() => contextMenu && setContextMenu(null)}
      onKeyDown={(e) => e.key === "Escape" && setContextMenu(null)}
      role="presentation"
    >
      {/* ══ Header ══ */}
      <header className="relative z-10 px-4 pt-4 pb-2 sm:pt-5 sm:pb-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3 flex-wrap">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <motion.span
              className="text-3xl sm:text-4xl leading-none"
              animate={{ rotate: [0, -8, 8, -5, 0] }}
              transition={{
                duration: 3,
                repeat: Number.POSITIVE_INFINITY,
                repeatDelay: 5,
              }}
            >
              🌻
            </motion.span>
            <div>
              <h1
                className="text-2xl sm:text-3xl font-bold leading-none tracking-tight"
                style={{
                  fontFamily: "Fraunces, serif",
                  color: "oklch(0.24 0.09 140)",
                  textShadow: "0 2px 10px rgba(255,255,255,0.65)",
                }}
              >
                Emoji Garden
              </h1>
              <p
                className="text-xs mt-0.5"
                style={{ color: "oklch(0.44 0.1 140)" }}
              >
                Plant · Water · Bloom
              </p>
            </div>
          </div>

          {/* User + stats + logout */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Stats */}
            <div
              data-ocid="stats.panel"
              className="flex items-center gap-3 px-4 py-2 rounded-2xl font-semibold text-sm"
              style={{
                background: "oklch(0.97 0.02 90 / 0.88)",
                boxShadow:
                  "0 2px 12px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.9)",
                color: "oklch(0.3 0.1 55)",
                backdropFilter: "blur(8px)",
              }}
            >
              <span className="flex items-center gap-1">
                <span>🌸</span>
                <span>{totalBlooms}</span>
                <span className="font-normal opacity-60 text-xs">bloomed</span>
              </span>
              <span className="opacity-30">|</span>
              <span className="flex items-center gap-1">
                <Droplets size={14} style={{ color: "oklch(0.56 0.18 220)" }} />
                <span>{totalWaters}</span>
                <span className="font-normal opacity-60 text-xs">watered</span>
              </span>
            </div>

            {/* User pill */}
            <div
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium"
              style={{
                background: "oklch(0.96 0.04 145 / 0.75)",
                color: "oklch(0.4 0.1 145)",
                border: "1px solid oklch(0.82 0.08 145 / 0.4)",
              }}
            >
              <span>🪪</span>
              <span>{shortPrincipal}</span>
            </div>

            {/* Logout */}
            <motion.button
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium"
              style={{
                background: "oklch(0.97 0.02 90 / 0.72)",
                color: "oklch(0.45 0.08 20)",
                border: "1.5px solid oklch(0.8 0.08 20 / 0.3)",
                backdropFilter: "blur(8px)",
              }}
              onClick={clear}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              aria-label="Sign out"
            >
              <LogOut size={14} />
              <span className="hidden sm:inline">Sign Out</span>
            </motion.button>
          </div>
        </div>
      </header>

      {/* ══ Body ══ */}
      <main className="flex-1 flex flex-col gap-4 px-4 pb-4 max-w-5xl mx-auto w-full">
        {/* ── Seed Selector Tray ── */}
        <section
          data-ocid="seed.selector.panel"
          className="rounded-3xl p-3"
          style={{
            background: "oklch(0.96 0.05 145 / 0.72)",
            boxShadow:
              "0 4px 20px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.85)",
            backdropFilter: "blur(14px)",
            border: "1.5px solid oklch(0.82 0.08 145 / 0.5)",
          }}
        >
          <div
            className="px-1 pb-2 text-sm font-bold"
            style={{
              fontFamily: "Fraunces, serif",
              color: "oklch(0.3 0.1 145)",
            }}
          >
            🌱 Choose a Seed
          </div>
          <div className="grid grid-cols-6 gap-2">
            {SEEDS.map((seed, i) => (
              <SeedButton
                key={seed.id}
                seed={seed}
                index={i}
                isSelected={selectedSeed === seed.id}
                onSelect={setSelectedSeed}
              />
            ))}
          </div>
        </section>

        {/* ── Garden Grid ── */}
        <section
          className="flex-1 flex flex-col rounded-3xl overflow-hidden"
          style={{
            background: "oklch(0.52 0.14 145 / 0.22)",
            boxShadow:
              "0 4px 32px rgba(0,0,0,0.1), inset 0 2px 0 rgba(255,255,255,0.45)",
            backdropFilter: "blur(8px)",
            border: "2px solid oklch(0.62 0.14 145 / 0.28)",
          }}
        >
          {/* Grass strip */}
          <div
            className="flex justify-around items-end px-3 pt-3 pb-1.5"
            aria-hidden="true"
          >
            {[
              "🌿-a",
              "🍀-b",
              "🌿-c",
              "🍃-d",
              "🌿-e",
              "🍀-f",
              "🌿-g",
              "🌱-h",
              "🍀-i",
              "🌿-j",
              "🍃-k",
              "🌿-l",
            ].map((gKey, i) => (
              <motion.span
                key={gKey}
                className="text-sm opacity-75"
                animate={{ rotate: ["-2deg", "2deg", "-2deg"] }}
                transition={{
                  duration: 2.2 + i * 0.2,
                  repeat: Number.POSITIVE_INFINITY,
                  ease: "easeInOut",
                  delay: i * 0.12,
                }}
              >
                {gKey.replace(/-\w$/, "")}
              </motion.span>
            ))}
          </div>

          {/* Loading overlay */}
          {gardenLoading && (
            <div
              data-ocid="garden.loading_state"
              className="flex-1 flex items-center justify-center py-16"
            >
              <motion.div
                className="flex flex-col items-center gap-3"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <motion.span
                  className="text-5xl"
                  animate={{ scale: [1, 1.15, 1] }}
                  transition={{
                    duration: 1.4,
                    repeat: Number.POSITIVE_INFINITY,
                  }}
                >
                  🌱
                </motion.span>
                <p
                  style={{
                    color: "oklch(0.35 0.08 140)",
                    fontFamily: "Fraunces, serif",
                  }}
                >
                  Loading your garden…
                </p>
              </motion.div>
            </div>
          )}

          {/* Grid */}
          {!gardenLoading && (
            <div
              data-ocid="garden.canvas_target"
              className="flex-1 grid gap-2 sm:gap-3 p-3 sm:p-4"
              style={{ gridTemplateColumns: "repeat(4, 1fr)" }}
            >
              {PLOT_KEYS.map((plotKey, i) => (
                <PlotCell
                  key={plotKey}
                  plot={plots[i] ?? null}
                  index={i}
                  selectedSeed={selectedSeed}
                  onPlant={handlePlant}
                  onWater={handleWater}
                  onBloom={handleBloom}
                  onContextMenu={handleContextMenu}
                  isLoading={pendingPlots.has(i)}
                  animKey={animKeys[i]}
                />
              ))}
            </div>
          )}
        </section>

        {/* ── Tip bar ── */}
        <motion.div
          className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-medium text-center"
          style={{
            background: "oklch(0.97 0.02 90 / 0.65)",
            color: "oklch(0.36 0.08 145)",
            boxShadow: "0 2px 12px rgba(0,0,0,0.07)",
            backdropFilter: "blur(8px)",
          }}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Droplets
            size={14}
            style={{ color: "oklch(0.62 0.18 220)", flexShrink: 0 }}
          />
          <span>
            <strong>{SEED_MAP[selectedSeed].name}</strong> selected — click an
            empty plot to plant, then click to water!
            <span className="opacity-60 ml-1">
              (Right-click a plant to remove it)
            </span>
          </span>
        </motion.div>
      </main>

      {/* ══ Footer ══ */}
      <footer className="px-4 pb-4 text-center">
        <p className="text-xs" style={{ color: "oklch(0.44 0.06 220)" }}>
          © {new Date().getFullYear()}.{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:opacity-75 transition-opacity"
          >
            Built with ❤️ using caffeine.ai
          </a>
        </p>
      </footer>

      {/* ══ Context Menu ══ */}
      <AnimatePresence>
        {contextMenu && (
          <motion.div
            className="fixed z-50 rounded-2xl overflow-hidden"
            style={{
              left: contextMenu.x,
              top: contextMenu.y,
              background: "oklch(0.97 0.02 90 / 0.95)",
              boxShadow:
                "0 8px 32px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.12)",
              backdropFilter: "blur(16px)",
              border: "1px solid oklch(0.85 0.04 145 / 0.5)",
              minWidth: "160px",
            }}
            initial={{ opacity: 0, scale: 0.9, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -4 }}
            transition={{ duration: 0.15 }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              data-ocid="garden.delete_button"
              className="flex items-center gap-2.5 w-full px-4 py-3 text-sm font-medium text-left hover:bg-red-50 transition-colors"
              style={{ color: "oklch(0.5 0.2 25)" }}
              onClick={() => handleClearPlot(contextMenu.plotIndex)}
            >
              <Trash2 size={14} />
              Remove plant
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══ Sparkles ══ */}
      <AnimatePresence>
        {sparkles.map((sparkle) => (
          <FloatingSparkle
            key={sparkle.id}
            sparkle={sparkle}
            onDone={removeSparkle}
          />
        ))}
      </AnimatePresence>

      <Toaster position="top-center" richColors />
    </div>
  );
}
