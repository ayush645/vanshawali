'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Crown, Plus, Edit, Trash2, Users, Star, Eye } from 'lucide-react';

interface SubscriptionPlan {
  _id: string;
  name: string;
  planId: string;
  price: number;
  currency: string;
  interval: string;
  features: string[];
  description: string;
  isActive: boolean;
  isPopular: boolean;
  displayOrder: number;
  createdAt: string;
}

interface PlanForm {
  name: string;
  planId: string;
  price: number;
  currency: string;
  interval: string;
  features: string[];
  description: string;
  isPopular: boolean;
  displayOrder: number;
  isActive: boolean;
}

export default function PlansPage() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [subscribersDialogOpen, setSubscribersDialogOpen] = useState(false);
  const [selectedPlanSubscribers, setSelectedPlanSubscribers] = useState<any[]>([]);

  const [formData, setFormData] = useState<PlanForm>({
    name: '',
    planId: '',
    price: 0,
    currency: 'INR',
    interval: 'month',
    features: [''],
    description: '',
    isPopular: false,
    displayOrder: 0,
    isActive: true,
  });

  const [newFeature, setNewFeature] = useState('');

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      setError(null);
      const token = localStorage.getItem('admin_token');
      
      if (!token) {
        setError('No admin token found');
        return;
      }

      const res = await fetch('https://api.vanshawali.tatvagyaan.in/api/admin/plans', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setPlans(Array.isArray(data) ? data : []);
      } else {
        const errorData = await res.json().catch(() => ({ message: 'Failed to fetch plans' }));
        setError(errorData.message || 'Failed to fetch plans');
      }
    } catch (error) {
      console.error('Failed to fetch plans', error);
      setError('Network error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const token = localStorage.getItem('admin_token');
      const url = editingPlan 
        ? `https://api.vanshawali.tatvagyaan.in/api/admin/plans/${editingPlan._id}`
        : 'https://api.vanshawali.tatvagyaan.in/api/admin/plans';
      
      const method = editingPlan ? 'PUT' : 'POST';
      
      // Filter out empty features
      const cleanedFeatures = formData.features.filter(f => f.trim() !== '');
      
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          features: cleanedFeatures,
        }),
      });

      if (res.ok) {
        await fetchPlans();
        setIsDialogOpen(false);
        resetForm();
      } else {
        const errorData = await res.json();
        setError(errorData.message || 'Failed to save plan');
      }
    } catch (error) {
      console.error('Failed to save plan', error);
      setError('Network error occurred');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this plan?')) return;

    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch(`https://api.vanshawali.tatvagyaan.in/api/admin/plans/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        await fetchPlans();
      } else {
        const errorData = await res.json();
        setError(errorData.message || 'Failed to delete plan');
      }
    } catch (error) {
      console.error('Failed to delete plan', error);
      setError('Network error occurred');
    }
  };

  const handleEdit = (plan: SubscriptionPlan) => {
    setEditingPlan(plan);
    setFormData({
      name: plan.name,
      planId: plan.planId,
      price: plan.price,
      currency: plan.currency,
      interval: plan.interval,
      features: plan.features.length > 0 ? plan.features : [''],
      description: plan.description,
      isPopular: plan.isPopular,
      displayOrder: plan.displayOrder,
      isActive: plan.isActive,
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setEditingPlan(null);
    setFormData({
      name: '',
      planId: '',
      price: 0,
      currency: 'INR',
      interval: 'month',
      features: [''],
      description: '',
      isPopular: false,
      displayOrder: 0,
      isActive: true,
    });
  };

  const addFeature = () => {
    if (newFeature.trim()) {
      setFormData({
        ...formData,
        features: [...formData.features, newFeature.trim()]
      });
      setNewFeature('');
    }
  };

  const removeFeature = (index: number) => {
    setFormData({
      ...formData,
      features: formData.features.filter((_, i) => i !== index)
    });
  };

  const updateFeature = (index: number, value: string) => {
    const updatedFeatures = [...formData.features];
    updatedFeatures[index] = value;
    setFormData({
      ...formData,
      features: updatedFeatures
    });
  };

  const viewSubscribers = async (planId: string) => {
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch(`https://api.vanshawali.tatvagyaan.in/api/admin/plans/${planId}/subscribers`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const subscribers = await res.json();
        setSelectedPlanSubscribers(subscribers);
        setSubscribersDialogOpen(true);
      }
    } catch (error) {
      console.error('Failed to fetch subscribers', error);
    }
  };

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Subscription Plans</h1>
          <p className="text-muted-foreground mt-2">
            Create and manage subscription plans
          </p>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8 text-red-600">
              Error: {error}
              <button 
                onClick={fetchPlans}
                className="ml-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Retry
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Subscription Plans</h1>
          <p className="text-muted-foreground mt-2">
            Create and manage subscription plans that appear in the mobile app
          </p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Create Plan
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingPlan ? 'Edit Subscription Plan' : 'Create New Subscription Plan'}
              </DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Plan Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="e.g., Premium Monthly"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="planId">Plan ID</Label>
                  <Input
                    id="planId"
                    value={formData.planId}
                    onChange={(e) => setFormData({...formData, planId: e.target.value.toLowerCase().replace(/\s+/g, '_')})}
                    placeholder="e.g., premium_monthly"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="price">Price</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({...formData, price: parseFloat(e.target.value) || 0})}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="currency">Currency</Label>
                  <Select value={formData.currency} onValueChange={(value) => setFormData({...formData, currency: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="INR">INR (₹)</SelectItem>
                      <SelectItem value="USD">USD ($)</SelectItem>
                      <SelectItem value="EUR">EUR (€)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="interval">Billing Interval</Label>
                  <Select value={formData.interval} onValueChange={(value) => setFormData({...formData, interval: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="month">Monthly</SelectItem>
                      <SelectItem value="year">Yearly</SelectItem>
                      <SelectItem value="lifetime">Lifetime</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Brief description of the plan"
                />
              </div>

              <div>
                <Label>Features</Label>
                <div className="space-y-2">
                  {formData.features.map((feature, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={feature}
                        onChange={(e) => updateFeature(index, e.target.value)}
                        placeholder="Enter feature"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => removeFeature(index)}
                        disabled={formData.features.length === 1}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <Input
                      value={newFeature}
                      onChange={(e) => setNewFeature(e.target.value)}
                      placeholder="Add new feature"
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addFeature())}
                    />
                    <Button type="button" onClick={addFeature}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="isPopular"
                    checked={formData.isPopular}
                    onChange={(e) => setFormData({...formData, isPopular: e.target.checked})}
                  />
                  <Label htmlFor="isPopular">Mark as Popular</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({...formData, isActive: e.target.checked})}
                  />
                  <Label htmlFor="isActive">Active</Label>
                </div>

                <div>
                  <Label htmlFor="displayOrder">Display Order</Label>
                  <Input
                    id="displayOrder"
                    type="number"
                    value={formData.displayOrder}
                    onChange={(e) => setFormData({...formData, displayOrder: parseInt(e.target.value) || 0})}
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingPlan ? 'Update Plan' : 'Create Plan'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="text-center py-8">Loading...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Plan</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Interval</TableHead>
                  <TableHead>Features</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plans.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No plans found. Create your first subscription plan!
                    </TableCell>
                  </TableRow>
                ) : (
                  plans.map((plan) => (
                    <TableRow key={plan._id}>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {plan.isPopular && <Star className="h-4 w-4 text-yellow-500" />}
                          <div>
                            <div className="font-medium">{plan.name}</div>
                            <div className="text-sm text-muted-foreground">{plan.planId}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {plan.currency} {plan.price}
                      </TableCell>
                      <TableCell className="capitalize">
                        {plan.interval}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {plan.features.slice(0, 2).map((feature, index) => (
                            <div key={index}>• {feature}</div>
                          ))}
                          {plan.features.length > 2 && (
                            <div className="text-muted-foreground">
                              +{plan.features.length - 2} more
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={plan.isActive ? 'default' : 'secondary'}>
                          {plan.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => viewSubscribers(plan.planId)}
                          >
                            <Users className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(plan)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(plan._id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Subscribers Dialog */}
      <Dialog open={subscribersDialogOpen} onOpenChange={setSubscribersDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Plan Subscribers</DialogTitle>
          </DialogHeader>
          <div className="max-h-96 overflow-y-auto">
            {selectedPlanSubscribers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No subscribers found for this plan
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Start Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedPlanSubscribers.map((sub) => (
                    <TableRow key={sub._id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{sub.user?.name || 'Unknown'}</div>
                          <div className="text-sm text-muted-foreground">{sub.user?.email || 'N/A'}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={sub.status === 'active' ? 'default' : 'secondary'}>
                          {sub.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {sub.startDate ? new Date(sub.startDate).toLocaleDateString() : 'N/A'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}