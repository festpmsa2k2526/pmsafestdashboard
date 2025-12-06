'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ThemeSwitcher } from "@/components/theme-switcher";
import { Trophy, AlertCircle, Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface UserProfile {
  id: string;
  role: 'admin' | 'captain';
  team_id: string | null;
  full_name: string | null;
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('No user found');

      const { data: rawData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authData.user.id)
        .maybeSingle();

      if (profileError) throw profileError;

      const profile = rawData as UserProfile | null;

      if (!profile) {
        throw new Error('Profile not found. Please contact administrator.');
      }

      if (profile.role === 'admin') router.push('/admin');
      else if (profile.role === 'captain') router.push('/captain');
      else router.push('/');

    } catch (err: any) {
      console.error('Login failed:', err);
      setError(err.message || 'Invalid login credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">

      {/* Abstract Background Shapes */}
      {/* Updated to explicit arbitrary values for v4 safety */}
      <div className="absolute top-[-10%] left-[-10%] w-160 h-160 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-120 h-120 bg-secondary rounded-full blur-3xl opacity-50 pointer-events-none" />

      {/* Top Controls */}
      <div className="absolute top-6 left-6 z-20">
        <Link href="/">
            <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
                <ArrowLeft className="w-4 h-4" /> Back
            </Button>
        </Link>
      </div>
      <div className="absolute top-6 right-6 z-20">
        <ThemeSwitcher />
      </div>

      <div className="w-full max-w-md p-4 z-10 animate-fade-in-up">
        <Card className="glass-card shadow-2xl border-white/20 dark:border-white/10">
          <CardHeader className="text-center space-y-4 pb-8">
            {/* Logo with v4 Gradient Syntax (bg-linear-to-br) */}
            <div className="mx-auto w-16 h-16 bg-linear-to-br from-primary to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-primary/30 transform rotate-3 hover:rotate-6 transition-transform">
              <Trophy className="w-8 h-8 text-white" />
            </div>
            <div className="space-y-1">
                <CardTitle className="text-3xl font-heading font-bold tracking-tight">Welcome Back</CardTitle>
                <CardDescription className="text-base">Enter your credentials to access the dashboard</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-medium ml-1" htmlFor="email">Email Address</label>
                <Input
                  id="email"
                  type="email"
                  placeholder="team@masa.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-12 bg-background/50 border-input/60 focus:ring-primary/20 focus:border-primary"
                />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                    <label className="text-sm font-medium ml-1" htmlFor="password">Password</label>
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-12 bg-background/50 border-input/60 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              {error && (
                <div className="p-4 bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-lg flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  {error}
                </div>
              )}

              <Button type="submit" className="w-full h-12 text-base font-medium shadow-lg shadow-primary/20" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Authenticating...
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
        <p className="text-center text-xs text-muted-foreground mt-8">
            Protected by College IT Department. Unauthorized access is prohibited.
        </p>
      </div>
    </div>
  );
}