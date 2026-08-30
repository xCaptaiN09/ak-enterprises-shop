import { useState, useEffect, useMemo, useRef } from "react";
import { supabase } from "../supabaseClient";
import { motion } from "framer-motion";
import {
  TrendingUp,
  IndianRupee,
  Wrench,
  CheckCircle2,
  CalendarRange,
  ChevronDown,
} from "lucide-react";

const fmtDate = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;

const PRESETS = [
  { id: "today", label: "Today" },
  { id: "week", label: "1 Week" },
  { id: "month", label: "1 Month" },
  { id: "6m", label: "6 Months" },
  { id: "all", label: "Total" },
];

function RangePicker({ period, onChange, onAccent, compact }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, []);

  const label =
    period.preset === "custom"
      ? "Custom"
      : PRESETS.find((p) => p.id === period.preset)?.label;

  const btn = onAccent
    ? "border-white/20 text-white/80 dark:border-zinc-900/20 dark:text-zinc-900/80 hover:bg-white/10 dark:hover:bg-zinc-900/10"
    : "border-[var(--card-border)] text-zinc-500 dark:text-zinc-400 hover:bg-black/5 dark:hover:bg-white/5";

  const row = (active) =>
    `w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
      active
        ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
        : "text-zinc-600 dark:text-zinc-300 hover:bg-black/5 dark:hover:bg-white/5"
    }`;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-bold transition-colors ${btn} ${
          compact ? "!px-2" : ""
        }`}
      >
        <CalendarRange className="w-3.5 h-3.5" />
        {!compact && <span>{label}</span>}
        <ChevronDown className="w-3 h-3" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 z-30 w-44 glass-card rounded-2xl p-2 shadow-xl">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                onChange({ ...period, preset: p.id });
                setOpen(false);
              }}
              className={row(period.preset === p.id)}
            >
              {p.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => onChange({ ...period, preset: "custom" })}
            className={row(period.preset === "custom")}
          >
            Custom Range
          </button>

          {period.preset === "custom" && (
            <div className="mt-2 pt-2 border-t border-zinc-200 dark:border-zinc-700 space-y-2 px-1">
              <div>
                <span className="block text-[10px] uppercase tracking-wider font-bold text-zinc-400 dark:text-zinc-500 mb-1">
                  From
                </span>
                <input
                  type="date"
                  value={period.from || ""}
                  onChange={(e) =>
                    onChange({ ...period, from: e.target.value })
                  }
                  className="premium-input w-full rounded-lg px-2 py-1.5 text-xs outline-none"
                />
              </div>
              <div>
                <span className="block text-[10px] uppercase tracking-wider font-bold text-zinc-400 dark:text-zinc-500 mb-1">
                  To
                </span>
                <input
                  type="date"
                  value={period.to || ""}
                  onChange={(e) => onChange({ ...period, to: e.target.value })}
                  className="premium-input w-full rounded-lg px-2 py-1.5 text-xs outline-none"
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Overview({ shopName = "" }) {
  const [salesRaw, setSalesRaw] = useState([]);
  const [service, setService] = useState({ active: 0, ready: 0 });
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState({ preset: "month", from: "", to: "" });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    const { data: salesData } = await supabase
      .from("sales")
      .select("price, sale_date");
    const { data: serviceData } = await supabase
      .from("service")
      .select("status");

    let active = 0,
      ready = 0;
    if (serviceData) {
      serviceData.forEach((svc) => {
        if (["Received", "Under Testing", "Charging"].includes(svc.status))
          active += 1;
        else if (svc.status === "Ready for Delivery") ready += 1;
      });
    }

    setSalesRaw(salesData || []);
    setService({ active, ready });
    setLoading(false);
  };

  const range = useMemo(() => {
    const now = new Date();
    const to = fmtDate(now);
    switch (period.preset) {
      case "today":
        return { from: to, to };
      case "week": {
        const d = new Date();
        d.setDate(d.getDate() - 6);
        return { from: fmtDate(d), to };
      }
      case "month": {
        const d = new Date();
        d.setDate(d.getDate() - 29);
        return { from: fmtDate(d), to };
      }
      case "6m": {
        const d = new Date();
        d.setMonth(d.getMonth() - 6);
        return { from: fmtDate(d), to };
      }
      case "custom":
        return { from: period.from || null, to: period.to || null };
      default:
        return { from: null, to: null };
    }
  }, [period]);

  const filteredSales = useMemo(
    () =>
      salesRaw.filter((s) => {
        const d = s.sale_date || null;
        if (range.from && (!d || d < range.from)) return false;
        if (range.to && (!d || d > range.to)) return false;
        return true;
      }),
    [salesRaw, range],
  );

  const revenue = filteredSales.reduce((s, x) => s + (x.price || 0), 0);
  const salesCount = filteredSales.length;

  const brandMark = (shopName || "").trim().split(/\s+/)[0] || "CRM";

  const supporting = [
    {
      title: "Sales",
      value: salesCount,
      icon: TrendingUp,
      color: "text-indigo-500",
      bg: "bg-indigo-500/10",
      picker: true,
    },
    {
      title: "Active Service",
      value: service.active,
      icon: Wrench,
      color: "text-amber-500",
      bg: "bg-amber-500/10",
    },
    {
      title: "Ready for Delivery",
      value: service.ready,
      icon: CheckCircle2,
      color: "text-teal-500",
      bg: "bg-teal-500/10",
    },
  ];

  return (
    <div className="relative overflow-x-clip">
      <span
        aria-hidden="true"
        className="brand-mark pointer-events-none select-none absolute top-0 right-0 z-0 -translate-y-2 translate-x-[12%] md:translate-x-0 whitespace-nowrap text-[26vw] md:text-[9rem] xl:text-[10rem] text-zinc-900/[0.045] md:text-zinc-900/[0.06] dark:text-white/[0.05] md:dark:text-white/[0.07]"
      >
        {brandMark}
      </span>

      <div className="relative z-10">
        <div className="mb-8 md:mb-14">
          <h2 className="text-4xl md:text-6xl xl:text-7xl font-extrabold tracking-tighter text-zinc-900 dark:text-white">
            Dashboard
          </h2>
          <p className="text-sm md:text-base text-zinc-500 dark:text-zinc-400 font-medium mt-1">
            Overview of your shop's performance.
          </p>
        </div>

        {loading ? (
          <div className="p-10 text-center text-zinc-500 dark:text-zinc-400">
            Loading stats...
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {/* Hero revenue */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="accent-card rounded-3xl p-6 md:p-8 flex flex-col justify-between min-h-[180px]"
            >
              <div className="flex justify-between items-start gap-2">
                <span className="text-[11px] text-zinc-400 dark:text-zinc-500 uppercase tracking-widest font-bold">
                  Revenue
                </span>
                <div className="flex items-center gap-2">
                  <RangePicker period={period} onChange={setPeriod} onAccent />
                  <div className="p-2.5 rounded-xl bg-amber-400/15 dark:bg-amber-500/10">
                    <IndianRupee className="w-5 h-5 text-amber-400 dark:text-amber-600" />
                  </div>
                </div>
              </div>
              <div className="text-5xl md:text-6xl font-extrabold tracking-tight text-white dark:text-zinc-900 font-mono">
                ₹{revenue.toLocaleString()}
              </div>
            </motion.div>

            {/* Supporting stats */}
            <div className="grid grid-cols-3 gap-3 md:gap-4">
              {supporting.map((card, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.08 * (idx + 1) }}
                  className="glass-card rounded-2xl md:rounded-3xl p-4 md:p-5 flex flex-col justify-between min-h-[120px] md:min-h-[140px]"
                >
                  <div className="flex items-start justify-between gap-1">
                    <div
                      className={`p-2 rounded-lg md:rounded-xl ${card.bg} w-fit`}
                    >
                      <card.icon className={`w-4 h-4 ${card.color}`} />
                    </div>
                    {card.picker && (
                      <RangePicker
                        period={period}
                        onChange={setPeriod}
                        compact
                      />
                    )}
                  </div>
                  <div>
                    <div className="text-2xl md:text-3xl font-extrabold font-mono text-zinc-900 dark:text-white">
                      {card.value}
                    </div>
                    <span className="text-[10px] text-zinc-400 dark:text-zinc-500 uppercase tracking-wider font-bold">
                      {card.title}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Status pill */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="inline-flex items-center gap-2.5 rounded-full bg-[var(--card)] border border-[var(--card-border)] px-4 py-2 w-fit"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
              </span>
              <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                All systems running smoothly
              </span>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}
