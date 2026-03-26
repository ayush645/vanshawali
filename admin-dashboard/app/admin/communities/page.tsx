'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Search, Trash2, Plus, Edit, Eye } from 'lucide-react';
import { toast } from 'sonner';

interface Community {
  _id: string;
  name: string;
  description?: string;
  rules?: string;
  admin: string;
  state?: string;
  district?: string;
  gotra?: string;
  kuldevi?: string;
  originHistory?: string;
  kuldeviTraditions?: string;
  gotraList?: string;
  migrationNotes?: string;
  notablePersonalities?: string;
  totalMembers: number;
  totalContributors: number;
  visibility: 'public' | 'private';
  createdAt: string;
  updatedAt: string;
}

interface CommunityFormData {
  name: string;
  description: string;
  rules: string;
  state: string;
  district: string;
  gotra: string;
  kuldevi: string;
  originHistory: string;
  kuldeviTraditions: string;
  gotraList: string;
  migrationNotes: string;
  notablePersonalities: string;
  visibility: 'public' | 'private';
}

const initialFormData: CommunityFormData = {
  name: '',
  description: '',
  rules: '',
  state: '',
  district: '',
  gotra: '',
  kuldevi: '',
  originHistory: '',
  kuldeviTraditions: '',
  gotraList: '',
  migrationNotes: '',
  notablePersonalities: '',
  visibility: 'public',
};

