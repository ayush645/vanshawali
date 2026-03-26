'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, ArrowLeft } from 'lucide-react';

interface UserDetail {
  id: string;
  name: string;
  email: string;
  role: string;
  community?: string;
  treeRootId?: string;
  premium: boolean;
  createdAt: string;
}

export default function UserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.id as string;

  const [user, setUser] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await api.get(`/admin/users/${userId}`);
        setUser(response.data);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to fetch user details';
        setError(message);
        console.error('[v0] User detail fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [userId]);

  if (error) {
    return (
      <div className="space-y-8">
        <Link href="/admin/users">
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Users
          </Button>
        </Link>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Link href="/admin/users">
        <Button variant="outline" className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Users
        </Button>
      </Link>

      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {loading ? <Skeleton className="h-9 w-64" /> : user?.name}
        </h1>
        <p className="text-muted-foreground">{loading ? <Skeleton className="h-4 w-40 mt-2" /> : 'User Details'}</p>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-6 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : user ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Email</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-semibold">{user.email}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Role</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-semibold">{user.role}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Community</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-semibold">{user.community || 'Not assigned'}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Premium Status</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-semibold">{user.premium ? 'Premium' : 'Free'}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Tree Root ID</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-semibold font-mono text-sm break-all">{user.treeRootId || 'N/A'}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Created At</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-semibold">{new Date(user.createdAt).toLocaleDateString()}</p>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
