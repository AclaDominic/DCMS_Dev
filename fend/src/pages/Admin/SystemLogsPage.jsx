import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import api from '../../api/api';
import LoadingSpinner from '../../components/LoadingSpinner';
import './SystemLogsPage.css';

const SystemLogsPage = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterOptions, setFilterOptions] = useState({
    categories: [],
    actions: [],
    users: []
  });
  const [filters, setFilters] = useState({
    user_id: '',
    category: '',
    action: '',
    subject_id: '',
    date_from: '',
    date_to: '',
    search: ''
  });
  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    per_page: 20,
    total: 0
  });
  const [showFilters, setShowFilters] = useState(false);
  const [showContextModal, setShowContextModal] = useState(false);
  const [selectedContext, setSelectedContext] = useState(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [popupPos, setPopupPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    fetchFilterOptions();
    fetchLogs();
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [filters, pagination.current_page, pagination.per_page]);

  // Handle body scroll when modal is open and reposition listeners
  useEffect(() => {
    if (showContextModal) {
      document.body.classList.add('modal-open');
      
      // Add scroll and resize listeners for repositioning
      const handleReposition = () => {
        if (anchorEl) {
          computePopupPosition(anchorEl);
        }
      };
      
      window.addEventListener('scroll', handleReposition, true);
      window.addEventListener('resize', handleReposition);
      
      return () => {
        window.removeEventListener('scroll', handleReposition, true);
        window.removeEventListener('resize', handleReposition);
      };
    } else {
      document.body.classList.remove('modal-open');
    }
    
    // Cleanup on unmount
    return () => {
      document.body.classList.remove('modal-open');
    };
  }, [showContextModal, anchorEl]);

  const fetchFilterOptions = async () => {
    try {
      const res = await api.get('/api/system-logs/filter-options');
      setFilterOptions(res.data);
    } catch (error) {
      console.error('Failed to fetch filter options:', error);
    }
  };

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      // Add filters
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
      
      // Add pagination
      params.append('page', pagination.current_page);
      params.append('per_page', pagination.per_page);

      const res = await api.get(`/api/system-logs?${params.toString()}`);
      setLogs(res.data.data);
      setPagination({
        current_page: res.data.current_page,
        last_page: res.data.last_page,
        per_page: res.data.per_page,
        total: res.data.total
      });
    } catch (error) {
      console.error('Failed to fetch system logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, current_page: 1 })); // Reset to first page
  };

  const clearFilters = () => {
    setFilters({
      user_id: '',
      category: '',
      action: '',
      subject_id: '',
      date_from: '',
      date_to: '',
      search: ''
    });
    setPagination(prev => ({ ...prev, current_page: 1 }));
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  // Enhanced category mapping with icons and descriptions
  const getCategoryInfo = (category) => {
    const categoryMap = {
      'appointment': {
        label: 'Appointment',
        icon: 'bi-calendar-check',
        color: 'bg-primary',
        description: 'Appointment-related activities'
      },
      'dentist': {
        label: 'Dentist',
        icon: 'bi-person-badge',
        color: 'bg-info',
        description: 'Dentist profile and schedule management'
      },
      'device': {
        label: 'Device',
        icon: 'bi-laptop',
        color: 'bg-warning',
        description: 'Device registration and approval'
      },
      'user': {
        label: 'User',
        icon: 'bi-person',
        color: 'bg-success',
        description: 'User account management'
      },
      'inventory': {
        label: 'Inventory',
        icon: 'bi-box-seam',
        color: 'bg-secondary',
        description: 'Inventory and stock management'
      },
      'payment': {
        label: 'Payment',
        icon: 'bi-credit-card',
        color: 'bg-dark',
        description: 'Payment processing and transactions'
      },
      'system': {
        label: 'System',
        icon: 'bi-gear',
        color: 'bg-danger',
        description: 'System-level operations and maintenance'
      }
    };
    return categoryMap[category] || {
      label: category.charAt(0).toUpperCase() + category.slice(1),
      icon: 'bi-question-circle',
      color: 'bg-light text-dark',
      description: 'System activity'
    };
  };

  // Enhanced action mapping with icons and descriptions
  const getActionInfo = (action) => {
    const actionMap = {
      'created': {
        label: 'Created',
        icon: 'bi-plus-circle',
        color: 'bg-success',
        description: 'New item was created'
      },
      'approved': {
        label: 'Approved',
        icon: 'bi-check-circle',
        color: 'bg-success',
        description: 'Item was approved'
      },
      'rejected': {
        label: 'Rejected',
        icon: 'bi-x-circle',
        color: 'bg-danger',
        description: 'Item was rejected'
      },
      'updated': {
        label: 'Updated',
        icon: 'bi-pencil-square',
        color: 'bg-warning text-dark',
        description: 'Item was modified'
      },
      'deleted': {
        label: 'Deleted',
        icon: 'bi-trash',
        color: 'bg-danger',
        description: 'Item was removed'
      },
      'marked_no_show': {
        label: 'No Show',
        icon: 'bi-person-x',
        color: 'bg-warning text-dark',
        description: 'Appointment marked as no show'
      },
      'cancelled': {
        label: 'Cancelled',
        icon: 'bi-x-octagon',
        color: 'bg-danger',
        description: 'Item was cancelled'
      },
      'scheduled': {
        label: 'Scheduled',
        icon: 'bi-calendar-plus',
        color: 'bg-info',
        description: 'Item was scheduled'
      },
      'completed': {
        label: 'Completed',
        icon: 'bi-check2-all',
        color: 'bg-success',
        description: 'Item was completed'
      },
      'logged_in': {
        label: 'Login',
        icon: 'bi-box-arrow-in-right',
        color: 'bg-info',
        description: 'User logged in'
      },
      'logged_out': {
        label: 'Logout',
        icon: 'bi-box-arrow-right',
        color: 'bg-secondary',
        description: 'User logged out'
      }
    };

    // Try exact match first
    if (actionMap[action]) {
      return actionMap[action];
    }

    // Try partial matches
    if (action.includes('create') || action.includes('add')) {
      return actionMap['created'];
    }
    if (action.includes('update') || action.includes('edit')) {
      return actionMap['updated'];
    }
    if (action.includes('delete') || action.includes('remove')) {
      return actionMap['deleted'];
    }
    if (action.includes('approve') || action.includes('accept')) {
      return actionMap['approved'];
    }
    if (action.includes('reject') || action.includes('cancel')) {
      return actionMap['rejected'];
    }

    // Default fallback
    return {
      label: action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      icon: 'bi-arrow-right-circle',
      color: 'bg-secondary',
      description: 'System activity'
    };
  };

  // Compute popup position relative to anchor element
  const computePopupPosition = (anchorElement) => {
    const rect = anchorElement.getBoundingClientRect();
    const popupWidth = 400;
    const popupHeight = Math.min(window.innerHeight * 0.8, 600); // Max height
    const gap = 8;
    const margin = 20;
    
    let top = rect.bottom + gap;
    let left = rect.left;
    
    // Check if there's enough space below
    if (top + popupHeight > window.innerHeight - margin) {
      // Place above the button
      top = rect.top - popupHeight - gap;
    }
    
    // Clamp left position to stay within viewport
    const maxLeft = window.innerWidth - popupWidth - margin;
    left = Math.max(margin, Math.min(left, maxLeft));
    
    // Ensure top doesn't go above viewport
    top = Math.max(margin, top);
    
    // If anchor element is not visible, center the popup
    if (rect.bottom < 0 || rect.top > window.innerHeight) {
      top = (window.innerHeight - popupHeight) / 2;
      left = (window.innerWidth - popupWidth) / 2;
    }
    
    setPopupPos({ top, left });
  };

  const handleViewContext = (context, anchorElement) => {
    setSelectedContext(context);
    setAnchorEl(anchorElement);
    computePopupPosition(anchorElement);
    setShowContextModal(true);
    
    // Focus the popup after a brief delay to ensure it's rendered
    setTimeout(() => {
      const popupElement = document.querySelector('.context-popup-card');
      if (popupElement) {
        popupElement.focus();
      }
    }, 100);
  };

  const closeContextModal = () => {
    // Restore focus to the triggering button
    if (anchorEl) {
      anchorEl.focus();
    }
    
    setShowContextModal(false);
    setSelectedContext(null);
    setCopySuccess(false);
    setAnchorEl(null);
  };

  const handleCopyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(selectedContext, null, 2));
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000); // Hide success message after 2 seconds
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  // Format context data for better readability
  const formatContextData = (context) => {
    if (!context) return null;
    
    const formatValue = (key, value) => {
      if (value === null || value === undefined) return 'Not specified';
      if (typeof value === 'boolean') return value ? 'Yes' : 'No';
      if (typeof value === 'object') return JSON.stringify(value, null, 2);
      if (typeof value === 'string' && value.length > 100) return `${value.substring(0, 100)}...`;
      return value.toString();
    };

    const getFieldLabel = (key) => {
      const labels = {
        'id': 'ID',
        'name': 'Name',
        'email': 'Email Address',
        'phone': 'Phone Number',
        'status': 'Status',
        'type': 'Type',
        'amount': 'Amount',
        'date': 'Date',
        'time': 'Time',
        'description': 'Description',
        'notes': 'Notes',
        'user_id': 'User ID',
        'patient_id': 'Patient ID',
        'appointment_id': 'Appointment ID',
        'service_id': 'Service ID',
        'dentist_id': 'Dentist ID',
        'device_id': 'Device ID',
        'payment_id': 'Payment ID',
        'inventory_id': 'Inventory Item ID',
        'created_at': 'Created At',
        'updated_at': 'Updated At',
        'deleted_at': 'Deleted At',
        'ip_address': 'IP Address',
        'user_agent': 'Browser Information',
        'request_data': 'Request Data',
        'response_data': 'Response Data',
        'error_message': 'Error Message',
        'stack_trace': 'Error Details',
        'device_name': 'Device Name',
        'device_type': 'Device Type',
        'device_status': 'Device Status',
        'appointment_date': 'Appointment Date',
        'appointment_time': 'Appointment Time',
        'patient_name': 'Patient Name',
        'dentist_name': 'Dentist Name',
        'service_name': 'Service Name',
        'payment_amount': 'Payment Amount',
        'payment_method': 'Payment Method',
        'payment_status': 'Payment Status',
        'inventory_item': 'Inventory Item',
        'quantity': 'Quantity',
        'unit_price': 'Unit Price',
        'total_amount': 'Total Amount',
        'reason': 'Reason',
        'comment': 'Comment',
        'old_values': 'Previous Values',
        'new_values': 'New Values',
        'changes': 'Changes Made'
      };
      return labels[key] || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    };

    const getFieldIcon = (key) => {
      const icons = {
        'id': 'bi-hash',
        'name': 'bi-person',
        'email': 'bi-envelope',
        'phone': 'bi-telephone',
        'status': 'bi-circle-fill',
        'type': 'bi-tag',
        'amount': 'bi-currency-dollar',
        'date': 'bi-calendar',
        'time': 'bi-clock',
        'description': 'bi-text-paragraph',
        'notes': 'bi-sticky',
        'user_id': 'bi-person-badge',
        'patient_id': 'bi-person-heart',
        'appointment_id': 'bi-calendar-check',
        'service_id': 'bi-gear',
        'dentist_id': 'bi-person-badge',
        'device_id': 'bi-laptop',
        'payment_id': 'bi-credit-card',
        'inventory_id': 'bi-box-seam',
        'created_at': 'bi-calendar-plus',
        'updated_at': 'bi-calendar-check',
        'deleted_at': 'bi-calendar-x',
        'ip_address': 'bi-globe',
        'user_agent': 'bi-browser-chrome',
        'request_data': 'bi-arrow-down-circle',
        'response_data': 'bi-arrow-up-circle',
        'error_message': 'bi-exclamation-triangle',
        'stack_trace': 'bi-bug',
        'device_name': 'bi-laptop',
        'device_type': 'bi-tag',
        'device_status': 'bi-circle-fill',
        'appointment_date': 'bi-calendar',
        'appointment_time': 'bi-clock',
        'patient_name': 'bi-person-heart',
        'dentist_name': 'bi-person-badge',
        'service_name': 'bi-gear',
        'payment_amount': 'bi-currency-dollar',
        'payment_method': 'bi-credit-card',
        'payment_status': 'bi-circle-fill',
        'inventory_item': 'bi-box-seam',
        'quantity': 'bi-123',
        'unit_price': 'bi-currency-dollar',
        'total_amount': 'bi-calculator',
        'reason': 'bi-chat-quote',
        'comment': 'bi-chat-text',
        'old_values': 'bi-arrow-left',
        'new_values': 'bi-arrow-right',
        'changes': 'bi-arrow-left-right'
      };
      return icons[key] || 'bi-info-circle';
    };

    return Object.entries(context).map(([key, value]) => (
      <div key={key} className="mb-4">
        <div className="row">
          <div className="col-md-4">
            <label className="form-label fw-bold text-primary d-flex align-items-center">
              <i className={`bi ${getFieldIcon(key)} me-2`}></i>
              {getFieldLabel(key)}:
            </label>
          </div>
          <div className="col-md-8">
            <div className="bg-white p-3 rounded border shadow-sm">
              <span className="text-dark fs-6">
                {formatValue(key, value)}
              </span>
            </div>
          </div>
        </div>
      </div>
    ));
  };

  return (
    <div className="system-logs-page">
      <div className="container-fluid p-0">
        <div className="row g-0">
          <div className="col-12">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-header bg-primary text-white d-flex justify-content-between align-items-center">
                <h2 className="card-title mb-0">
                  <i className="bi bi-journal-text me-2"></i>
                  System Logs
                </h2>
                <button 
                  className="btn btn-outline-light"
                  onClick={() => setShowFilters(!showFilters)}
                >
                  <i className={`bi bi-${showFilters ? 'eye-slash' : 'eye'} me-1`}></i>
                  {showFilters ? 'Hide Filters' : 'Show Filters'}
                </button>
              </div>
              <div className="card-body p-4">

      {/* Filters */}
      {showFilters && (
        <div className="card mb-4">
          <div className="card-header">
            <h5 className="mb-0">
              <i className="bi bi-funnel me-2"></i>
              Filters
            </h5>
          </div>
          <div className="card-body">
            <div className="row g-3">
              <div className="col-12 col-md-6 col-lg-3">
                <label className="form-label">
                  <i className="bi bi-search me-1"></i>
                  Search
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search in message, category, action..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                />
              </div>
              
              <div className="col-12 col-md-6 col-lg-3">
                <label className="form-label">
                  <i className="bi bi-person me-1"></i>
                  User
                </label>
                <select
                  className="form-select"
                  value={filters.user_id}
                  onChange={(e) => handleFilterChange('user_id', e.target.value)}
                >
                  <option value="">All Users</option>
                  {filterOptions.users.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.name} ({user.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-12 col-md-6 col-lg-3">
                <label className="form-label">
                  <i className="bi bi-tags me-1"></i>
                  Category
                </label>
                <select
                  className="form-select"
                  value={filters.category}
                  onChange={(e) => handleFilterChange('category', e.target.value)}
                >
                  <option value="">All Categories</option>
                  {filterOptions.categories.map(category => {
                    const categoryInfo = getCategoryInfo(category);
                    return (
                      <option key={category} value={category} title={categoryInfo.description}>
                        {categoryInfo.label}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="col-12 col-md-6 col-lg-3">
                <label className="form-label">
                  <i className="bi bi-lightning me-1"></i>
                  Action
                </label>
                <select
                  className="form-select"
                  value={filters.action}
                  onChange={(e) => handleFilterChange('action', e.target.value)}
                >
                  <option value="">All Actions</option>
                  {filterOptions.actions.map(action => {
                    const actionInfo = getActionInfo(action);
                    return (
                      <option key={action} value={action} title={actionInfo.description}>
                        {actionInfo.label}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="col-12 col-md-6 col-lg-3">
                <label className="form-label">
                  <i className="bi bi-link-45deg me-1"></i>
                  Subject ID
                </label>
                <input
                  type="number"
                  className="form-control"
                  placeholder="Enter subject ID"
                  value={filters.subject_id}
                  onChange={(e) => handleFilterChange('subject_id', e.target.value)}
                />
              </div>

              <div className="col-12 col-md-6 col-lg-3">
                <label className="form-label">
                  <i className="bi bi-calendar-date me-1"></i>
                  Date From
                </label>
                <input
                  type="date"
                  className="form-control"
                  value={filters.date_from}
                  onChange={(e) => handleFilterChange('date_from', e.target.value)}
                />
              </div>

              <div className="col-12 col-md-6 col-lg-3">
                <label className="form-label">
                  <i className="bi bi-calendar-date me-1"></i>
                  Date To
                </label>
                <input
                  type="date"
                  className="form-control"
                  value={filters.date_to}
                  onChange={(e) => handleFilterChange('date_to', e.target.value)}
                />
              </div>

              <div className="col-12 col-md-6 col-lg-3 d-flex align-items-end">
                <button 
                  className="btn btn-outline-secondary me-2 d-flex align-items-center flex-grow-1"
                  onClick={clearFilters}
                >
                  <i className="bi bi-x-circle me-1"></i>
                  Clear Filters
                </button>
                <button 
                  className="btn btn-primary d-flex align-items-center flex-grow-1"
                  onClick={fetchLogs}
                >
                  <i className="bi bi-funnel me-1"></i>
                  Apply Filters
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Results Summary */}
      <div className="mb-3">
        <div className="d-flex align-items-center">
          <i className="bi bi-info-circle me-2 text-primary"></i>
          <p className="text-muted mb-0">
            Showing <strong>{logs.length}</strong> of <strong>{pagination.total}</strong> system logs
            {pagination.total > 0 && (
              <span> (Page <strong>{pagination.current_page}</strong> of <strong>{pagination.last_page}</strong>)</span>
            )}
          </p>
        </div>
      </div>

      {/* Logs Table */}
      {loading ? (
        <LoadingSpinner message="Loading system logs..." />
      ) : logs.length === 0 ? (
        <div className="text-center py-5">
          <i className="bi bi-journal-x display-1 text-muted mb-3"></i>
          <h5 className="text-muted">No system logs found</h5>
          <p className="text-muted">Try adjusting your filters or check back later for new activity.</p>
        </div>
      ) : (
        <div className="table-responsive">
          <table className="table table-bordered table-striped mb-0 w-100">
            <thead className="table-light">
              <tr>
                <th style={{ width: '5%' }}><i className="bi bi-hash me-1"></i>ID</th>
                <th style={{ width: '15%' }}><i className="bi bi-person me-1"></i>User</th>
                <th style={{ width: '12%' }}><i className="bi bi-tags me-1"></i>Category</th>
                <th style={{ width: '12%' }}><i className="bi bi-lightning me-1"></i>Action</th>
                <th style={{ width: '10%' }}><i className="bi bi-link-45deg me-1"></i>Subject ID</th>
                <th style={{ width: '25%' }}><i className="bi bi-chat-text me-1"></i>Message</th>
                <th style={{ width: '10%' }}><i className="bi bi-info-circle me-1"></i>Details</th>
                <th style={{ width: '11%' }}><i className="bi bi-calendar me-1"></i>Date</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td style={{ width: '5%' }} className="text-center">
                    <span className="badge bg-secondary">{log.id}</span>
                  </td>
                  <td style={{ width: '15%' }}>
                    {log.user ? (
                      <div className="text-truncate">
                        <div className="fw-bold text-truncate" title={log.user.name}>{log.user.name}</div>
                        <small className="text-muted text-truncate d-block" title={log.user.email}>{log.user.email}</small>
                      </div>
                    ) : (
                      <span className="text-muted">
                        <i className="bi bi-gear me-1"></i>
                        System
                      </span>
                    )}
                  </td>
                  <td style={{ width: '12%' }}>
                    {(() => {
                      const categoryInfo = getCategoryInfo(log.category);
                      return (
                        <span className={`badge ${categoryInfo.color} d-flex align-items-center text-truncate`} title={categoryInfo.description}>
                          <i className={`bi ${categoryInfo.icon} me-1 flex-shrink-0`}></i>
                          <span className="text-truncate">{categoryInfo.label}</span>
                        </span>
                      );
                    })()}
                  </td>
                  <td style={{ width: '12%' }}>
                    {(() => {
                      const actionInfo = getActionInfo(log.action);
                      return (
                        <span className={`badge ${actionInfo.color} d-flex align-items-center text-truncate`} title={actionInfo.description}>
                          <i className={`bi ${actionInfo.icon} me-1 flex-shrink-0`}></i>
                          <span className="text-truncate">{actionInfo.label}</span>
                        </span>
                      );
                    })()}
                  </td>
                  <td style={{ width: '10%' }} className="text-center">
                    {log.subject_id ? (
                      <span className="badge bg-light text-dark">
                        {log.subject_id}
                      </span>
                    ) : (
                      <span className="text-muted">-</span>
                    )}
                  </td>
                  <td style={{ width: '25%' }}>
                    <div className="text-truncate" title={log.message}>
                      {log.message}
                    </div>
                  </td>
                  <td style={{ width: '10%' }} className="text-center">
                    {log.context ? (
                      <button
                        className="btn btn-sm btn-outline-info d-flex align-items-center mx-auto"
                        onClick={(e) => handleViewContext(log.context, e.currentTarget)}
                        title="View detailed information"
                      >
                        <i className="bi bi-eye me-1"></i>
                        <span className="text-truncate">Details</span>
                      </button>
                    ) : (
                      <span className="text-muted">
                        <i className="bi bi-dash-circle me-1"></i>
                        No details
                      </span>
                    )}
                  </td>
                  <td style={{ width: '11%' }}>
                    <small className="text-truncate d-block" title={formatDate(log.created_at)}>
                      {formatDate(log.created_at)}
                    </small>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {pagination.last_page > 1 && (
        <nav aria-label="System logs pagination">
          <ul className="pagination justify-content-center">
            <li className={`page-item ${pagination.current_page === 1 ? 'disabled' : ''}`}>
              <button
                className="page-link"
                onClick={() => setPagination(prev => ({ ...prev, current_page: prev.current_page - 1 }))}
                disabled={pagination.current_page === 1}
              >
                Previous
              </button>
            </li>
            
            {Array.from({ length: pagination.last_page }, (_, i) => i + 1).map(page => (
              <li key={page} className={`page-item ${page === pagination.current_page ? 'active' : ''}`}>
                <button
                  className="page-link"
                  onClick={() => setPagination(prev => ({ ...prev, current_page: page }))}
                >
                  {page}
                </button>
              </li>
            ))}
            
            <li className={`page-item ${pagination.current_page === pagination.last_page ? 'disabled' : ''}`}>
              <button
                className="page-link"
                onClick={() => setPagination(prev => ({ ...prev, current_page: prev.current_page + 1 }))}
                disabled={pagination.current_page === pagination.last_page}
              >
                Next
              </button>
            </li>
          </ul>
        </nav>
      )}

      {/* Per Page Selector */}
      <div className="d-flex justify-content-between align-items-center mt-3">
        <div className="d-flex align-items-center">
          <i className="bi bi-list-ul me-2 text-muted"></i>
          <label className="form-label me-2 mb-0">Logs per page:</label>
          <select
            className="form-select d-inline-block w-auto"
            value={pagination.per_page}
            onChange={(e) => setPagination(prev => ({ 
              ...prev, 
              per_page: parseInt(e.target.value),
              current_page: 1 
            }))}
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      </div>

      {/* Context Popup Card - Anchor-aware Popup */}
      {showContextModal && createPortal(
        <div 
          className="context-popup-card"
          role="dialog"
          aria-modal="true"
          aria-label="Details"
          tabIndex={-1}
          style={{ 
            top: popupPos.top, 
            left: popupPos.left, 
            right: 'auto' 
          }}
        >
          <div className="context-popup-header">
            <div className="context-popup-title">
              <i className="bi bi-info-circle me-1"></i>
              <span>Details</span>
            </div>
            <div className="context-popup-controls">
              <button
                type="button"
                className="context-popup-minimize"
                onClick={() => setShowContextModal(false)}
                title="Minimize"
              >
                <i className="bi bi-dash"></i>
              </button>
              <button
                type="button"
                className="context-popup-close"
                onClick={closeContextModal}
                title="Close"
              >
                <i className="bi bi-x"></i>
              </button>
            </div>
          </div>
          
          <div className="context-popup-body">
            {copySuccess && (
              <div className="context-popup-alert">
                <i className="bi bi-check-circle me-1"></i>
                <span>Copied!</span>
              </div>
            )}
            
            <div className="context-popup-content">
              <div className="context-popup-info">
                <small className="text-muted">
                  <i className="bi bi-list-ul me-1"></i>
                  {Object.keys(selectedContext || {}).length} field(s)
                </small>
              </div>
              
              <div className="context-popup-data">
                {formatContextData(selectedContext)}
              </div>
            </div>
          </div>
          
          <div className="context-popup-footer">
            <button
              type="button"
              className="context-popup-btn context-popup-btn-secondary"
              onClick={closeContextModal}
            >
              <i className="bi bi-x-circle me-1"></i>
              Close
            </button>
            <button
              type="button"
              className="context-popup-btn context-popup-btn-primary"
              onClick={handleCopyToClipboard}
            >
              <i className="bi bi-clipboard me-1"></i>
              Copy
            </button>
          </div>
        </div>,
        document.body
      )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemLogsPage;
