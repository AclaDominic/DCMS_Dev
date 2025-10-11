import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import useNotifications from "../context/NotificationsContext";
import "./NotificationsPage.css";

export default function NotificationsPage() {
  const { items, loading, error, loadList } = useNotifications();
  const navigate = useNavigate();

  useEffect(() => {
    if (items.length === 0) loadList(); // warm start from bell means this often skips
  }, [items.length, loadList]);

  const getNotificationIcon = (notification) => {
    // Determine icon based on notification type or content
    if (notification.title?.toLowerCase().includes('appointment')) {
      return 'bi-calendar-check';
    } else if (notification.title?.toLowerCase().includes('payment')) {
      return 'bi-credit-card';
    } else if (notification.title?.toLowerCase().includes('reminder')) {
      return 'bi-bell';
    } else if (notification.title?.toLowerCase().includes('update')) {
      return 'bi-arrow-clockwise';
    } else if (notification.title?.toLowerCase().includes('welcome')) {
      return 'bi-person-plus';
    } else {
      return 'bi-info-circle';
    }
  };

  const formatTimeAgo = (dateString) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    
    return date.toLocaleDateString();
  };

  return (
    <div className="notifications-page">
      {/* Header Section */}
      <div className="notifications-header">
        <div className="d-flex align-items-center mb-4">
          <button
            onClick={() => navigate(-1)}
            className="btn btn-outline-secondary btn-sm d-flex align-items-center me-3 notifications-back-btn"
            title="Go back"
            aria-label="Go back"
          >
            <i className="bi bi-arrow-left me-2"></i>
            Back
          </button>
          <div className="notifications-title-section">
            <h2 className="notifications-title mb-1">All Notifications</h2>
            <p className="notifications-subtitle mb-0">
              {items.length > 0 ? `${items.length} notification${items.length === 1 ? '' : 's'}` : 'No notifications yet'}
            </p>
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="notifications-content">
        {/* Loading State */}
        {loading && (
          <div className="notifications-loading">
            <div className="d-flex align-items-center justify-content-center py-5">
              <div className="spinner-border text-primary me-3" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              <span className="text-muted">Loading notifications...</span>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="notifications-error">
            <div className="alert alert-danger d-flex align-items-center" role="alert">
              <i className="bi bi-exclamation-triangle-fill me-3"></i>
              <div>
                <strong>Error loading notifications</strong>
                <div className="small">{error}</div>
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && items.length === 0 && (
          <div className="notifications-empty">
            <div className="text-center py-5">
              <div className="notifications-empty-icon mb-4">
                <i className="bi bi-bell"></i>
              </div>
              <h4 className="notifications-empty-title mb-3">No notifications yet</h4>
              <p className="notifications-empty-description text-muted mb-4">
                You'll see important updates, reminders, and announcements here when they arrive.
              </p>
              <button 
                className="btn btn-primary"
                onClick={() => loadList()}
              >
                <i className="bi bi-arrow-clockwise me-2"></i>
                Refresh
              </button>
            </div>
          </div>
        )}

        {/* Notifications List */}
        {!loading && !error && items.length > 0 && (
          <div className="notifications-list">
            {items.map((notification, index) => (
              <div key={notification.id} className="notification-item">
                <div className="notification-icon">
                  <i className={`bi ${getNotificationIcon(notification)}`}></i>
                </div>
                <div className="notification-content">
                  <div className="notification-header">
                    <h6 className="notification-title mb-1">
                      {notification.title || "Notification"}
                    </h6>
                    <small className="notification-time text-muted">
                      {formatTimeAgo(notification.created_at)}
                    </small>
                  </div>
                  {notification.body && (
                    <p className="notification-body mb-2">{notification.body}</p>
                  )}
                  {notification.data?.date && (
                    <div className="notification-meta">
                      <small className="text-muted">
                        <i className="bi bi-calendar3 me-1"></i>
                        {notification.data.date}
                      </small>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer Actions */}
      {!loading && !error && items.length > 0 && (
        <div className="notifications-footer">
          <div className="text-center">
            <button 
              className="btn btn-outline-primary btn-sm"
              onClick={() => loadList()}
            >
              <i className="bi bi-arrow-clockwise me-2"></i>
              Refresh Notifications
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
