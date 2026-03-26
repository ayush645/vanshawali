'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Crown, TrendingUp } from 'lucide-react';

interface Subscription {
  id: string;
  userId: string;
  tier: string;
  status: string;
  startDate: string;
  endDate: string | null;
  amount: number | null;
}

interface SubscriptionWithUser extends Subscription {
  userName?: string;
  userEmail?: string;
}

export default function SubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<SubscriptionWithUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    revenue: 0,
  });

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const fetchSubscriptions = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch('http://localhost:3000/api/admin/subscriptions', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setSubscriptions(data);
        
        // Calculate stats
        const active = data.filter((s: Subscription) => s.status === 'active').length;
        const revenue = data.reduce((sum: number, s: Subscription) => sum + (s.amount || 0), 0);
        
        setStats({
          total: data.length,
          active,
          revenue,
        });
      }
    } catch (error) {
      console.error('Failed to fetch subscriptions', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Subscriptions Management</h1>
        <p className="text-muted-foreground mt-2">
          Monitor and manage user subscriptions
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="text-sm font-medium">Total Subscriptions</div>
            <Crown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="text-sm font-medium">Active Subscriptions</div>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.active}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="text-sm font-medium">Total Revenue</div>
            <span className="text-2xl">$</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.revenue.toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="text-center py-8">Loading...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User ID</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead>Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subscriptions.map((subscription) => (
                  <TableRow key={subscription.id}>
                    <TableCell className="font-mono text-sm">
                      {subscription.userId.slice(0, 8)}...
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="capitalize">
                        {subscription.tier}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          subscription.status === 'active' ? 'default' : 'destructive'
                        }
                      >
                        {subscription.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(subscription.startDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {subscription.endDate
                        ? new Date(subscription.endDate).toLocaleDateString()
                        : 'Lifetime'}
                    </TableCell>
                    <TableCell>
                      {subscription.amount ? `$${subscription.amount}` : '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
