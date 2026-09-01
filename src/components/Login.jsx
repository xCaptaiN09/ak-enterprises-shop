import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { motion, AnimatePresence } from "framer-motion";
import { Battery, UserPlus, LogIn, Sun, Moon } from "lucide-react";
import { useTheme } from "../context/ThemeContext";

// Fallback shown only if the live name can't be fetched (e.g. offline).
const FALLBACK_NAME = "Battery CRM";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [mode, setMode] = useState("login");
  const [signupSuccess, setSignupSuccess] = useState(false);
  const [brandName, setBrandName] = useState(FALLBACK_NAME);
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    supabase
      .rpc("get_public_shop_name")
      .then(({ data }) => {
        if (data) setBrandName(data);
      })
      .catch(() => {});
  }, []);

  const brandMark = brandName.trim().split(/\s+/)[0] || "CRM";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSignupSuccess(false);

    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) setError(error.message);
    } else {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) setError(error.message);
      else {
        setSignupSuccess(true);
        setMode("login");
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col items-center justify-center p-6 transition-colors bg-[var(--canvas)]">
      {/* Faint brand-script watermark, centered behind everything */}
      <span
        aria-hidden="true"
        className="brand-mark pointer-events-none select-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-0 whitespace-nowrap text-[34vw] md:text-[18rem] xl:text-[22rem] text-zinc-900/[0.04] dark:text-white/[0.05]"
      >
        {brandMark}
      </span>

      {/* Theme toggle — same floating circular chip as the dashboard */}
      <button
        onClick={toggleTheme}
        aria-label="Toggle theme"
        className="absolute top-5 right-5 z-20 w-10 h-10 rounded-full flex items-center justify-center bg-[var(--card)] border border-[var(--card-border)] shadow-sm text-zinc-900 dark:text-white transition-transform active:scale-95"
      >
        {theme === "dark" ? (
          <Sun className="w-5 h-5 text-amber-400" />
        ) : (
          <Moon className="w-5 h-5" />
        )}
      </button>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md flex flex-col items-center text-center"
      >
        <div className="p-4 rounded-2xl mb-6 bg-zinc-900 dark:bg-white shadow-sm">
          <Battery className="w-8 h-8 text-white dark:text-zinc-900" />
        </div>

        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-2 text-zinc-900 dark:text-white">
          {brandName}
        </h1>
        <p className="text-base md:text-lg text-zinc-500 dark:text-zinc-400 mb-10 font-light">
          {mode === "login"
            ? "Welcome back. Sign in to manage your shop."
            : "Create a worker account to get started."}
        </p>

        <form onSubmit={handleSubmit} className="w-full space-y-5 text-left">
          <div>
            <label
              htmlFor="email"
              className="block text-xs text-zinc-400 dark:text-zinc-500 mb-2 uppercase tracking-widest font-bold"
            >
              Email Address
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-transparent border-b-2 border-zinc-200 dark:border-zinc-800 px-1 py-3 text-lg text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:border-zinc-900 dark:focus:border-white focus:outline-none transition-colors"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label
              htmlFor="password"
              className="block text-xs text-zinc-400 dark:text-zinc-500 mb-2 uppercase tracking-widest font-bold"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-transparent border-b-2 border-zinc-200 dark:border-zinc-800 px-1 py-3 text-lg text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:border-zinc-900 dark:focus:border-white focus:outline-none transition-colors"
              placeholder="••••••••"
            />
          </div>

          <AnimatePresence>
            {error && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-red-500 dark:text-red-400 text-sm bg-red-500/10 p-3 rounded-xl border border-red-500/20"
              >
                {error}
              </motion.p>
            )}
            {signupSuccess && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-green-600 dark:text-green-400 text-sm bg-green-500/10 p-3 rounded-xl border border-green-500/20"
              >
                Account created! Please ask the Admin to approve you, then sign
                in.
              </motion.p>
            )}
          </AnimatePresence>

          <motion.button
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={loading}
            className="w-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-bold py-4 rounded-xl mt-2 hover:opacity-90 transition-opacity flex items-center justify-center gap-2 text-base disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (
              "Please wait..."
            ) : mode === "login" ? (
              <>
                <LogIn className="w-5 h-5" /> Sign In
              </>
            ) : (
              <>
                <UserPlus className="w-5 h-5" /> Sign Up
              </>
            )}
          </motion.button>
        </form>

        <div className="mt-8">
          <button
            onClick={() => {
              setMode(mode === "login" ? "signup" : "login");
              setError(null);
              setSignupSuccess(false);
            }}
            className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors font-medium"
          >
            {mode === "login"
              ? "Need an account? Sign Up"
              : "Already have an account? Sign In"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
