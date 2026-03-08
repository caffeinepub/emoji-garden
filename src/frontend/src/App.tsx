import { Toaster } from "@/components/ui/sonner";
import { Droplets, Trash2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

// ─── Types & Constants ────────────────────────────────────────────────────────

type SeedKey =
  | "sunflower"
  | "rose"
  | "cactus"
  | "mushroom"
  | "cherry"
  | "tulip"
  | "watermelon"
  | "corn"
  | "strawberry"
  | "grape"
  | "pumpkin"
  | "bamboo"
  | "blueberry"
  | "coconut"
  | "daisy"
  | "lavender";

interface SeedDef {
  id: SeedKey;
  name: string;
  stages: [string, string, string, string];
}

const SEEDS: SeedDef[] = [
  { id: "sunflower", name: "Sunflower", stages: ["🌱", "🌿", "🌻", "🌻✨"] },
  { id: "rose", name: "Rose", stages: ["🌱", "🌿", "🌹", "🌹✨"] },
  { id: "cactus", name: "Cactus", stages: ["🌱", "🌵", "🌵", "🌵✨"] },
  { id: "mushroom", name: "Mushroom", stages: ["🌱", "🍄", "🍄", "🍄✨"] },
  { id: "cherry", name: "Cherry", stages: ["🌱", "🌿", "🍒", "🍒✨"] },
  { id: "tulip", name: "Tulip", stages: ["🌱", "🌿", "🌷", "🌷✨"] },
  { id: "watermelon", name: "Watermelon", stages: ["🌱", "🌿", "🍉", "🍉✨"] },
  { id: "corn", name: "Corn", stages: ["🌱", "🌿", "🌽", "🌽✨"] },
  { id: "strawberry", name: "Strawberry", stages: ["🌱", "🌿", "🍓", "🍓✨"] },
  { id: "grape", name: "Grape", stages: ["🌱", "🌿", "🍇", "🍇✨"] },
  { id: "pumpkin", name: "Pumpkin", stages: ["🌱", "🌿", "🎃", "🎃✨"] },
  { id: "bamboo", name: "Bamboo", stages: ["🌱", "🎋", "🎋", "🎋✨"] },
  { id: "blueberry", name: "Blueberry", stages: ["🌱", "🌿", "🫐", "🫐✨"] },
  { id: "coconut", name: "Coconut", stages: ["🌱", "🌴", "🌴", "🌴✨"] },
  { id: "daisy", name: "Daisy", stages: ["🌱", "🌿", "🌼", "🌼✨"] },
  { id: "lavender", name: "Lavender", stages: ["🌱", "🌿", "💜", "💜✨"] },
];

const SEED_MAP = Object.fromEntries(SEEDS.map((s) => [s.id, s])) as Record<
  SeedKey,
  SeedDef
>;

// Waters needed: stage 0→1: 3, 1→2: 3 more (6 total), 2→3: 4 more (10 total)
const STAGE_THRESHOLD = [3, 6, 10];

function getStageFromWater(waterCount: number): number {
  if (waterCount >= STAGE_THRESHOLD[2]) return 3;
  if (waterCount >= STAGE_THRESHOLD[1]) return 2;
  if (waterCount >= STAGE_THRESHOLD[0]) return 1;
  return 0;
}

function getWaterProgress(waterCount: number, stage: number): number {
  if (stage >= 3) return 100;
  const prev = stage === 0 ? 0 : STAGE_THRESHOLD[stage - 1];
  const next = STAGE_THRESHOLD[stage];
  return Math.min(((waterCount - prev) / (next - prev)) * 100, 100);
}

// ─── State Types ───────────────────────────────────────────────────────────────

interface PlotState {
  seedType: SeedKey;
  growthStage: number;
  waterCount: number;
}

interface GardenState {
  plots: (PlotState | null)[];
  basket: Partial<Record<SeedKey, number>>;
  stats: { totalBlooms: number; totalWaters: number; totalHarvests: number };
}

const STORAGE_KEY = "emoji-garden-v2";
const PLOT_COUNT = 16;

function loadState(): GardenState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as GardenState;
      // Ensure plots array is the right length
      const plots = Array(PLOT_COUNT)
        .fill(null)
        .map((_, i) => parsed.plots?.[i] ?? null);
      return {
        plots,
        basket: parsed.basket ?? {},
        stats: parsed.stats ?? {
          totalBlooms: 0,
          totalWaters: 0,
          totalHarvests: 0,
        },
      };
    }
  } catch {
    // ignore
  }
  return {
    plots: Array(PLOT_COUNT).fill(null),
    basket: {},
    stats: { totalBlooms: 0, totalWaters: 0, totalHarvests: 0 },
  };
}

