'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, ArrowLeft } from 'lucide-react';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  premium: boolean;
}

export default function CommunityUsersPage() {
  const params = useParams();
  const communityId = params.id as string;

  const [users, setUsers] = useState<User[]>([]);
  const [communityName, setCommunityName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCommunityUsers = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await api.get(`/admin/communities/${communityId}/users`);
        setUsers(response.data.users || []);
        setCommunityName(response.data.communityName || '');
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to fetch community users';
        setError(message);
        console.error('[v0] Community users fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCommunityUsers();
  }, [communityId]);

  if (error) {
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
          {loading ? <Skeleton className="h-9 w-64" /> : `${communityName} - Members`}
        </h1>
        <p className="text-muted-foreground">Users belonging to this community</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Community Members</CardTitle>
          <CardDescription>Total: {users.length} members</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Premium</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-32" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-16" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-12" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : users.length > 0 ? (
                  users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{user.role}</TableCell>
                      <TableCell>{user.premium ? 'Yes' : 'No'}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      No users in this community
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
