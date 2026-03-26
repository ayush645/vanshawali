'use client';

import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Clock, AlertCircle, Eye, Trash2 } from 'lucide-react';

interface Field {
  fieldName: string;
  currentValue: string;
  proposedValue: string;
  reason: string;
}

interface CorrectionRequest {
  _id: string;
  submittedBy?: {
    _id: string;
    name: string;
    email: string;
  } | null;
  targetType: string;
  targetName: string;
  fields: Field[];
  status: 'pending' | 'need_info' | 'approved' | 'rejected';
  createdAt: string;
  reviewedBy?: {
    name: string;
  };
  reviewNotes?: string;
  reviewedAt?: string;
}

export default function CorrectionsPage() {
  const [requests, setRequests] = useState<CorrectionRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedRequest, setSelectedRequest] = useState<CorrectionRequest | null>(null);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [reviewStatus, setReviewStatus] = useState<'approved' | 'rejected' | 'need_info'>('approved');
  const [reviewNotes, setReviewNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchRequests();
  }, [statusFilter]);

  const fetchRequests = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);

      console.log('Fetching corrections with token:', token ? 'exists' : 'missing');
      console.log('Filter:', statusFilter);

      const response = await fetch(`http://localhost:3000/api/admin/corrections?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      console.log('Response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('Fetched requests:', data.requests);
        setRequests(data.requests);
      } else {
        const errorData = await response.json();
        console.error('Failed to fetch requests:', errorData);
      }
    } catch (error) {
      console.error('Failed to fetch requests:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReview = async () => {
    if (!selectedRequest) return;

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('admin_token');
      console.log('Submitting review:', { status: reviewStatus, notes: reviewNotes });

      const response = await fetch(`http://localhost:3000/api/admin/corrections/${selectedRequest._id}/review`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          status: reviewStatus,
          reviewNotes,
        }),
      });

      console.log('Review response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('Review successful:', data);
        alert(`Request ${reviewStatus} successfully!`);
        setShowReviewDialog(false);
        setSelectedRequest(null);
        setReviewNotes('');
        fetchRequests();
      } else {
        const errorData = await response.json();
        console.error('Review failed:', errorData);
        alert(`Failed to review: ${errorData.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to review request:', error);
      alert('Failed to review request. Check console for details.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      need_info: 'bg-blue-100 text-blue-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
    };
    return styles[status as keyof typeof styles] || styles.pending;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="w-4 h-4" />;
      case 'rejected':
        return <XCircle className="w-4 h-4" />;
      case 'need_info':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const stats = {
    total: requests.length,
    pending: requests.filter(r => r.status === 'pending').length,
    approved: requests.filter(r => r.status === 'approved').length,
    rejected: requests.filter(r => r.status === 'rejected').length,
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Correction Requests</h1>
        <p className="text-gray-600">Review and manage user-submitted correction requests</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Total Requests</div>
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Pending</div>
          <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Approved</div>
          <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Rejected</div>
          <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="flex gap-2">
          {['all', 'pending', 'need_info', 'approved', 'rejected'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                statusFilter === status
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </button>
          ))}
        </div>
      </div>

      {/* Requests Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
            <p className="text-gray-500 mt-4">Loading requests...</p>
          </div>
        ) : (
          <>
            <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Submitted By</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Target</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fields</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {requests.map((request) => (
              <tr key={request._id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {request.submittedBy?.name || 'Unknown User'}
                  </div>
                  <div className="text-sm text-gray-500">
                    {request.submittedBy?.email || 'N/A'}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{request.targetName}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded">
                    {request.targetType}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {request.fields.length} field(s)
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded ${getStatusBadge(request.status)}`}>
                    {getStatusIcon(request.status)}
                    {request.status.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(request.createdAt).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button
                    onClick={() => {
                      setSelectedRequest(request);
                      setShowReviewDialog(true);
                      setReviewStatus(request.status === 'pending' ? 'approved' : request.status as any);
                      setReviewNotes(request.reviewNotes || '');
                    }}
                    className="text-orange-600 hover:text-orange-900 mr-3"
                  >
                    <Eye className="w-5 h-5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {requests.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <p className="text-gray-500">No correction requests found</p>
          </div>
        )}
          </>
        )}
      </div>

      {/* Review Dialog */}
      {showReviewDialog && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Review Correction Request</h2>

            <div className="mb-4">
              <div className="text-sm text-gray-600">Submitted by</div>
              <div className="font-medium">
                {selectedRequest.submittedBy?.name || 'Unknown User'}
              </div>
              <div className="text-sm text-gray-500">
                {selectedRequest.submittedBy?.email || 'N/A'}
              </div>
            </div>

            <div className="mb-4">
              <div className="text-sm text-gray-600">Target</div>
              <div className="font-medium">{selectedRequest.targetName}</div>
              <div className="text-sm text-gray-500">{selectedRequest.targetType}</div>
            </div>

            <div className="mb-4">
              <div className="text-sm text-gray-600 mb-2">Proposed Changes</div>
              {selectedRequest.fields.map((field, index) => (
                <div key={index} className="bg-gray-50 p-3 rounded mb-2">
                  <div className="font-medium text-sm">{field.fieldName}</div>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div>
                      <div className="text-xs text-gray-500">Current</div>
                      <div className="text-sm">{field.currentValue || 'N/A'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Proposed</div>
                      <div className="text-sm font-medium text-green-600">{field.proposedValue}</div>
                    </div>
                  </div>
                  {field.reason && (
                    <div className="mt-2">
                      <div className="text-xs text-gray-500">Reason</div>
                      <div className="text-sm">{field.reason}</div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Review Status
              </label>
              <select
                value={reviewStatus}
                onChange={(e) => setReviewStatus(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="approved">Approve</option>
                <option value="rejected">Reject</option>
                <option value="need_info">Need More Info</option>
              </select>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Review Notes
              </label>
              <textarea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="Add notes about your decision..."
              />
            </div>

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setShowReviewDialog(false);
                  setSelectedRequest(null);
                  setReviewNotes('');
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleReview}
                disabled={isSubmitting}
                className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Review'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
