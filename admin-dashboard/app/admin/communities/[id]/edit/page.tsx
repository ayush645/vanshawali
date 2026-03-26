'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, ArrowLeft } from 'lucide-react';

interface Community {
  id: string;
  name: string;
}

export default function EditCommunityPage() {
  const params = useParams();
  const router = useRouter();
  const communityId = params.id as string;

  const [community, setCommunity] = useState<Community | null>(null);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const fetchCommunity = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await api.get(`/admin/communities/${communityId}`);
        setCommunity(response.data);
        setName(response.data.name);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to fetch community';
        setError(message);
        console.error('[v0] Community fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCommunity();
  }, [communityId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError('Community name is required');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccess(false);

      await api.put(`/admin/communities/${communityId}`, { name });
      setSuccess(true);
      setTimeout(() => {
        router.push('/admin/communities');
      }, 1500);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save community';
      setError(message);
      console.error('[v0] Community save error:', err);
    } finally {
      setSaving(false);
    }
  };

  if (error && loading) {
    return (
      <div className="space-y-8">
        <Link href="/admin/communities">
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Communities
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
      <Link href="/admin/communities">
        <Button variant="outline" className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Communities
        </Button>
      </Link>

      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {loading ? <Skeleton className="h-9 w-64" /> : `Edit Community`}
        </h1>
        <p className="text-muted-foreground">Update community information</p>
      </div>

      {success && (
        <Alert className="bg-green-50 text-green-900 border-green-200">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Community updated successfully. Redirecting...</AlertDescription>
        </Alert>
      )}

      {error && !loading && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Community Information</CardTitle>
          <CardDescription>Edit the community details</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-10 w-full" />
              </div>
            </div>
          ) : (
            <form onSubmit={handleSave} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Community Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter community name"
                  disabled={saving}
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={saving}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
                <Link href="/admin/communities">
                  <Button type="button" variant="outline">
                    Cancel
                  </Button>
                </Link>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
