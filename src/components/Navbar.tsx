import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { Button } from "./ui/button";
import { Zap } from "lucide-react";
import { getSessionSafe, supabase } from "@/supabase/client";

export function Navbar() {
  const [isAuthed, setIsAuthed] = useState(false);

  useEffect(() => {
    let isMounted = true;

    (async () => {
      const { data } = await getSessionSafe();
      if (!isMounted) return;
      setIsAuthed(Boolean(data.session));
    })();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return;
      setIsAuthed(Boolean(session));
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-black/50 backdrop-blur-md">
      <div className="container mx-auto px-6 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
            <Zap className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold tracking-tight text-white">
            SmartCrew<span className="text-primary">Scheduler</span>
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          <button 
            onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
            className="text-sm font-medium text-gray-300 hover:text-white transition-colors bg-transparent border-none cursor-pointer"
          >
            Features
          </button>
          <button 
            onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })}
            className="text-sm font-medium text-gray-300 hover:text-white transition-colors bg-transparent border-none cursor-pointer"
          >
            Pricing
          </button>
          <button 
            onClick={() => document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' })}
            className="text-sm font-medium text-gray-300 hover:text-white transition-colors bg-transparent border-none cursor-pointer"
          >
            About
          </button>
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          {isAuthed ? (
            <Link to="/dashboard">
              <Button className="bg-primary hover:bg-primary/90 text-black font-semibold h-8 px-3 text-xs md:h-10 md:px-4 md:text-sm">
                Dashboard
              </Button>
            </Link>
          ) : (
            <>
              <Link to="/login">
                <Button variant="ghost" className="text-gray-300 hover:text-white hover:bg-white/10 h-8 px-3 text-xs md:h-10 md:px-4 md:text-sm">
                  Sign In
                </Button>
              </Link>
              <Link to="/signup">
                <Button className="bg-primary hover:bg-primary/90 text-black font-semibold h-8 px-3 text-xs md:h-10 md:px-4 md:text-sm">
                  Get Started
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
