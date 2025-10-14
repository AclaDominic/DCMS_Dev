import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import api from '../../api/api';
import LoadingSpinner from '../../components/LoadingSpinner';
import './SystemLogsPage.css';

const SystemLogsPage = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);
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
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [showContextModal, setShowContextModal] = useState(false);
  const [selectedContext, setSelectedContext] = useState(null);
  const [selectedLog, setSelectedLog] = useState(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [popupPos, setPopupPos] = useState({ top: 0, left: 0 });
  const [searchTimeout, setSearchTimeout] = useState(null);

  useEffect(() => {
    fetchFilterOptions();
    fetchLogs(true); // Initial load
  }, []);

  useEffect(() => {
    // Skip if this is the initial render (handled by initial useEffect)
    if (loading) return;

    // Clear existing timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    // For search, add debounce and minimum character requirement
    if (filters.search && filters.search.length >= 2) {
      const timeout = setTimeout(() => {
        fetchLogs(false); // Not initial load
      }, 300); // 300ms debounce
      setSearchTimeout(timeout);
    } else if (!filters.search || filters.search.length === 0) {
      // Immediate fetch for empty search or other filters
      fetchLogs(false); // Not initial load
    }
    // If search has 1 character, don't fetch - just wait for more input

    // Cleanup function
    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
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

  const fetchLogs = async (isInitialLoad = false) => {
    try {
      // Use different loading states for initial load vs filter changes
      if (isInitialLoad) {
        setLoading(true);
      } else {
        setTableLoading(true);
      }
      
      const params = new URLSearchParams();
      
      // Add filters (skip search if less than 2 characters)
      Object.entries(filters).forEach(([key, value]) => {
        if (value) {
          // Skip search if less than 2 characters
          if (key === 'search' && value.length < 2) {
            return;
          }
          params.append(key, value);
        }
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
      if (isInitialLoad) {
        setLoading(false);
      } else {
        setTableLoading(false);
      }
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

  const removeFilter = (filterKey) => {
    setFilters(prev => ({ ...prev, [filterKey]: '' }));
    setPagination(prev => ({ ...prev, current_page: 1 }));
  };

  const getActiveFiltersCount = () => {
    return Object.values(filters).filter(value => value !== '').length;
  };

  const getActiveFilters = () => {
    return Object.entries(filters)
      .filter(([_, value]) => value !== '')
      .map(([key, value]) => {
        let displayValue = value;
        let displayLabel = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

        // Get user name if filtering by user
        if (key === 'user_id') {
          const user = filterOptions.users.find(u => u.id.toString() === value.toString());
          displayValue = user ? user.name : value;
        }
        // Get category label
        else if (key === 'category') {
          const categoryInfo = getCategoryInfo(value);
          displayValue = categoryInfo.label;
        }
        // Get action label
        else if (key === 'action') {
          const actionInfo = getActionInfo(value);
          displayValue = actionInfo.label;
        }
        // Format dates
        else if (key === 'date_from' || key === 'date_to') {
          displayValue = new Date(value).toLocaleDateString();
          displayLabel = key === 'date_from' ? 'From' : 'To';
        }

        return { key, label: displayLabel, value: displayValue };
      });
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

  const handleViewContext = (log, anchorElement) => {
    setSelectedLog(log);
    setSelectedContext(log.context);
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
    setSelectedLog(null);
    setCopySuccess(false);
    setAnchorEl(null);
  };

  const handleCopyToClipboard = async () => {
    try {
      const fullData = {
        id: selectedLog?.id,
        user: selectedLog?.user,
        category: selectedLog?.category,
        action: selectedLog?.action,
        subject_id: selectedLog?.subject_id,
        message: selectedLog?.message,
        context: selectedContext,
        created_at: selectedLog?.created_at
      };
      await navigator.clipboard.writeText(JSON.stringify(fullData, null, 2));
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000); // Hide success message after 2 seconds
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  // Format context data for better readability with sections
  const formatContextData = (log, context) => {
    if (!context || Object.keys(context).length === 0) {
      return (
        <div className="context-popup-section">
          <div className="text-center text-muted py-3">
            <i className="bi bi-info-circle me-2" style={{ fontSize: '2rem' }}></i>
            <p className="mt-2 mb-0">No additional context data available for this log entry.</p>
          </div>
        </div>
      );
    }
    
    const formatValue = (key, value) => {
      if (value === null || value === undefined) return <span className="text-muted fst-italic">Not specified</span>;
      if (typeof value === 'boolean') return <span className={value ? 'text-success fw-bold' : 'text-danger fw-bold'}>{value ? 'Yes' : 'No'}</span>;
      if (typeof value === 'object') {
        return (
          <div className="context-json-viewer">
            {JSON.stringify(value, null, 2)}
          </div>
        );
      }
      return value.toString();
    };

    const getFieldLabel = (key) => {
      const labels = {
        'id': 'ID', 'name': 'Name', 'email': 'Email Address', 'phone': 'Phone Number',
        'status': 'Status', 'type': 'Type', 'amount': 'Amount', 'date': 'Date', 'time': 'Time',
        'description': 'Description', 'notes': 'Notes', 'user_id': 'User ID', 'patient_id': 'Patient ID',
        'appointment_id': 'Appointment ID', 'service_id': 'Service ID', 'dentist_id': 'Dentist ID',
        'device_id': 'Device ID', 'payment_id': 'Payment ID', 'inventory_id': 'Inventory Item ID',
        'created_at': 'Created At', 'updated_at': 'Updated At', 'deleted_at': 'Deleted At',
        'ip_address': 'IP Address', 'user_agent': 'Browser Information', 'device_name': 'Device Name',
        'device_type': 'Device Type', 'device_status': 'Device Status', 'appointment_date': 'Appointment Date',
        'appointment_time': 'Appointment Time', 'patient_name': 'Patient Name', 'dentist_name': 'Dentist Name',
        'service_name': 'Service Name', 'payment_amount': 'Payment Amount', 'payment_method': 'Payment Method',
        'payment_status': 'Payment Status', 'quantity': 'Quantity', 'unit_price': 'Unit Price',
        'total_amount': 'Total Amount', 'reason': 'Reason', 'comment': 'Comment',
        'old_values': 'Previous Values', 'new_values': 'New Values', 'changes': 'Changes Made',
        'reference_code': 'Reference Code', 'time_slot': 'Time Slot', 'rejection_note': 'Rejection Note',
        'warning_message': 'Warning Message', 'warning_count': 'Warning Count', 'no_show_count': 'No-Show Count',
        'block_reason': 'Block Reason', 'block_type': 'Block Type', 'blocked_ip': 'Blocked IP',
        'unblock_reason': 'Unblock Reason', 'old_count': 'Old Count', 'new_count': 'New Count',
        'admin_id': 'Admin ID', 'custom_message': 'Custom Message', 'added_by': 'Added By',
        'linked_by': 'Linked By', 'flagged_by': 'Flagged By', 'created_by': 'Created By',
        'updated_by': 'Updated By', 'deleted_by': 'Deleted By', 'performed_by': 'Performed By',
        'old_name': 'Old Name', 'new_name': 'New Name', 'old_status': 'Old Status', 'new_status': 'New Status',
        'old_date': 'Old Date', 'new_date': 'New Date', 'old_time_slot': 'Old Time Slot', 'new_time_slot': 'New Time Slot',
        'contact_number': 'Contact Number', 'category_id': 'Category ID', 'estimated_minutes': 'Estimated Minutes',
        'price': 'Price', 'role': 'Role', 'action_required': 'Action Required'
      };
      return labels[key] || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    };

    const getFieldIcon = (key) => {
      const icons = {
        'id': 'bi-hash', 'name': 'bi-person', 'email': 'bi-envelope', 'phone': 'bi-telephone',
        'status': 'bi-circle-fill', 'type': 'bi-tag', 'amount': 'bi-currency-dollar',
        'date': 'bi-calendar', 'time': 'bi-clock', 'description': 'bi-text-paragraph',
        'notes': 'bi-sticky', 'user_id': 'bi-person-badge', 'patient_id': 'bi-person-heart',
        'appointment_id': 'bi-calendar-check', 'service_id': 'bi-gear', 'device_id': 'bi-laptop',
        'payment_id': 'bi-credit-card', 'ip_address': 'bi-globe', 'user_agent': 'bi-browser-chrome',
        'reason': 'bi-chat-quote', 'comment': 'bi-chat-text', 'old_values': 'bi-arrow-left',
        'new_values': 'bi-arrow-right', 'reference_code': 'bi-code-square', 'time_slot': 'bi-clock-history',
        'warning_message': 'bi-exclamation-triangle', 'no_show_count': 'bi-x-octagon',
        'block_reason': 'bi-shield-x', 'contact_number': 'bi-telephone', 'price': 'bi-currency-dollar'
      };
      return icons[key] || 'bi-info-circle';
    };

    const isHighlightField = (key) => {
      return ['reason', 'block_reason', 'rejection_note', 'warning_message', 'unblock_reason', 'action_required'].includes(key);
    };

    const isCodeField = (key) => {
      return ['reference_code', 'device_fingerprint', 'ip_address', 'blocked_ip'].includes(key);
    };

    return (
      <>
        {/* Log Summary Section */}
        <div className="context-popup-section">
          <div className="context-popup-section-title">
            <i className="bi bi-info-circle-fill"></i>
            <span>Log Summary</span>
          </div>
          
          <div className="context-field">
            <div className="context-field-label">
              <i className="bi bi-hash"></i>
              Log ID
            </div>
            <div className="context-field-value code">#{log.id}</div>
          </div>

          {log.user && (
            <div className="context-field">
              <div className="context-field-label">
                <i className="bi bi-person-badge"></i>
                Performed By
              </div>
              <div className="context-field-value">
                <strong>{log.user.name}</strong> ({log.user.email})
              </div>
            </div>
          )}

          <div className="context-field">
            <div className="context-field-label">
              <i className="bi bi-chat-text"></i>
              Message
            </div>
            <div className="context-field-value">
              {log.message}
            </div>
          </div>

          <div className="context-field">
            <div className="context-field-label">
              <i className="bi bi-calendar"></i>
              Timestamp
            </div>
            <div className="context-field-value">
              {new Date(log.created_at).toLocaleString('en-US', {
                dateStyle: 'full',
                timeStyle: 'medium'
              })}
            </div>
          </div>
        </div>

        {/* Context Details Section */}
        <div className="context-popup-section">
          <div className="context-popup-section-title">
            <i className="bi bi-list-ul"></i>
            <span>Context Details ({Object.keys(context).length} field{Object.keys(context).length !== 1 ? 's' : ''})</span>
          </div>
          
          {Object.entries(context).map(([key, value]) => (
            <div key={key} className="context-field">
              <div className="context-field-label">
                <i className={`bi ${getFieldIcon(key)}`}></i>
                {getFieldLabel(key)}
              </div>
              <div className={`context-field-value ${isHighlightField(key) ? 'highlight' : ''} ${isCodeField(key) ? 'code' : ''}`}>
                {formatValue(key, value)}
              </div>
            </div>
          ))}
        </div>
      </>
    );
  };

  return (
    <div 
      className="system-logs-page"
      style={{
        background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
        padding: '1rem 1.5rem',
        boxSizing: 'border-box'
      }}
    >
      {/* Header - Stats Summary */}
      <div className="mb-3">
        <div className="card border-0 shadow-sm" style={{ borderRadius: '12px' }}>
          <div className="card-body p-3">
            <div className="row g-3 align-items-center">
              <div className="col-12 col-md-6">
                <div className="d-flex align-items-center">
                  <div className="bg-primary bg-opacity-10 rounded-circle p-3 me-3">
                    <i className="bi bi-list-ul text-primary" style={{ fontSize: '1.5rem' }}></i>
                  </div>
                  <div>
                    <h6 className="mb-0 text-muted small">Total Logs</h6>
                    <h4 className="mb-0 fw-bold">{pagination.total.toLocaleString()}</h4>
                  </div>
                </div>
              </div>
              <div className="col-12 col-md-6">
                <div className="d-flex align-items-center justify-content-md-end">
                  <div className="bg-info bg-opacity-10 rounded-circle p-3 me-3">
                    <i className="bi bi-eye text-info" style={{ fontSize: '1.5rem' }}></i>
                  </div>
                  <div>
                    <h6 className="mb-0 text-muted small">Showing</h6>
                    <h4 className="mb-0 fw-bold">
                      {logs.length} 
                      {pagination.total > 0 && (
                        <span className="text-muted small ms-2">
                          (Page {pagination.current_page}/{pagination.last_page})
                        </span>
                      )}
                    </h4>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Filters Bar */}
      <div className="mb-3">
        <div className="card border-0 shadow-sm" style={{ borderRadius: '16px', background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)' }}>
          <div className="card-body p-3">
            <div className="row g-3 align-items-center">
              {/* Search - Always Visible */}
              <div className="col-12 col-lg-4">
                <div className="position-relative">
                  <i className="bi bi-search position-absolute" style={{ left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#6c757d' }}></i>
                  <input
                    type="text"
                    className="form-control border-0 shadow-sm"
                    style={{ 
                      borderRadius: '12px', 
                      padding: '12px 16px 12px 42px', 
                      background: 'white',
                      borderColor: filters.search && filters.search.length === 1 ? '#ffc107' : ''
                    }}
                    placeholder="Search logs... (min 2 characters)"
                    value={filters.search}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                  />
                </div>
                {filters.search && filters.search.length > 0 && filters.search.length < 2 && (
                  <small className="text-warning mt-1 d-block fw-semibold">
                    <i className="bi bi-info-circle-fill me-1"></i>
                    Enter at least 2 characters to search
                  </small>
                )}
              </div>

              {/* Category - Always Visible */}
              <div className="col-12 col-md-6 col-lg-3">
                <select
                  className="form-select border-0 shadow-sm"
                  style={{ borderRadius: '12px', padding: '12px 16px', background: 'white' }}
                  value={filters.category}
                  onChange={(e) => handleFilterChange('category', e.target.value)}
                >
                  <option value="">All Categories</option>
                  {filterOptions.categories.map(category => {
                    const categoryInfo = getCategoryInfo(category);
                    return (
                      <option key={category} value={category}>
                        {categoryInfo.label}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Action - Always Visible */}
              <div className="col-12 col-md-6 col-lg-3">
                <select
                  className="form-select border-0 shadow-sm"
                  style={{ borderRadius: '12px', padding: '12px 16px', background: 'white' }}
                  value={filters.action}
                  onChange={(e) => handleFilterChange('action', e.target.value)}
                >
                  <option value="">All Actions</option>
                  {filterOptions.actions.map(action => {
                    const actionInfo = getActionInfo(action);
                    return (
                      <option key={action} value={action}>
                        {actionInfo.label}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Advanced Filters Toggle & Clear Button */}
              <div className="col-12 col-lg-2">
                <div className="d-flex gap-2">
                  <button 
                    className={`btn flex-grow-1 border-0 shadow-sm ${showAdvancedFilters ? 'btn-primary' : 'btn-outline-primary'}`}
                    onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                    style={{
                      borderRadius: '12px',
                      padding: '12px 16px',
                      fontWeight: '600',
                      background: showAdvancedFilters ? 'linear-gradient(135deg, #0d6efd 0%, #0b5ed7 100%)' : 'white',
                      color: showAdvancedFilters ? 'white' : '#0d6efd',
                      border: showAdvancedFilters ? 'none' : '2px solid #0d6efd'
                    }}
                  >
                    <i className={`bi bi-sliders`}></i>
                  </button>
                  {getActiveFiltersCount() > 0 && (
                    <button 
                      className="btn btn-outline-danger border-0 shadow-sm"
                      onClick={clearFilters}
                      style={{
                        borderRadius: '12px',
                        padding: '12px 16px',
                        fontWeight: '600'
                      }}
                      title="Clear all filters"
                    >
                      <i className="bi bi-x-circle"></i>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Advanced Filters - Collapsible */}
            {showAdvancedFilters && (
              <div className="mt-3 pt-3 border-top">
                <div className="row g-3">
                  <div className="col-12 col-md-6 col-lg-3">
                    <label className="form-label fw-semibold text-muted small">
                      <i className="bi bi-person me-1"></i>
                      User
                    </label>
                    <select
                      className="form-select border-0 shadow-sm"
                      style={{ borderRadius: '12px', padding: '12px 16px', background: 'white' }}
                      value={filters.user_id}
                      onChange={(e) => handleFilterChange('user_id', e.target.value)}
                    >
                      <option value="">All Users</option>
                      {filterOptions.users.map(user => (
                        <option key={user.id} value={user.id}>
                          {user.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-12 col-md-6 col-lg-3">
                    <label className="form-label fw-semibold text-muted small">
                      <i className="bi bi-hash me-1"></i>
                      Subject ID
                    </label>
                    <input
                      type="number"
                      className="form-control border-0 shadow-sm"
                      style={{ borderRadius: '12px', padding: '12px 16px', background: 'white' }}
                      placeholder="Enter ID"
                      value={filters.subject_id}
                      onChange={(e) => handleFilterChange('subject_id', e.target.value)}
                    />
                  </div>

                  <div className="col-12 col-md-6 col-lg-3">
                    <label className="form-label fw-semibold text-muted small">
                      <i className="bi bi-calendar-event me-1"></i>
                      Date From
                    </label>
                    <input
                      type="date"
                      className="form-control border-0 shadow-sm"
                      style={{ borderRadius: '12px', padding: '12px 16px', background: 'white' }}
                      value={filters.date_from}
                      onChange={(e) => handleFilterChange('date_from', e.target.value)}
                    />
                  </div>

                  <div className="col-12 col-md-6 col-lg-3">
                    <label className="form-label fw-semibold text-muted small">
                      <i className="bi bi-calendar-event me-1"></i>
                      Date To
                    </label>
                    <input
                      type="date"
                      className="form-control border-0 shadow-sm"
                      style={{ borderRadius: '12px', padding: '12px 16px', background: 'white' }}
                      value={filters.date_to}
                      onChange={(e) => handleFilterChange('date_to', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Active Filters Display */}
      {getActiveFilters().length > 0 && (
        <div className="mb-3">
          <div className="d-flex flex-wrap gap-2 align-items-center">
            <span className="text-muted small fw-semibold">
              <i className="bi bi-funnel-fill me-1"></i>
              Active Filters:
            </span>
            {getActiveFilters().map(filter => (
              <span 
                key={filter.key}
                className="badge d-inline-flex align-items-center gap-2"
                style={{
                  background: 'linear-gradient(135deg, #0d6efd 0%, #0b5ed7 100%)',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  fontWeight: '500'
                }}
              >
                <span>{filter.label}: <strong>{filter.value}</strong></span>
                <button
                  onClick={() => removeFilter(filter.key)}
                  className="btn-close btn-close-white"
                  style={{ fontSize: '0.65rem', opacity: 0.8 }}
                  aria-label={`Remove ${filter.label} filter`}
                ></button>
              </span>
            ))}
            <button
              onClick={clearFilters}
              className="btn btn-sm btn-outline-danger"
              style={{ borderRadius: '8px', padding: '6px 12px' }}
            >
              <i className="bi bi-x-circle me-1"></i>
              Clear All
            </button>
          </div>
        </div>
      )}

      {/* Logs Table */}
      {loading ? (
        <div className="d-flex justify-content-center align-items-center py-5">
          <div className="text-center">
            <div className="spinner-border text-primary mb-3" role="status" style={{ width: '3rem', height: '3rem' }}>
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="text-muted fs-5">Loading system logs...</p>
          </div>
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center text-muted py-5">
          <div className="d-flex flex-column align-items-center justify-content-center">
            <div className="bg-light rounded-circle mb-4 d-flex align-items-center justify-content-center" 
                 style={{ width: '100px', height: '100px', fontSize: '2.5rem' }}>
              📋
            </div>
            <h3 className="text-muted mb-3">No system logs found</h3>
            <p className="text-muted mb-0">Try adjusting your filters or check back later for new activity.</p>
          </div>
        </div>
      ) : (
        <div className="table-responsive position-relative" style={{ width: '100%' }}>
          {/* Table Loading Overlay */}
          {tableLoading && (
            <div 
              className="position-absolute top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center"
              style={{
                background: 'rgba(255, 255, 255, 0.9)',
                zIndex: 10,
                backdropFilter: 'blur(2px)'
              }}
            >
              <div className="text-center">
                <div className="spinner-border text-primary mb-2" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
                <p className="text-muted small mb-0">Updating results...</p>
              </div>
            </div>
          )}
          
          <table className="table table-hover mb-0" style={{ width: '100%' }}>
            <thead className="table-primary sticky-top">
              <tr>
                <th className="fw-semibold px-4 py-3 border-0" style={{ fontSize: '1.1rem', width: '5%' }}>
                  <i className="bi bi-hash me-2"></i>ID
                </th>
                <th className="fw-semibold px-4 py-3 border-0" style={{ fontSize: '1.1rem', width: '15%' }}>
                  <i className="bi bi-person me-2"></i>User
                </th>
                <th className="fw-semibold px-4 py-3 border-0" style={{ fontSize: '1.1rem', width: '12%' }}>
                  <i className="bi bi-tags me-2"></i>Category
                </th>
                <th className="fw-semibold px-4 py-3 border-0" style={{ fontSize: '1.1rem', width: '12%' }}>
                  <i className="bi bi-lightning me-2"></i>Action
                </th>
                <th className="fw-semibold px-4 py-3 border-0" style={{ fontSize: '1.1rem', width: '10%' }}>
                  <i className="bi bi-link-45deg me-2"></i>Subject ID
                </th>
                <th className="fw-semibold px-4 py-3 border-0" style={{ fontSize: '1.1rem', width: '25%' }}>
                  <i className="bi bi-chat-text me-2"></i>Message
                </th>
                <th className="fw-semibold px-4 py-3 border-0 text-center" style={{ fontSize: '1.1rem', width: '10%' }}>
                  <i className="bi bi-info-circle me-2"></i>Details
                </th>
                <th className="fw-semibold px-4 py-3 border-0" style={{ fontSize: '1.1rem', width: '11%' }}>
                  <i className="bi bi-calendar me-2"></i>Date
                </th>
              </tr>
            </thead>
            <tbody style={{ opacity: tableLoading ? 0.5 : 1, transition: 'opacity 0.2s ease' }}>
              {logs.map((log) => (
                <tr key={log.id} className="align-middle" style={{ height: '60px' }}>
                  <td className="px-4 py-3 border-0 text-center" style={{ fontSize: '1rem' }}>
                    <span className="badge bg-secondary">{log.id}</span>
                  </td>
                  <td className="px-4 py-3 border-0" style={{ fontSize: '1rem' }}>
                    {log.user ? (
                      <div className="d-flex align-items-center">
                        <div className="bg-primary rounded-circle me-3 d-flex align-items-center justify-content-center" 
                             style={{ width: '40px', height: '40px', fontSize: '1.2rem' }}>
                          <i className="bi bi-person text-white"></i>
                        </div>
                        <div>
                          <div className="fw-bold text-dark text-truncate" style={{ maxWidth: '150px' }} title={log.user.name}>{log.user.name}</div>
                          <small className="text-muted text-truncate d-block" style={{ maxWidth: '150px' }} title={log.user.email}>{log.user.email}</small>
                        </div>
                      </div>
                    ) : (
                      <div className="d-flex align-items-center">
                        <div className="bg-secondary rounded-circle me-3 d-flex align-items-center justify-content-center" 
                             style={{ width: '40px', height: '40px', fontSize: '1.2rem' }}>
                          <i className="bi bi-gear text-white"></i>
                        </div>
                        <div>
                          <div className="fw-bold text-dark">System</div>
                          <small className="text-muted">Automated</small>
                        </div>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 border-0" style={{ fontSize: '1rem' }}>
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
                  <td className="px-4 py-3 border-0" style={{ fontSize: '1rem' }}>
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
                  <td className="px-4 py-3 border-0 text-center" style={{ fontSize: '1rem' }}>
                    {log.subject_id ? (
                      <span className="badge bg-light text-dark">
                        {log.subject_id}
                      </span>
                    ) : (
                      <span className="text-muted">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 border-0" style={{ fontSize: '1rem' }}>
                    <div className="text-truncate" style={{ maxWidth: '300px' }} title={log.message}>
                      {log.message}
                    </div>
                  </td>
                  <td className="px-4 py-3 border-0 text-center" style={{ fontSize: '1rem' }}>
                    <button
                      className="btn btn-sm btn-outline-info"
                      onClick={(e) => handleViewContext(log, e.currentTarget)}
                      title="View detailed information"
                      style={{ borderRadius: '8px' }}
                    >
                      <i className="bi bi-eye me-1"></i>
                      Details
                    </button>
                  </td>
                  <td className="px-4 py-3 border-0" style={{ fontSize: '1rem' }}>
                    <small className="text-truncate d-block" style={{ maxWidth: '120px' }} title={formatDate(log.created_at)}>
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
        <div className="d-flex justify-content-center mt-3">
          <nav aria-label="System logs pagination">
            <ul className="pagination mb-0">
              <li className={`page-item ${pagination.current_page === 1 ? 'disabled' : ''}`}>
                <button
                  className="page-link border-0 shadow-sm"
                  style={{ borderRadius: '8px', margin: '0 2px' }}
                  onClick={() => setPagination(prev => ({ ...prev, current_page: prev.current_page - 1 }))}
                  disabled={pagination.current_page === 1}
                >
                  <i className="bi bi-chevron-left"></i>
                </button>
              </li>
              
              {Array.from({ length: Math.min(pagination.last_page, 5) }, (_, i) => {
                const page = i + 1;
                return (
                  <li key={page} className={`page-item ${page === pagination.current_page ? 'active' : ''}`}>
                    <button
                      className="page-link border-0 shadow-sm"
                      style={{ borderRadius: '8px', margin: '0 2px' }}
                      onClick={() => setPagination(prev => ({ ...prev, current_page: page }))}
                    >
                      {page}
                    </button>
                  </li>
                );
              })}
              
              <li className={`page-item ${pagination.current_page === pagination.last_page ? 'disabled' : ''}`}>
                <button
                  className="page-link border-0 shadow-sm"
                  style={{ borderRadius: '8px', margin: '0 2px' }}
                  onClick={() => setPagination(prev => ({ ...prev, current_page: prev.current_page + 1 }))}
                  disabled={pagination.current_page === pagination.last_page}
                >
                  <i className="bi bi-chevron-right"></i>
                </button>
              </li>
            </ul>
          </nav>
        </div>
      )}

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
              <i className="bi bi-file-text-fill me-2"></i>
              <span>System Log Details</span>
            </div>
            <div className="context-popup-controls">
              <button
                type="button"
                className="context-popup-close"
                onClick={closeContextModal}
                title="Close"
              >
                <i className="bi bi-x-lg"></i>
              </button>
            </div>
          </div>
          
          <div className="context-popup-body">
            {copySuccess && (
              <div className="alert alert-success d-flex align-items-center mb-3" role="alert">
                <i className="bi bi-check-circle-fill me-2"></i>
                <div>Full log data copied to clipboard successfully!</div>
              </div>
            )}
            
            <div className="context-popup-content">
              <div className="context-popup-data">
                {selectedLog && formatContextData(selectedLog, selectedContext)}
              </div>
            </div>
          </div>
          
          <div className="context-popup-footer">
            <div className="d-flex align-items-center gap-2">
              <i className="bi bi-clock-history text-muted"></i>
              <small className="text-muted">
                ID #{selectedLog?.id} • {selectedLog?.category}/{selectedLog?.action}
              </small>
            </div>
            <div className="d-flex gap-2">
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
                Copy All Data
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Footer - Logs Per Page Selector */}
      <div className="mt-4 pt-3 border-top">
        <div className="d-flex justify-content-center align-items-center">
          <div className="card border-0 shadow-sm">
            <div className="card-body p-3">
              <div className="d-flex align-items-center gap-2">
                <i className="bi bi-list-ul text-muted"></i>
                <label className="form-label mb-0 fw-semibold text-muted">Logs per page:</label>
                <select
                  className="form-select border-0 shadow-sm"
                  style={{ borderRadius: '8px', padding: '8px 16px', width: 'auto' }}
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
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemLogsPage;