function saveState(state: GardenState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

// Stable keys for the 16 plots
const PLOT_KEYS = Array.from({ length: PLOT_COUNT }, (_, i) => `plot-${i}`);

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
}: {
  sparkle: SparkleItem;
  onDone: (id: number) => void;
}) {
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
  plot: PlotState | null;
  index: number;
  selectedSeed: SeedKey | null;
  onPlant: (index: number, e: React.MouseEvent) => void;
  onWater: (index: number, e: React.MouseEvent) => void;
  onHarvest: (index: number, e: React.MouseEvent) => void;
  onContextMenu: (index: number, e: React.MouseEvent) => void;
  animKey: number;
}

function PlotCell({
  plot,
  index,
  selectedSeed,
  onPlant,
  onWater,
  onHarvest,
  onContextMenu,
  animKey,
}: PlotCellProps) {
  const isEmpty = plot === null;
  const canPlant = isEmpty && selectedSeed !== null;
  const stage = plot ? plot.growthStage : 0;
  const isBloomed = stage === 3;
  const emoji = plot
    ? (SEED_MAP[plot.seedType]?.stages[Math.min(stage, 3)] ?? "🌱")
    : "";
  const progress = plot ? getWaterProgress(plot.waterCount, stage) : 0;

  function handleClick(e: React.MouseEvent) {
    if (isEmpty) {
      if (canPlant) onPlant(index, e);
    } else if (isBloomed) {
      onHarvest(index, e);
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
      ].join(" ")}
      style={{
        aspectRatio: "1",
        background: isBloomed
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
        canPlant || !isEmpty ? { scale: 1.08, y: -2 } : { scale: 1.02 }
      }
      whileTap={{ scale: 0.9 }}
      aria-label={
        isEmpty
          ? canPlant
            ? `Plant ${selectedSeed} here`
            : "Empty plot"
          : isBloomed
            ? `${plot?.seedType} fully bloomed — tap to harvest!`
            : `${plot?.seedType} — stage ${stage}, progress ${Math.round(progress)}%`
      }
    >
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

          {/* Harvest prompt */}
          {isBloomed ? (
            <>
              <motion.div
                className="absolute inset-0 rounded-2xl pointer-events-none"
                animate={{
                  boxShadow: [
                    "0 0 0px 0px rgba(255,210,60,0)",
                    "0 0 18px 7px rgba(255,210,60,0.65)",
                    "0 0 0px 0px rgba(255,210,60,0)",
                  ],
                }}
                transition={{
                  duration: 2.4,
                  repeat: Number.POSITIVE_INFINITY,
                  ease: "easeInOut",
                }}
              />
              <motion.span
                className="absolute bottom-1.5 text-[9px] font-bold leading-tight"
                style={{
                  color: "oklch(0.95 0.14 85)",
                  textShadow: "0 1px 4px rgba(0,0,0,0.5)",
                  letterSpacing: "0.03em",
                }}
                animate={{ opacity: [0.75, 1, 0.75] }}
                transition={{
                  duration: 1.6,
                  repeat: Number.POSITIVE_INFINITY,
                  ease: "easeInOut",
                }}
              >
                🧺 Harvest!
              </motion.span>
            </>
          ) : (
            /* Water progress bar */
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
        "flex flex-col items-center gap-0.5 px-1.5 py-2 rounded-xl",
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
      <span className="text-xl leading-none">{seed.stages[3]}</span>
      <span
        className="text-[10px] font-semibold leading-tight truncate w-full text-center"
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

// ─── Basket Panel ─────────────────────────────────────────────────────────────

interface BasketPanelProps {
  basket: Partial<Record<SeedKey, number>>;
}

function BasketPanel({ basket }: BasketPanelProps) {
  const entries = Object.entries(basket).filter(
    ([, count]) => (count ?? 0) > 0,
  ) as [SeedKey, number][];

  return (
    <section
      data-ocid="basket.panel"
      className="rounded-3xl p-4"
      style={{
        background: "oklch(0.96 0.06 75 / 0.82)",
        boxShadow:
          "0 4px 20px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.85)",
        backdropFilter: "blur(14px)",
        border: "1.5px solid oklch(0.84 0.1 75 / 0.5)",
      }}
    >
      {/* Basket header */}
      <div
        className="flex items-center gap-2 mb-3"
        style={{ fontFamily: "Fraunces, serif" }}
      >
        <motion.span
          className="text-2xl"
          animate={{ rotate: [-4, 4, -4] }}
          transition={{
            duration: 3.5,
            repeat: Number.POSITIVE_INFINITY,
            ease: "easeInOut",
          }}
        >
          🧺
        </motion.span>
        <h2
          className="text-lg font-bold"
          style={{ color: "oklch(0.3 0.1 60)" }}
        >
          Harvest Basket
        </h2>
        {entries.length > 0 && (
          <span
            className="ml-auto text-sm font-semibold px-2 py-0.5 rounded-full"
            style={{
              background: "oklch(0.84 0.14 70 / 0.5)",
              color: "oklch(0.3 0.1 60)",
            }}
          >
            {entries.reduce((sum, [, c]) => sum + c, 0)} total
          </span>
        )}
      </div>

      {entries.length === 0 ? (
        <div
          data-ocid="basket.empty_state"
          className="flex flex-col items-center gap-2 py-6 text-center"
        >
          <span className="text-4xl opacity-40">🌱</span>
          <p className="text-sm" style={{ color: "oklch(0.5 0.08 70)" }}>
            Your basket is empty — harvest bloomed plants to fill it!
          </p>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <AnimatePresence>
            {entries.map(([seedKey, count], i) => {
              const def = SEED_MAP[seedKey];
              if (!def) return null;
              return (
                <motion.div
                  key={seedKey}
                  data-ocid={`basket.item.${i + 1}`}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl"
                  style={{
                    background: "oklch(0.92 0.1 75 / 0.7)",
                    boxShadow:
                      "0 2px 8px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.7)",
                    border: "1px solid oklch(0.8 0.1 70 / 0.4)",
                  }}
                  initial={{ opacity: 0, scale: 0.7 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.6 }}
                  transition={{ type: "spring", stiffness: 400, damping: 22 }}
                  layout
                >
                  <span className="text-xl leading-none">{def.stages[3]}</span>
                  <div className="flex flex-col leading-none">
                    <span
                      className="text-xs font-bold"
                      style={{ color: "oklch(0.28 0.1 60)" }}
                    >
                      {def.name}
                    </span>
                  </div>
                  <span
                    className="text-sm font-bold px-1.5 py-0.5 rounded-full ml-1"
                    style={{
                      background: "oklch(0.72 0.16 60)",
                      color: "oklch(0.98 0.02 80)",
                    }}
                  >
                    ×{count}
                  </span>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </section>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
  const [gardenState, setGardenState] = useState<GardenState>(loadState);
  const [selectedSeed, setSelectedSeed] = useState<SeedKey>("sunflower");
  const [animKeys, setAnimKeys] = useState<number[]>(() =>
    Array(PLOT_COUNT).fill(0),
  );
  const [sparkles, setSparkles] = useState<SparkleItem[]>([]);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const sparkleIdRef = useRef(0);

  // Persist to localStorage whenever state changes
  useEffect(() => {
    saveState(gardenState);
  }, [gardenState]);

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
    (index: number, e: React.MouseEvent) => {
      const cx = e.clientX;
      const cy = e.clientY;
      setGardenState((prev) => {
        const plots = [...prev.plots];
        plots[index] = {
          seedType: selectedSeed,
          growthStage: 0,
          waterCount: 0,
        };
        return { ...prev, plots };
      });
      bumpAnimKey(index);
      addSparkle(cx, cy, "🌱");
      toast.success(`${SEED_MAP[selectedSeed].name} planted! 🌱`, {
        duration: 1800,
      });
    },
    [selectedSeed, bumpAnimKey, addSparkle],
  );

  const handleWater = useCallback(
    (index: number, e: React.MouseEvent) => {
      const cx = e.clientX;
      const cy = e.clientY;
      setGardenState((prev) => {
        const plots = [...prev.plots];
        const plot = plots[index];
        if (!plot) return prev;

        const newWaterCount = plot.waterCount + 1;
        const newStage = getStageFromWater(newWaterCount);
        const justBloomed = newStage === 3 && plot.growthStage < 3;

        plots[index] = {
          ...plot,
          waterCount: newWaterCount,
          growthStage: newStage,
        };

        const stats = { ...prev.stats };
        stats.totalWaters += 1;
        if (justBloomed) {
          stats.totalBlooms += 1;
          // Schedule toast outside setState
          setTimeout(() => {
            const seedName = SEED_MAP[plot.seedType]?.name ?? plot.seedType;
            toast.success(`${seedName} bloomed! 🌸`, { duration: 2400 });
            addSparkle(cx - 8, cy - 20, "🌸");
            addSparkle(cx + 12, cy - 30, "✨");
          }, 50);
        }

        return { ...prev, plots, stats };
      });
      bumpAnimKey(index);
      addSparkle(cx, cy, "💧");
    },
    [bumpAnimKey, addSparkle],
  );

  const handleHarvest = useCallback(
    (index: number, e: React.MouseEvent) => {
      const cx = e.clientX;
      const cy = e.clientY;
      setGardenState((prev) => {
        const plots = [...prev.plots];
        const plot = plots[index];
        if (!plot || plot.growthStage !== 3) return prev;

        const seedType = plot.seedType;
        plots[index] = null;

        const basket = { ...prev.basket };
        basket[seedType] = (basket[seedType] ?? 0) + 1;

        const stats = {
          ...prev.stats,
          totalHarvests: prev.stats.totalHarvests + 1,
        };

        setTimeout(() => {
          const seedName = SEED_MAP[seedType]?.name ?? seedType;
          toast.success(`${seedName} harvested! Added to basket 🧺`, {
            duration: 2000,
          });
          addSparkle(cx - 10, cy - 15, "✨");
          addSparkle(cx + 8, cy - 30, "🌟");
          addSparkle(cx - 5, cy - 40, "🎉");
        }, 50);

        return { ...prev, plots, basket, stats };
      });
      bumpAnimKey(index);
    },
    [bumpAnimKey, addSparkle],
  );

  const handleContextMenu = useCallback(
    (index: number, e: React.MouseEvent) => {
      e.preventDefault();
      setContextMenu({ plotIndex: index, x: e.clientX, y: e.clientY });
    },
    [],
  );

  const handleClearPlot = useCallback(
    (index: number) => {
      setContextMenu(null);
      setGardenState((prev) => {
        const plots = [...prev.plots];
        plots[index] = null;
        return { ...prev, plots };
      });
      bumpAnimKey(index);
      toast("Plot cleared 🪴", { duration: 1600 });
    },
    [bumpAnimKey],
  );

  const { plots, basket, stats } = gardenState;

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
                Plant · Water · Harvest
              </p>
            </div>
          </div>

          {/* Stats */}
          <div
            data-ocid="stats.panel"
            className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 rounded-2xl font-semibold text-sm flex-wrap"
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
              <span>{stats.totalBlooms}</span>
              <span className="font-normal opacity-60 text-xs">bloomed</span>
            </span>
            <span className="opacity-30">|</span>
            <span className="flex items-center gap-1">
              <Droplets size={14} style={{ color: "oklch(0.56 0.18 220)" }} />
              <span>{stats.totalWaters}</span>
              <span className="font-normal opacity-60 text-xs">watered</span>
            </span>
            <span className="opacity-30">|</span>
            <span className="flex items-center gap-1">
              <span>🧺</span>
              <span>{stats.totalHarvests}</span>
              <span className="font-normal opacity-60 text-xs">harvested</span>
            </span>
          </div>
        </div>
      </header>

      {/* ══ Body ══ */}
      <main className="flex-1 flex flex-col gap-4 px-4 pb-4 max-w-5xl mx-auto w-full">
        {/* ── Seed Selector Tray ── */}
        <section
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
          <div className="grid grid-cols-8 gap-1.5 sm:gap-2">
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
              "🌿-m",
              "🍀-n",
              "🌱-o",
              "🍃-p",
            ].map((gKey, i) => (
              <motion.span
                key={gKey}
                className="text-sm opacity-75"
                animate={{ rotate: ["-2deg", "2deg", "-2deg"] }}
                transition={{
                  duration: 2.2 + i * 0.15,
                  repeat: Number.POSITIVE_INFINITY,
                  ease: "easeInOut",
                  delay: i * 0.1,
                }}
              >
                {gKey.replace(/-\w$/, "")}
              </motion.span>
            ))}
          </div>

          {/* Loading state placeholder (kept for marker requirement) */}
          <div
            data-ocid="garden.loading_state"
            className="hidden"
            aria-hidden="true"
          />

          {/* Grid */}
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
                onHarvest={handleHarvest}
                onContextMenu={handleContextMenu}
                animKey={animKeys[i]}
              />
            ))}
          </div>
        </section>

        {/* ── Harvest Basket ── */}
        <BasketPanel basket={basket} />

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
            Select a seed, plant it, water it to grow, then harvest when
            bloomed!
            <span className="opacity-60 ml-1">(Right-click to remove.)</span>
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
