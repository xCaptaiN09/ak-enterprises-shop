import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
import { ThemeProvider } from "./context/ThemeContext";
import Login from "./components/Login";
import Dashboard from "./components/Dashboard";
import { Loader2 } from "lucide-react";
import { Toaster } from "./utils/toast";

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-black dark:bg-black">
        <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
      </div>
    );
  }

  return (
    <ThemeProvider>
      <Toaster />
      {session ? <Dashboard /> : <Login />}
    </ThemeProvider>
  );
}

export default App;
