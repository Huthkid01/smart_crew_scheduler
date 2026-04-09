import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera } from "lucide-react";
import { SmartCrewLogoMark } from "@/components/SmartCrewLogoMark";
import { supabase } from "@/supabase/client";
import { toast } from "sonner";

export default function ProfilePage() {
  const [user, setUser] = useState({
    id: "",
    name: "",
    email: "",
    role: "",
    avatarUrl: "",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  async function fetchProfile() {
    setIsLoading(true);
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (error) throw error;

      if (profile) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const p = profile as any;
        setUser({
          id: p.id,
          name: p.full_name || "",
          email: p.email || "",
          role: p.role || "employee",
          avatarUrl: p.avatar_url || "https://github.com/shadcn.png",
        });
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setIsLoading(false);
    }
  }

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file type
    if (!file.type.startsWith('image/')) {
        toast.error('Please upload an image file');
        return;
    }

    // Check file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
        toast.error('Image must be less than 2MB');
        return;
    }

    try {
        setIsSaving(true);
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}-${Math.random()}.${fileExt}`;
        const filePath = `${fileName}`;

        // 1. Upload to Supabase Storage
        const { error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(filePath, file);

        if (uploadError) {
            // If bucket doesn't exist, this will fail.
            throw uploadError;
        }

        // 2. Get Public URL
        const { data: { publicUrl } } = supabase.storage
            .from('avatars')
            .getPublicUrl(filePath);

        // 3. Update Profile
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: updateError } = await (supabase.from('profiles') as any)
            .update({ avatar_url: publicUrl })
            .eq('id', user.id);

        if (updateError) throw updateError;

        // 4. Update Local State
        setUser(prev => ({ ...prev, avatarUrl: publicUrl }));
        toast.success('Profile picture updated!');

    } catch (error) {
        console.error('Error uploading avatar:', error);
        toast.error('Failed to upload avatar. Make sure the "avatars" storage bucket exists and is public.');
    } finally {
        setIsSaving(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase.from('profiles') as any)
            .update({
                full_name: user.name,
                // We don't update email here usually as it requires re-verification
            })
            .eq('id', user.id);

        if (error) throw error;
        toast.success("Profile updated successfully!");
    } catch (error) {
        console.error("Error updating profile:", error);
        toast.error("Failed to update profile.");
    } finally {
        setIsSaving(false);
    }
  };

  if (isLoading) {
      return (
          <div className="flex items-center justify-center h-full pt-20">
              <SmartCrewLogoMark size="sm" />
          </div>
      );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Profile</h1>
        <p className="text-zinc-400">Manage your account settings and preferences.</p>
      </div>

      <form onSubmit={handleSave}>
        <Card className="bg-zinc-900 border-zinc-800 text-white">
            <CardHeader>
                <CardTitle>Personal Information</CardTitle>
                <CardDescription className="text-zinc-400">Update your personal details.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="flex items-center space-x-4">
                    <div className="relative">
                        <Avatar className="h-20 w-20">
                            <AvatarImage src={user.avatarUrl} alt={user.name} />
                            <AvatarFallback>JD</AvatarFallback>
                        </Avatar>
                        <Button 
                            type="button"
                            variant="secondary" 
                            size="icon" 
                            className="absolute bottom-0 right-0 h-6 w-6 rounded-full cursor-pointer"
                            onClick={handleAvatarClick}
                            disabled={isSaving}
                        >
                            <Camera className="h-3 w-3" />
                        </Button>
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            onChange={handleFileChange} 
                            className="hidden" 
                            accept="image/*"
                        />
                    </div>
                    <div>
                        <h3 className="font-medium text-lg">{user.name}</h3>
                        <p className="text-sm text-zinc-400">{user.role}</p>
                    </div>
                </div>

                <div className="grid gap-4">
                    <div className="grid gap-2">
                        <Label htmlFor="name">Full Name</Label>
                        <Input 
                            id="name" 
                            value={user.name}
                            onChange={(e) => setUser({...user, name: e.target.value})}
                            className="bg-zinc-950 border-zinc-800" 
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="email">Email</Label>
                        <Input 
                            id="email" 
                            type="email" 
                            value={user.email} 
                            className="bg-zinc-950 border-zinc-800" 
                            disabled 
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="role">Role</Label>
                        <Input 
                            id="role" 
                            value={user.role} 
                            className="bg-zinc-950 border-zinc-800" 
                            disabled 
                        />
                    </div>
                </div>
            </CardContent>
             <div className="p-6 pt-0 flex justify-end">
                <Button type="submit" className="bg-primary text-black hover:bg-primary/90 font-bold" disabled={isSaving}>
                    {isSaving ? <SmartCrewLogoMark size="xs" className="mr-2" /> : null}
                    Save Changes
                </Button>
            </div>
        </Card>
      </form>
    </div>
  );
}
