import { useState } from "react";
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
import type { Database } from "@/supabase/types";

const signupSchema = z.object({
  orgName: z.string().min(2, "Organization name is required"),
  fullName: z.string().min(2, "Full name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type SignupFormValues = z.infer<typeof signupSchema>;
type OrganizationInsert = Database["public"]["Tables"]["organizations"]["Insert"];
type OrganizationRow = Database["public"]["Tables"]["organizations"]["Row"];
type ProfileInsert = Database["public"]["Tables"]["profiles"]["Insert"];

export default function SignupPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  
  const { register, handleSubmit, formState: { errors } } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
  });

  const onSubmit = async (data: SignupFormValues) => {
    setIsLoading(true);
    setError(null);

    try {
      // 1. Create user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            full_name: data.fullName,
          }
        }
      });

      if (authError) throw authError;
      
      // If no user object is returned (e.g. email confirmation required but not disabled),
      // we can't proceed.
      if (!authData.user) {
         throw new Error("Signup successful, but no user data returned. Please check your email for verification.");
      }

      if (!authData.session) {
        throw new Error(
          "Signup created, but you are not signed in yet. Your Supabase project likely requires email confirmation. Please confirm your email, then sign in to continue (or disable email confirmation in Supabase Auth settings for instant signup)."
        );
      }

      // 2. Create organization
      const orgPayload: OrganizationInsert = { name: data.orgName };
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .insert(orgPayload)
        .select()
        .single();
          
      if (orgError || !orgData) {
             // If organization creation fails, we might want to cleanup user, but for MVP/demo
             // we'll just log and throw. In real app, consider transaction or cleanup.
             console.error("Org creation failed", orgError);
             throw new Error("Failed to create organization. Please try again.");
      }

      // 3. Create/update profile linked to org (single upsert; avoids .single() 406 noise)
      const profilePayload: ProfileInsert = {
        id: authData.user.id,
        org_id: (orgData as OrganizationRow).id,
        full_name: data.fullName,
        role: "admin",
        email: data.email,
      };

      const { error: profileError } = await supabase.from("profiles").upsert(profilePayload, {
        onConflict: "id",
      });

      if (profileError) {
        console.error("Profile upsert failed", profileError);
        throw new Error("Failed to create profile. Please contact support.");
      }

      navigate('/dashboard');
    } catch (err: unknown) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : "An error occurred during signup";
      setError(errorMessage);
    } finally {
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
          <h2 className="text-2xl font-bold text-white">Create your account</h2>
          <p className="text-zinc-400 mt-2">Start managing your team intelligently</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md text-destructive text-sm">
              {error}
            </div>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="orgName" className="text-white">Organization Name</Label>
            <Input 
              id="orgName" 
              {...register("orgName")} 
              className="bg-zinc-950 border-zinc-800 text-white focus:ring-primary"
              placeholder="Acme Corp"
            />
            {errors.orgName && <p className="text-destructive text-xs">{errors.orgName.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="fullName" className="text-white">Full Name</Label>
            <Input 
              id="fullName" 
              {...register("fullName")} 
              className="bg-zinc-950 border-zinc-800 text-white focus:ring-primary"
              placeholder="John Doe"
            />
            {errors.fullName && <p className="text-destructive text-xs">{errors.fullName.message}</p>}
          </div>

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
            <Label htmlFor="password" className="text-white">Password</Label>
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

          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-white">Confirm Password</Label>
            <div className="relative">
              <Input 
                id="confirmPassword" 
                type={showConfirmPassword ? "text" : "password"} 
                {...register("confirmPassword")} 
                className="bg-zinc-950 border-zinc-800 text-white focus:ring-primary pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-zinc-400 hover:text-white"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            {errors.confirmPassword && <p className="text-destructive text-xs">{errors.confirmPassword.message}</p>}
          </div>

          <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-black font-bold" disabled={isLoading}>
            {isLoading ? <SmartCrewLogoMark size="xs" /> : "Sign Up"}
          </Button>
        </form>

        <div className="text-center text-sm text-zinc-400">
          Already have an account?{" "}
          <Link to="/login" className="text-primary hover:underline">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
