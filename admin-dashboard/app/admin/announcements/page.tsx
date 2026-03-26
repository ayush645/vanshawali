'use client';

import { useState, useEffect } from 'react';
import { Megaphone, Plus, Edit2, Trash2, Send, Calendar, Users } from 'lucide-react';

interface Announcement {
  _id: string;
  title: string;
  message: string;
  targetAudience: string;
  isActive: boolean;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [targetAudience, setTargetAudience] = useState('all');
  const [expiresAt, setExpiresAt] = useState('');

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch('http://localhost:3000/api/admin/announcements', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAnnouncements(data);
      } else {
        console.error('Failed to fetch announcements');
      }
    } catch (error) {
      console.error('Failed to fetch announcements:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!title.trim() || !message.trim()) {
      alert('Please fill in title and message');
      return;
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('admin_token');
      const body: any = {
        title,
        message,
        targetAudience,
      };

      if (expiresAt) {
        body.expiresAt = new Date(expiresAt).toISOString();
      }

      const response = await fetch('http://localhost:3000/api/admin/announcements', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        const data = await response.json();
        const notificationCount = data.notificationsSent || 0;
        alert(`Announcement created and sent to ${notificationCount} user${notificationCount !== 1 ? 's' : ''}!`);
        resetForm();
        setShowCreateDialog(false);
        fetchAnnouncements();
      } else {
        const errorData = await response.json();
        alert(`Failed to create announcement: ${errorData.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to create announcement:', error);
      alert('Failed to create announcement');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingAnnouncement || !title.trim() || !message.trim()) {
      alert('Please fill in title and message');
      return;
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('admin_token');
      const body: any = {
        title,
        message,
        targetAudience,
        isActive: editingAnnouncement.isActive,
      };

      if (expiresAt) {
        body.expiresAt = new Date(expiresAt).toISOString();
      }

      const response = await fetch(`http://localhost:3000/api/admin/announcements/${editingAnnouncement._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        alert('Announcement updated!');
        resetForm();
        setEditingAnnouncement(null);
        fetchAnnouncements();
      } else {
        const errorData = await response.json();
        alert(`Failed to update announcement: ${errorData.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to update announcement:', error);
      alert('Failed to update announcement');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this announcement?')) {
      return;
    }

    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch(`http://localhost:3000/api/admin/announcements/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        alert('Announcement deleted!');
        fetchAnnouncements();
      } else {
        alert('Failed to delete announcement');
      }
    } catch (error) {
      console.error('Failed to delete announcement:', error);
      alert('Failed to delete announcement');
    }
  };

  const handleToggleActive = async (announcement: Announcement) => {
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch(`http://localhost:3000/api/admin/announcements/${announcement._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...announcement,
          isActive: !announcement.isActive,
        }),
      });

      if (response.ok) {
        fetchAnnouncements();
      }
    } catch (error) {
      console.error('Failed to toggle announcement:', error);
    }
  };

  const resetForm = () => {
    setTitle('');
    setMessage('');
    setTargetAudience('all');
    setExpiresAt('');
  };

  const openEditDialog = (announcement: Announcement) => {
    setEditingAnnouncement(announcement);
    setTitle(announcement.title);
    setMessage(announcement.message);
    setTargetAudience(announcement.targetAudience);
    setExpiresAt(announcement.expiresAt ? new Date(announcement.expiresAt).toISOString().split('T')[0] : '');
  };

  const stats = {
    total: announcements.length,
    active: announcements.filter(a => a.isActive).length,
    expired: announcements.filter(a => a.expiresAt && new Date(a.expiresAt) < new Date()).length,
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Announcements</h1>
          <p className="text-gray-600">Send announcements to all users</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowCreateDialog(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
        >
          <Plus className="w-5 h-5" />
          Create Announcement
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Total Announcements</div>
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Active</div>
          <div className="text-2xl font-bold text-green-600">{stats.active}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Expired</div>
          <div className="text-2xl font-bold text-red-600">{stats.expired}</div>
        </div>
      </div>

      {/* Announcements List */}
      <div className="bg-white rounded-lg shadow">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
            <p className="text-gray-500 mt-4">Loading announcements...</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {announcements.map((announcement) => {
              const isExpired = announcement.expiresAt && new Date(announcement.expiresAt) < new Date();
              
              return (
                <div key={announcement._id} className="p-6 hover:bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Megaphone className="w-5 h-5 text-orange-500" />
                        <h3 className="text-lg font-semibold text-gray-900">{announcement.title}</h3>
                        <span className={`px-2 py-1 text-xs font-medium rounded ${
                          announcement.isActive && !isExpired
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {isExpired ? 'Expired' : announcement.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <p className="text-gray-700 mb-3">{announcement.message}</p>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          <span className="capitalize">{announcement.targetAudience}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>{new Date(announcement.createdAt).toLocaleDateString()}</span>
                        </div>
                        {announcement.expiresAt && (
                          <div className="flex items-center gap-1">
                            <span>Expires: {new Date(announcement.expiresAt).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => handleToggleActive(announcement)}
                        className={`px-3 py-1 text-sm rounded ${
                          announcement.isActive
                            ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            : 'bg-green-100 text-green-700 hover:bg-green-200'
                        }`}
                      >
                        {announcement.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        onClick={() => openEditDialog(announcement)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                      >
                        <Edit2 className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(announcement._id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {announcements.length === 0 && !isLoading && (
              <div className="text-center py-12">
                <Megaphone className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No announcements yet</p>
                <p className="text-sm text-gray-400">Create your first announcement to notify users</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create/Edit Dialog */}
      {(showCreateDialog || editingAnnouncement) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Send className="w-6 h-6 text-orange-500" />
              {editingAnnouncement ? 'Edit Announcement' : 'Create New Announcement'}
            </h2>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="Enter announcement title"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Message *
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="Enter announcement message"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Target Audience
              </label>
              <select
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="all">All Users</option>
                <option value="premium">Premium Users Only</option>
                <option value="free">Free Users Only</option>
              </select>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Expiry Date (Optional)
              </label>
              <input
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">Leave empty for no expiration</p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-2">
                <Megaphone className="w-5 h-5 text-blue-600 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">This will send notifications to users</p>
                  <p>All users in the target audience will receive a notification about this announcement.</p>
                </div>
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setShowCreateDialog(false);
                  setEditingAnnouncement(null);
                  resetForm();
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={editingAnnouncement ? handleUpdate : handleCreate}
                disabled={isSubmitting}
                className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                {isSubmitting ? 'Sending...' : editingAnnouncement ? 'Update' : 'Send Announcement'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
