import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Zap, Eye, EyeOff } from "lucide-react";
import { SmartCrewLogoMark } from "@/components/SmartCrewLogoMark";
import { supabase } from "@/supabase/client";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  // Check if already logged in
  useEffect(() => {
    const checkSession = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            const { data: profile } = await supabase
              .from("profiles")
              .select("org_id")
              .eq("id", session.user.id)
              .maybeSingle();

            const orgId =
              (profile as unknown as { org_id?: string | null } | null)?.org_id ?? null;

            navigate(orgId ? "/dashboard" : "/signup");
        }
    };
    checkSession();
  }, [navigate]);

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);
    setError(null);

    // Timeout safety
    const timeoutId = setTimeout(() => {
        setIsLoading(false);
        setError("Request timed out. Please check your connection.");
    }, 15000);

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      clearTimeout(timeoutId);

      if (authError) throw authError;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/dashboard");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("org_id")
        .eq("id", user.id)
        .maybeSingle();

      const orgId =
        (profile as unknown as { org_id?: string | null } | null)?.org_id ?? null;

      navigate(orgId ? "/dashboard" : "/signup");
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : "Invalid email or password";
      setError(errorMessage);
    } finally {
      clearTimeout(timeoutId);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black p-4">
      <div className="w-full max-w-[400px] sm:max-w-md space-y-8 bg-zinc-900 p-6 sm:p-8 rounded-xl border border-zinc-800">
        <div className="text-center">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
              <Zap className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-white">SmartCrew Scheduler</span>
          </Link>
          <h2 className="text-2xl font-bold text-white">Welcome back</h2>
          <p className="text-zinc-400 mt-2">Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md text-destructive text-sm">
              {error}
            </div>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="email" className="text-white">Email</Label>
            <Input 
              id="email" 
              type="email" 
              {...register("email")} 
              className="bg-zinc-950 border-zinc-800 text-white focus:ring-primary"
              placeholder="john@example.com"
            />
            {errors.email && <p className="text-destructive text-xs">{errors.email.message}</p>}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-white">Password</Label>
              <Link to="/forgot-password" className="text-sm text-primary hover:underline">
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Input 
                id="password" 
                type={showPassword ? "text" : "password"} 
                {...register("password")} 
                className="bg-zinc-950 border-zinc-800 text-white focus:ring-primary pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-zinc-400 hover:text-white"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            {errors.password && <p className="text-destructive text-xs">{errors.password.message}</p>}
          </div>

          <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-black font-bold" disabled={isLoading}>
            {isLoading ? <SmartCrewLogoMark size="xs" /> : "Sign In"}
          </Button>
        </form>

        <div className="text-center text-sm text-zinc-400">
          Need an admin account?{" "}
          <Link to="/signup" className="text-primary hover:underline">
            Sign up (admin)
          </Link>
        </div>
      </div>
    </div>
  );
}