export default function CommunitiesPage() {
  const [communities, setCommunities] = useState<Community[]>([]);
  const [filteredCommunities, setFilteredCommunities] = useState<Community[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [formData, setFormData] = useState<CommunityFormData>(initialFormData);
  const [editingCommunity, setEditingCommunity] = useState<Community | null>(null);
  const [viewingCommunity, setViewingCommunity] = useState<Community | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    fetchCommunities();
  }, []);

  useEffect(() => {
    if (searchQuery) {
      const filtered = communities.filter((community) =>
        community.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        community.state?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        community.gotra?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredCommunities(filtered);
    } else {
      setFilteredCommunities(communities);
    }
  }, [searchQuery, communities]);

  const fetchCommunities = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch('http://localhost:3000/api/communities', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setCommunities(data);
        setFilteredCommunities(data);
      } else {
        toast.error('Failed to fetch communities');
      }
    } catch (error) {
      console.error('Failed to fetch communities', error);
      toast.error('Failed to fetch communities');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateCommunity = async () => {
    if (!formData.name.trim()) {
      toast.error('Community name is required');
      return;
    }

    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch('http://localhost:3000/api/admin/communities', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        toast.success('Community created successfully');
        setIsCreateDialogOpen(false);
        setFormData(initialFormData);
        fetchCommunities();
      } else {
        const error = await res.json();
        toast.error(error.message || 'Failed to create community');
      }
    } catch (error) {
      console.error('Failed to create community', error);
      toast.error('Failed to create community');
    }
  };

  const handleEditCommunity = async () => {
    if (!editingCommunity || !formData.name.trim()) {
      toast.error('Community name is required');
      return;
    }

    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch(`http://localhost:3000/api/admin/communities/${editingCommunity._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        toast.success('Community updated successfully');
        setIsEditDialogOpen(false);
        setEditingCommunity(null);
        setFormData(initialFormData);
        fetchCommunities();
      } else {
        const error = await res.json();
        toast.error(error.message || 'Failed to update community');
      }
    } catch (error) {
      console.error('Failed to update community', error);
      toast.error('Failed to update community');
    }
  };

  const handleDeleteCommunity = async (communityId: string) => {
    if (!confirm('Are you sure you want to delete this community? This action cannot be undone.')) return;

    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch(`http://localhost:3000/api/admin/communities/${communityId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        toast.success('Community deleted successfully');
        fetchCommunities();
      } else {
        const error = await res.json();
        toast.error(error.message || 'Failed to delete community');
      }
    } catch (error) {
      console.error('Failed to delete community', error);
      toast.error('Failed to delete community');
    }
  };

  const handleSyncMembers = async () => {
    if (!confirm('This will recalculate member counts for all communities. Continue?')) return;

    setIsSyncing(true);
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch('http://localhost:3000/api/admin/communities/sync-members', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        toast.success(`Synced ${data.updatedCount} communities successfully`);
        fetchCommunities();
      } else {
        const error = await res.json();
        toast.error(error.message || 'Failed to sync member counts');
      }
    } catch (error) {
      console.error('Failed to sync members', error);
      toast.error('Failed to sync member counts');
    } finally {
      setIsSyncing(false);
    }
  };

  const openEditDialog = (community: Community) => {
    setEditingCommunity(community);
    setFormData({
      name: community.name,
      description: community.description || '',
      rules: community.rules || '',
      state: community.state || '',
      district: community.district || '',
      gotra: community.gotra || '',
      kuldevi: community.kuldevi || '',
      originHistory: community.originHistory || '',
      kuldeviTraditions: community.kuldeviTraditions || '',
      gotraList: community.gotraList || '',
      migrationNotes: community.migrationNotes || '',
      notablePersonalities: community.notablePersonalities || '',
      visibility: community.visibility,
    });
    setIsEditDialogOpen(true);
  };

  const openViewDialog = (community: Community) => {
    setViewingCommunity(community);
    setIsViewDialogOpen(true);
  };

  const handleFormChange = (field: keyof CommunityFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Communities Management</h1>
          <p className="text-muted-foreground mt-2">
            Manage all communities in the system
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleSyncMembers}
            disabled={isSyncing}
          >
            {isSyncing ? 'Syncing...' : 'Sync Member Counts'}
          </Button>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Community
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Community</DialogTitle>
              <DialogDescription>
                Add a new community with detailed information
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Community Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleFormChange('name', e.target.value)}
                    placeholder="e.g., Agarwal Samaj"
                  />
                </div>
                <div>
                  <Label htmlFor="visibility">Visibility</Label>
                  <Select value={formData.visibility} onValueChange={(value: 'public' | 'private') => handleFormChange('visibility', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">Public</SelectItem>
                      <SelectItem value="private">Private</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleFormChange('description', e.target.value)}
                  placeholder="Brief description of the community"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    value={formData.state}
                    onChange={(e) => handleFormChange('state', e.target.value)}
                    placeholder="e.g., North India"
                  />
                </div>
                <div>
                  <Label htmlFor="district">District</Label>
                  <Input
                    id="district"
                    value={formData.district}
                    onChange={(e) => handleFormChange('district', e.target.value)}
                    placeholder="e.g., Rajkot"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="gotra">Gotra</Label>
                  <Input
                    id="gotra"
                    value={formData.gotra}
                    onChange={(e) => handleFormChange('gotra', e.target.value)}
                    placeholder="e.g., Vaishya"
                  />
                </div>
                <div>
                  <Label htmlFor="kuldevi">Kuldevi</Label>
                  <Input
                    id="kuldevi"
                    value={formData.kuldevi}
                    onChange={(e) => handleFormChange('kuldevi', e.target.value)}
                    placeholder="e.g., Lakshmi"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="gotraList">Gotra List (comma-separated)</Label>
                <Input
                  id="gotraList"
                  value={formData.gotraList}
                  onChange={(e) => handleFormChange('gotraList', e.target.value)}
                  placeholder="e.g., Gotra1, Gotra2, Gotra3"
                />
              </div>

              <div>
                <Label htmlFor="originHistory">Origin & History</Label>
                <Textarea
                  id="originHistory"
                  value={formData.originHistory}
                  onChange={(e) => handleFormChange('originHistory', e.target.value)}
                  placeholder="Historical background and origin story"
                  rows={4}
                />
              </div>

              <div>
                <Label htmlFor="kuldeviTraditions">Kuldevi Traditions</Label>
                <Textarea
                  id="kuldeviTraditions"
                  value={formData.kuldeviTraditions}
                  onChange={(e) => handleFormChange('kuldeviTraditions', e.target.value)}
                  placeholder="Cultural and religious traditions"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="migrationNotes">Migration Notes</Label>
                <Textarea
                  id="migrationNotes"
                  value={formData.migrationNotes}
                  onChange={(e) => handleFormChange('migrationNotes', e.target.value)}
                  placeholder="Migration history and patterns"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="notablePersonalities">Notable Personalities (one per line)</Label>
                <Textarea
                  id="notablePersonalities"
                  value={formData.notablePersonalities}
                  onChange={(e) => handleFormChange('notablePersonalities', e.target.value)}
                  placeholder="Maharaja Agrasen - agrasen@example.com&#10;Ratan Tata - ratan@example.com&#10;Or just names:&#10;Maharaja Agrasen&#10;Ratan Tata"
                  rows={5}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Enter one person per line. Format: "Name - email@example.com" or just "Name"
                </p>
              </div>

              <div>
                <Label htmlFor="rules">Community Rules</Label>
                <Textarea
                  id="rules"
                  value={formData.rules}
                  onChange={(e) => handleFormChange('rules', e.target.value)}
                  placeholder="Community guidelines and rules"
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setIsCreateDialogOpen(false);
                setFormData(initialFormData);
              }}>
                Cancel
              </Button>
              <Button onClick={handleCreateCommunity}>Create Community</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Communities</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{communities.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Public Communities</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {communities.filter(c => c.visibility === 'public').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Members</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {communities.reduce((sum, c) => sum + c.totalMembers, 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, state, or gotra..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading communities...</div>
          ) : filteredCommunities.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No communities found
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>State</TableHead>
                  <TableHead>Gotra</TableHead>
                  <TableHead>Members</TableHead>
                  <TableHead>Visibility</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCommunities.map((community) => (
                  <TableRow key={community._id}>
                    <TableCell className="font-medium">{community.name}</TableCell>
                    <TableCell>{community.state || '-'}</TableCell>
                    <TableCell>{community.gotra || '-'}</TableCell>
                    <TableCell>{community.totalMembers}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        community.visibility === 'public' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {community.visibility}
                      </span>
                    </TableCell>
                    <TableCell>
                      {new Date(community.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openViewDialog(community)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(community)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteCommunity(community._id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Community</DialogTitle>
            <DialogDescription>
              Update community information
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-name">Community Name *</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => handleFormChange('name', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="edit-visibility">Visibility</Label>
                <Select value={formData.visibility} onValueChange={(value: 'public' | 'private') => handleFormChange('visibility', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Public</SelectItem>
                    <SelectItem value="private">Private</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => handleFormChange('description', e.target.value)}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-state">State</Label>
                <Input
                  id="edit-state"
                  value={formData.state}
                  onChange={(e) => handleFormChange('state', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="edit-district">District</Label>
                <Input
                  id="edit-district"
                  value={formData.district}
                  onChange={(e) => handleFormChange('district', e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-gotra">Gotra</Label>
                <Input
                  id="edit-gotra"
                  value={formData.gotra}
                  onChange={(e) => handleFormChange('gotra', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="edit-kuldevi">Kuldevi</Label>
                <Input
                  id="edit-kuldevi"
                  value={formData.kuldevi}
                  onChange={(e) => handleFormChange('kuldevi', e.target.value)}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="edit-gotraList">Gotra List (comma-separated)</Label>
              <Input
                id="edit-gotraList"
                value={formData.gotraList}
                onChange={(e) => handleFormChange('gotraList', e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="edit-originHistory">Origin & History</Label>
              <Textarea
                id="edit-originHistory"
                value={formData.originHistory}
                onChange={(e) => handleFormChange('originHistory', e.target.value)}
                rows={4}
              />
            </div>

            <div>
              <Label htmlFor="edit-kuldeviTraditions">Kuldevi Traditions</Label>
              <Textarea
                id="edit-kuldeviTraditions"
                value={formData.kuldeviTraditions}
                onChange={(e) => handleFormChange('kuldeviTraditions', e.target.value)}
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="edit-migrationNotes">Migration Notes</Label>
              <Textarea
                id="edit-migrationNotes"
                value={formData.migrationNotes}
                onChange={(e) => handleFormChange('migrationNotes', e.target.value)}
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="edit-notablePersonalities">Notable Personalities (one per line)</Label>
              <Textarea
                id="edit-notablePersonalities"
                value={formData.notablePersonalities}
                onChange={(e) => handleFormChange('notablePersonalities', e.target.value)}
                placeholder="Maharaja Agrasen - agrasen@example.com&#10;Ratan Tata - ratan@example.com"
                rows={5}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Enter one person per line. Format: "Name - email@example.com" or just "Name"
              </p>
            </div>

            <div>
              <Label htmlFor="edit-rules">Community Rules</Label>
              <Textarea
                id="edit-rules"
                value={formData.rules}
                onChange={(e) => handleFormChange('rules', e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsEditDialogOpen(false);
              setEditingCommunity(null);
              setFormData(initialFormData);
            }}>
              Cancel
            </Button>
            <Button onClick={handleEditCommunity}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{viewingCommunity?.name}</DialogTitle>
            <DialogDescription>
              Community Details
            </DialogDescription>
          </DialogHeader>
          {viewingCommunity && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Visibility</Label>
                  <p className="font-medium capitalize">{viewingCommunity.visibility}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Total Members</Label>
                  <p className="font-medium">{viewingCommunity.totalMembers}</p>
                </div>
              </div>

              {viewingCommunity.description && (
                <div>
                  <Label className="text-muted-foreground">Description</Label>
                  <p className="mt-1">{viewingCommunity.description}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                {viewingCommunity.state && (
                  <div>
                    <Label className="text-muted-foreground">State</Label>
                    <p className="font-medium">{viewingCommunity.state}</p>
                  </div>
                )}
                {viewingCommunity.district && (
                  <div>
                    <Label className="text-muted-foreground">District</Label>
                    <p className="font-medium">{viewingCommunity.district}</p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                {viewingCommunity.gotra && (
                  <div>
                    <Label className="text-muted-foreground">Gotra</Label>
                    <p className="font-medium">{viewingCommunity.gotra}</p>
                  </div>
                )}
                {viewingCommunity.kuldevi && (
                  <div>
                    <Label className="text-muted-foreground">Kuldevi</Label>
                    <p className="font-medium">{viewingCommunity.kuldevi}</p>
                  </div>
                )}
              </div>

              {viewingCommunity.gotraList && (
                <div>
                  <Label className="text-muted-foreground">Gotra List</Label>
                  <p className="mt-1">{viewingCommunity.gotraList}</p>
                </div>
              )}

              {viewingCommunity.originHistory && (
                <div>
                  <Label className="text-muted-foreground">Origin & History</Label>
                  <p className="mt-1 whitespace-pre-wrap">{viewingCommunity.originHistory}</p>
                </div>
              )}

              {viewingCommunity.kuldeviTraditions && (
                <div>
                  <Label className="text-muted-foreground">Kuldevi Traditions</Label>
                  <p className="mt-1 whitespace-pre-wrap">{viewingCommunity.kuldeviTraditions}</p>
                </div>
              )}

              {viewingCommunity.migrationNotes && (
                <div>
                  <Label className="text-muted-foreground">Migration Notes</Label>
                  <p className="mt-1 whitespace-pre-wrap">{viewingCommunity.migrationNotes}</p>
                </div>
              )}

              {viewingCommunity.notablePersonalities && (
                <div>
                  <Label className="text-muted-foreground">Notable Personalities</Label>
                  <p className="mt-1 whitespace-pre-wrap">{viewingCommunity.notablePersonalities}</p>
                </div>
              )}

              {viewingCommunity.rules && (
                <div>
                  <Label className="text-muted-foreground">Rules</Label>
                  <p className="mt-1 whitespace-pre-wrap">{viewingCommunity.rules}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <Label className="text-muted-foreground">Created</Label>
                  <p className="font-medium">{new Date(viewingCommunity.createdAt).toLocaleString()}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Last Updated</Label>
                  <p className="font-medium">{new Date(viewingCommunity.updatedAt).toLocaleString()}</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setIsViewDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
