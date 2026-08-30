import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, AlertCircle, Info } from "lucide-react";

let listeners = [];
let idCounter = 0;

export function toast(message, type = "error") {
  const id = ++idCounter;
  listeners.forEach((l) => l({ id, message, type }));
}

export function Toaster() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const push = ({ id, message, type }) => {
      setToasts((t) => [...t, { id, message, type }]);
      setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
    };
    listeners.push(push);
    return () => {
      listeners = listeners.filter((l) => l !== push);
    };
  }, []);

  const icons = {
    success: <CheckCircle2 className="w-4 h-4 text-teal-500 flex-shrink-0" />,
    error: <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />,
    info: <Info className="w-4 h-4 text-indigo-500 flex-shrink-0" />,
  };

  return (
    <div className="fixed bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 z-[60] flex flex-col items-center gap-2 pointer-events-none w-full max-w-sm px-4">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            className="glass-card rounded-full px-4 py-2.5 shadow-lg flex items-center gap-2.5 w-full pointer-events-auto"
          >
            {icons[t.type] || icons.info}
            <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-200 flex-1">
              {t.message}
            </span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
