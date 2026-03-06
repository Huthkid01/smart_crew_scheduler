import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Building } from "lucide-react";
import { supabase } from "@/supabase/client";
import { toast } from "sonner";
// import type { Database } from "@/supabase/types";

interface Profile {
  org_id: string;
}

// type OrganizationUpdate = Database['public']['Tables']['organizations']['Update'];

export default function SettingsPage() {
  const [org, setOrg] = useState({
    id: "",
    name: "",
    subscription_tier: "",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchOrg();
  }, []);

  async function fetchOrg() {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('org_id')
        .eq('id', user.id)
        .single();

      if (profile) {
        const orgId = (profile as Profile).org_id;
        
        const { data: orgData, error } = await supabase
            .from('organizations')
            .select('*')
            .eq('id', orgId)
            .single();

        if (error) throw error;
        
        if (orgData) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const d = orgData as any;
            setOrg({
                id: d.id,
                name: d.name,
                subscription_tier: d.subscription_tier || "free"
            });
        }
      }
    } catch (error) {
      console.error("Error fetching organization:", error);
    } finally {
      setIsLoading(false);
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase.from('organizations') as any)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .update({ name: org.name } as any)
            .eq('id', org.id);

        if (error) throw error;
        toast.success("Organization settings updated successfully!");
    } catch (error) {
        console.error("Error updating organization:", error);
        toast.error("Failed to update organization.");
    } finally {
        setIsSaving(false);
    }
  };

  if (isLoading) {
      return (
          <div className="flex items-center justify-center h-full pt-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
      );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Organization Settings</h1>
        <p className="text-zinc-400">Manage your organization details and subscription.</p>
      </div>

      <form onSubmit={handleSave}>
        <Card className="bg-zinc-900 border-zinc-800 text-white">
            <CardHeader>
                <CardTitle>General Information</CardTitle>
                <CardDescription className="text-zinc-400">Update your organization's basic details.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="flex items-center space-x-4">
                    <div className="h-20 w-20 rounded-full bg-zinc-800 flex items-center justify-center border border-zinc-700">
                        <Building className="h-10 w-10 text-zinc-400" />
                    </div>
                    <div>
                        <h3 className="font-medium text-lg">{org.name}</h3>
                        <p className="text-sm text-zinc-400 capitalize">{org.subscription_tier} Plan</p>
                    </div>
                </div>

                <div className="grid gap-4">
                    <div className="grid gap-2">
                        <Label htmlFor="name">Organization Name</Label>
                        <Input 
                            id="name" 
                            value={org.name}
                            onChange={(e) => setOrg({...org, name: e.target.value})}
                            className="bg-zinc-950 border-zinc-800" 
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="id">Organization ID</Label>
                        <Input 
                            id="id" 
                            value={org.id} 
                            className="bg-zinc-950 border-zinc-800 font-mono text-xs" 
                            disabled 
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="tier">Subscription Tier</Label>
                         <div className="flex items-center gap-2">
                            <Input 
                                id="tier" 
                                value={org.subscription_tier.toUpperCase()} 
                                className="bg-zinc-950 border-zinc-800" 
                                disabled 
                            />
                            <Button type="button" variant="outline" className="shrink-0 bg-transparent text-white border-zinc-700 hover:bg-zinc-800">
                                Upgrade Plan
                            </Button>
                         </div>
                    </div>
                </div>
            </CardContent>
             <div className="p-6 pt-0 flex justify-end">
                <Button type="submit" className="bg-primary text-black hover:bg-primary/90 font-bold" disabled={isSaving}>
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Save Changes
                </Button>
            </div>
        </Card>
      </form>
    </div>
  );
}
