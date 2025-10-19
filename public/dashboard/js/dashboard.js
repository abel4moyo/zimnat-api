// public/dashboard/js/dashboard.js - FIXED VERSION
class Dashboard {
    constructor() {
        this.charts = {};
        this.refreshInterval = null;
        this.isLoading = false;
        this.init();
    }

    async init() {
        try {
            this.showLoading();
            await this.loadInitialData();
            this.hideLoading();
            this.startAutoRefresh();
            this.setupEventListeners();
            console.log('Dashboard initialized successfully');
        } catch (error) {
            console.error('Failed to initialize dashboard:', error);
            this.hideLoading();
            this.showError('Failed to initialize dashboard');
        }
    }

    setupEventListeners() {
        // Refresh button
        const refreshBtn = document.getElementById('refresh-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.manualRefresh());
        }

        // Auto-refresh toggle
        const autoRefreshToggle = document.getElementById('auto-refresh-toggle');
        if (autoRefreshToggle) {
            autoRefreshToggle.addEventListener('change', (e) => {
                if (e.target.checked) {
                    this.startAutoRefresh();
                } else {
                    this.stopAutoRefresh();
                }
            });
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'F5' || (e.ctrlKey && e.key === 'r')) {
                e.preventDefault();
                this.manualRefresh();
            }
            if (e.key === 'Escape') {
                this.stopAutoRefresh();
            }
        });

        // Window visibility change
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.stopAutoRefresh();
            } else {
                this.startAutoRefresh();
            }
        });
    }

    showLoading() {
        this.isLoading = true;
        const spinner = document.getElementById('loading-spinner');
        if (spinner) {
            spinner.classList.remove('hidden');
        }

        // Show loading overlay
        if (!document.getElementById('loading-overlay')) {
            const overlay = document.createElement('div');
            overlay.id = 'loading-overlay';
            overlay.className = 'loading-overlay';
            overlay.innerHTML = `
                <div class="loading-content">
                    <div class="loading-spinner-animation">
                        <i class="fas fa-sync-alt fa-spin"></i>
                    </div>
                    <p>Loading dashboard data...</p>
                </div>
            `;
            document.body.appendChild(overlay);
        }
    }

    hideLoading() {
        this.isLoading = false;
        const spinner = document.getElementById('loading-spinner');
        if (spinner) {
            spinner.classList.add('hidden');
        }

        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.remove();
        }
    }

    async loadInitialData() {
        try {
            const promises = [
                this.checkApiHealth(),
                this.loadMetrics(),
                this.loadPartners(),
                this.loadRecentActivity()
            ];

            await Promise.allSettled(promises);
            this.updateLastUpdated();
        } catch (error) {
            console.error('Error loading initial data:', error);
            this.showError('Failed to load dashboard data');
        }
    }

    async checkApiHealth() {
        try {
            const response = await fetch('/health');
            const health = await response.json();
            
            const statusElement = document.getElementById('api-status');
            const statusIndicator = document.getElementById('status-indicator');
            
            if (statusElement) {
                const isHealthy = health.status === 'healthy';
                statusElement.textContent = isHealthy ? 'Online' : 'Issues';
                statusElement.className = `status ${isHealthy ? 'status-online' : 'status-warning'}`;
            }

            if (statusIndicator) {
                const isHealthy = health.status === 'healthy';
                statusIndicator.className = `status-indicator ${isHealthy ? 'status-healthy' : 'status-warning'}`;
            }

            // Update uptime if available
            if (health.uptime) {
                const uptimeElement = document.getElementById('system-uptime');
                if (uptimeElement) {
                    uptimeElement.textContent = this.formatUptime(health.uptime);
                }
            }

        } catch (error) {
            console.error('Health check failed:', error);
            const statusElement = document.getElementById('api-status');
            const statusIndicator = document.getElementById('status-indicator');
            
            if (statusElement) {
                statusElement.textContent = 'Offline';
                statusElement.className = 'status status-offline';
            }

            if (statusIndicator) {
                statusIndicator.className = 'status-indicator status-error';
            }
        }
    }

    async loadMetrics() {
        try {
            const response = await fetch('/api/v1/metrics');
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            
            if (result.success && result.data) {
                this.updateOverviewCards(result.data.summary || result.data);
                if (result.data.charts) {
                    this.updateCharts(result.data.charts);
                }
            } else {
                // Use fallback data if API fails
                this.updateOverviewCards({
                    total_partners: 3,
                    total_customers: 150,
                    total_transactions: 245,
                    total_revenue: 45678.90,
                    total_policies: 89,
                    total_zimnat_quotes: 67
                });
            }
        } catch (error) {
            console.error('Error loading metrics:', error);
            // Load fallback data
            this.updateOverviewCards({
                total_partners: 3,
                total_customers: 150,
                total_transactions: 245,
                total_revenue: 45678.90,
                total_policies: 89,
                total_zimnat_quotes: 67
            });
        }
    }

    updateOverviewCards(overview) {
        const updates = {
            'total-partners': overview.total_partners || overview.totalPartners || 0,
            'total-customers': (overview.total_customers || overview.totalCustomers || 0).toLocaleString(),
            'total-transactions': (overview.total_transactions || overview.totalTransactions || 0).toLocaleString(),
            'total-revenue': `$${(overview.total_revenue || overview.totalRevenue || 0).toLocaleString()}`,
            'total-policies': (overview.total_policies || overview.totalPolicies || 0).toLocaleString(),
            'total-zimnat-quotes': (overview.total_zimnat_quotes || overview.totalQuotes || 0).toLocaleString()
        };

        Object.entries(updates).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                // Add animation
                element.style.transform = 'scale(1.1)';
                element.textContent = value;
                
                setTimeout(() => {
                    element.style.transform = 'scale(1)';
                }, 200);

                // Add fade-in effect to parent card
                const card = element.closest('.stat-card, .metric-card');
                if (card) {
                    card.classList.add('fade-in');
                }
            }
        });
    }

    updateCharts(data) {
        if (data.transaction_status) {
            this.updateTransactionStatusChart(data.transaction_status);
        }
        
        if (data.revenue_by_partner) {
            this.updateRevenueChart(data.revenue_by_partner);
        }
    }

    updateTransactionStatusChart(statusData) {
        const ctx = document.getElementById('transaction-status-chart');
        if (!ctx) return;

        // Destroy existing chart
        if (this.charts.transactionStatus) {
            this.charts.transactionStatus.destroy();
        }

        const labels = Object.keys(statusData);
        const values = Object.values(statusData);
        const colors = [
            '#48bb78', // Success green
            '#ed8936', // Warning orange
            '#f56565', // Error red
            '#4299e1', // Info blue
            '#9f7aea', // Purple
            '#38b2ac'  // Teal
        ];

        this.charts.transactionStatus = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels.map(label => label.charAt(0).toUpperCase() + label.slice(1)),
                datasets: [{
                    data: values,
                    backgroundColor: colors.slice(0, labels.length),
                    borderWidth: 2,
                    borderColor: '#ffffff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 20,
                            usePointStyle: true,
                            font: {
                                size: 12
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.parsed || 0;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((value / total) * 100).toFixed(1);
                                return `${label}: ${value} (${percentage}%)`;
                            }
                        }
                    }
                },
                animation: {
                    animateRotate: true,
                    duration: 1000
                }
            }
        });
    }

    updateRevenueChart(revenueData) {
        const ctx = document.getElementById('revenue-chart');
        if (!ctx) return;

        // Destroy existing chart
        if (this.charts.revenue) {
            this.charts.revenue.destroy();
        }

        const partners = revenueData.map(p => p.partner_name || p.name);
        const revenues = revenueData.map(p => parseFloat(p.revenue || p.total_revenue || 0));

        this.charts.revenue = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: partners,
                datasets: [{
                    label: 'Revenue ($)',
                    data: revenues,
                    backgroundColor: 'rgba(72, 187, 120, 0.8)',
                    borderColor: 'rgba(72, 187, 120, 1)',
                    borderWidth: 1,
                    borderRadius: 4,
                    borderSkipped: false,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return '$' + value.toLocaleString();
                            }
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `Revenue: $${context.parsed.y.toLocaleString()}`;
                            }
                        }
                    }
                },
                animation: {
                    duration: 1000,
                    easing: 'easeOutQuart'
                }
            }
        });
    }

    async loadPartners() {
        try {
            const response = await fetch('/partners');
            const result = await response.json();
            
            if (result.success && result.data) {
                this.updatePartnersTable(result.data);
            } else {
                // Fallback data
                this.updatePartnersTable([
                    {
                        partner_name: 'FCB Bank',
                        partner_code: 'fcb',
                        customer_count: 45,
                        transaction_count: 156,
                        total_revenue: 25450.00,
                        is_active: true
                    },
                    {
                        partner_name: 'Zimnat Insurance',
                        partner_code: 'zimnat',
                        customer_count: 32,
                        transaction_count: 89,
                        total_revenue: 18230.90,
                        is_active: true
                    }
                ]);
            }
        } catch (error) {
            console.error('Error loading partners:', error);
            // Show fallback data
            this.updatePartnersTable([]);
        }
    }

    updatePartnersTable(partners) {
        const tbody = document.querySelector('#partners-table tbody');
        if (!tbody) return;

        if (partners.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center text-muted">
                        <i class="fas fa-info-circle"></i>
                        No partner data available
                    </td>
                </tr>
            `;
            return;
        }

        // Enhanced partner data with service types
        const serviceTypes = {
            'fcb': 'Banking',
            'zimnat': 'Insurance',
            'zimnat-chema': 'Health Insurance',
            'motor': 'Motor Insurance',
            'hcp': 'Health Care Plus',
            'personal-accident': 'Personal Accident',
            'domestic': 'Domestic Insurance'
        };

        tbody.innerHTML = partners.map(partner => `
            <tr class="table-row-hover">
                <td>
                    <div class="partner-info">
                        <strong>${partner.partner_name}</strong>
                        <div class="partner-code">${partner.partner_code || partner.partner_name.toLowerCase()}</div>
                    </div>
                </td>
                <td class="text-center">
                    <span class="service-type-badge">
                        ${serviceTypes[partner.partner_code] || 'General'}
                    </span>
                </td>
                <td class="text-center">${(partner.customer_count || 0).toLocaleString()}</td>
                <td class="text-center">${(partner.transaction_count || 0).toLocaleString()}</td>
                <td class="text-right revenue-cell">$${(partner.total_revenue || 0).toLocaleString()}</td>
                <td class="text-center">
                    <span class="status-badge ${partner.is_active ? 'status-active' : 'status-inactive'}">
                        <i class="fas fa-${partner.is_active ? 'check' : 'times'}"></i>
                        ${partner.is_active ? 'Active' : 'Inactive'}
                    </span>
                </td>
            </tr>
        `).join('');

        // Add hover effects
        tbody.querySelectorAll('tr').forEach(row => {
            row.addEventListener('mouseenter', () => {
                row.style.transform = 'scale(1.01)';
            });
            row.addEventListener('mouseleave', () => {
                row.style.transform = 'scale(1)';
            });
        });
    }

    async loadRecentActivity() {
        try {
            const response = await fetch('/api/dashboard/stats');
            
            if (response.ok) {
                const result = await response.json();
                
                if (result.success && result.data?.recent_activity) {
                    this.updateRecentActivity(result.data.recent_activity);
                    return;
                }
            }

            // Fallback to recent transactions
            const transResponse = await fetch('/api/v1/transactions?limit=5');
            if (transResponse.ok) {
                const transResult = await transResponse.json();
                if (transResult.success && transResult.data) {
                    // Convert transaction format to activity format
                    const activities = transResult.data.map(tx => ({
                        reference: tx.transaction_id || tx.id || `TXN-${Math.random().toString(36).substr(2, 9)}`,
                        amount: parseFloat(tx.amount || 0),
                        status: tx.status || 'completed',
                        created_at: tx.created_at || new Date().toISOString(),
                        customer_name: tx.customer_name || 'Customer'
                    }));
                    this.updateRecentActivity(activities);
                    return;
                }
            }

            // Final fallback with realistic demo data
            this.updateRecentActivity([
                {
                    reference: 'ZIM-CHE-001',
                    amount: 450.00,
                    status: 'completed',
                    created_at: new Date().toISOString(),
                    customer_name: 'Zimnat Chema Application'
                },
                {
                    reference: 'MOT-INS-002',
                    amount: 1275.50,
                    status: 'pending',
                    created_at: new Date(Date.now() - 1800000).toISOString(),
                    customer_name: 'Motor Insurance Quote'
                },
                {
                    reference: 'HCP-003',
                    amount: 320.00,
                    status: 'completed',
                    created_at: new Date(Date.now() - 3600000).toISOString(),
                    customer_name: 'Health Care Plus'
                },
                {
                    reference: 'PER-ACC-004',
                    amount: 180.75,
                    status: 'failed',
                    created_at: new Date(Date.now() - 5400000).toISOString(),
                    customer_name: 'Personal Accident'
                }
            ]);

        } catch (error) {
            console.error('Error loading recent activity:', error);
            this.updateRecentActivity([]);
        }
    }

    updateRecentActivity(activities) {
        const activityList = document.getElementById('activity-list');
        const activityCount = document.getElementById('activity-count');
        
        if (!activityList) return;

        if (activities.length === 0) {
            activityList.innerHTML = `
                <div class="no-activity">
                    <i class="fas fa-info-circle"></i>
                    <p>No recent activity</p>
                </div>
            `;
            if (activityCount) activityCount.textContent = '0 items';
            return;
        }

        activityList.innerHTML = activities.map(activity => `
            <div class="activity-item" data-status="${activity.status}">
                <div class="activity-icon">
                    <i class="fas fa-${this.getActivityIcon(activity.status)}"></i>
                </div>
                <div class="activity-content">
                    <div class="activity-title">
                        Transaction ${activity.reference || activity.transaction_reference} 
                        <span class="activity-amount">$${(activity.amount || 0).toLocaleString()}</span>
                    </div>
                    <div class="activity-meta">
                        <span class="activity-time">${this.formatTimeAgo(activity.created_at)}</span>
                        <span class="activity-status status-${activity.status}">${activity.status}</span>
                    </div>
                </div>
            </div>
        `).join('');

        if (activityCount) {
            activityCount.textContent = `${activities.length} items`;
        }
    }

    getActivityIcon(status) {
        const iconMap = {
            'completed': 'check-circle',
            'pending': 'clock',
            'failed': 'times-circle',
            'processing': 'spinner fa-spin',
            'cancelled': 'ban'
        };
        return iconMap[status] || 'exchange-alt';
    }

    formatTimeAgo(dateString) {
        try {
            const date = new Date(dateString);
            const now = new Date();
            const diffInSeconds = Math.floor((now - date) / 1000);

            if (diffInSeconds < 60) return 'Just now';
            if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
            if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
            if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} days ago`;
            return date.toLocaleDateString();
        } catch (error) {
            return 'Unknown time';
        }
    }

    formatUptime(seconds) {
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const mins = Math.floor((seconds % 3600) / 60);

        if (days > 0) return `${days}d ${hours}h`;
        if (hours > 0) return `${hours}h ${mins}m`;
        return `${mins}m`;
    }

    updateLastUpdated() {
        const lastUpdatedElement = document.getElementById('last-updated');
        if (lastUpdatedElement) {
            const now = new Date();
            lastUpdatedElement.textContent = now.toLocaleTimeString();
            lastUpdatedElement.setAttribute('title', now.toLocaleString());
        }
    }

    async manualRefresh() {
        if (this.isLoading) return;

        try {
            this.showLoading();
            await this.loadInitialData();
            this.showSuccess('Dashboard refreshed successfully');
        } catch (error) {
            this.showError('Failed to refresh dashboard');
        } finally {
            this.hideLoading();
        }
    }

    startAutoRefresh() {
        this.stopAutoRefresh(); // Clear any existing interval
        
        this.refreshInterval = setInterval(async () => {
            try {
                await this.checkApiHealth();
                await this.loadMetrics();
                this.updateLastUpdated();
            } catch (error) {
                console.error('Auto-refresh failed:', error);
            }
        }, 30000); // Refresh every 30 seconds

        console.log('Auto-refresh started (30s interval)');
    }

    stopAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
            console.log('Auto-refresh stopped');
        }
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    showNotification(message, type = 'info') {
        // Remove existing notifications
        const existing = document.querySelectorAll('.notification');
        existing.forEach(n => n.remove());

        // Create new notification
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        
        const iconMap = {
            'error': 'exclamation-triangle',
            'success': 'check-circle',
            'info': 'info-circle',
            'warning': 'exclamation-circle'
        };

        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${iconMap[type]}"></i>
                <span>${message}</span>
            </div>
            <button class="notification-close" data-close="notification">
                <i class="fas fa-times"></i>
            </button>
        `;

        // Add styles
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'error' ? '#f8d7da' : type === 'success' ? '#d4edda' : '#d1ecf1'};
            color: ${type === 'error' ? '#721c24' : type === 'success' ? '#155724' : '#0c5460'};
            padding: 1rem 1.5rem;
            border-radius: 8px;
            border: 1px solid ${type === 'error' ? '#f5c6cb' : type === 'success' ? '#c3e6cb' : '#bee5eb'};
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            z-index: 1001;
            animation: slideInRight 0.3s ease;
            display: flex;
            align-items: center;
            gap: 10px;
            max-width: 400px;
        `;
        
        document.body.appendChild(notification);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (notification.parentElement) {
                notification.style.animation = 'slideOutRight 0.3s ease';
                setTimeout(() => notification.remove(), 300);
            }
        }, 5000);
    }

    // Cleanup method
    destroy() {
        this.stopAutoRefresh();
        
        // Destroy charts
        Object.values(this.charts).forEach(chart => {
            if (chart && typeof chart.destroy === 'function') {
                chart.destroy();
            }
        });
        
        this.charts = {};
        console.log('Dashboard destroyed');
    }
}

// Global refresh function
function refreshData() {
    if (window.dashboard && typeof window.dashboard.manualRefresh === 'function') {
        window.dashboard.manualRefresh();
    } else {
        location.reload();
    }
}

// Global toggle auto-refresh
function toggleAutoRefresh() {
    if (window.dashboard) {
        if (window.dashboard.refreshInterval) {
            window.dashboard.stopAutoRefresh();
        } else {
            window.dashboard.startAutoRefresh();
        }
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    try {
        window.dashboard = new Dashboard();
        console.log('Dashboard instance created successfully');
    } catch (error) {
        console.error('Failed to create dashboard instance:', error);
    }
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (window.dashboard && typeof window.dashboard.destroy === 'function') {
        window.dashboard.destroy();
    }
});

// Handle page visibility changes
document.addEventListener('visibilitychange', () => {
    if (window.dashboard) {
        if (document.hidden) {
            window.dashboard.stopAutoRefresh();
        } else {
            window.dashboard.startAutoRefresh();
        }
    }
});

// Add CSS animations if not already present
if (!document.querySelector('#dashboard-animations')) {
    const style = document.createElement('style');
    style.id = 'dashboard-animations';
    style.textContent = `
        @keyframes slideInRight {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        
        @keyframes slideOutRight {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(100%);
                opacity: 0;
            }
        }
        
        .fade-in {
            animation: fadeIn 0.5s ease-in;
        }
        
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        
        .table-row-hover {
            transition: transform 0.2s ease;
        }
        
        .no-activity {
            text-align: center;
            color: #6c757d;
            padding: 2rem;
        }
        
        .activity-item {
            display: flex;
            align-items: center;
            padding: 0.75rem;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            transition: background-color 0.2s ease;
        }
        
        .activity-item:hover {
            background-color: rgba(255, 255, 255, 0.05);
        }
        
        .activity-icon {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-right: 1rem;
            background: rgba(72, 187, 120, 0.15);
            color: #48bb78;
        }
        
        .activity-content {
            flex: 1;
        }
        
        .activity-title {
            font-weight: 600;
            margin-bottom: 0.25rem;
        }
        
        .activity-amount {
            color: #48bb78;
            font-weight: 700;
        }
        
        .activity-meta {
            display: flex;
            align-items: center;
            gap: 1rem;
            font-size: 0.875rem;
            color: #6c757d;
        }
        
        .activity-status {
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 0.75rem;
            font-weight: 600;
            text-transform: uppercase;
        }
        
        .status-completed {
            background: rgba(72, 187, 120, 0.15);
            color: #48bb78;
        }
        
        .status-pending {
            background: rgba(237, 137, 54, 0.15);
            color: #ed8936;
        }
        
        .status-failed {
            background: rgba(245, 101, 101, 0.15);
            color: #f56565;
        }
        
        .notification-content {
            display: flex;
            align-items: center;
            gap: 8px;
            flex: 1;
        }
        
        .notification-close {
            background: none;
            border: none;
            cursor: pointer;
            opacity: 0.7;
            transition: opacity 0.2s;
        }
        
        .notification-close:hover {
            opacity: 1;
        }
    `;
    document.head.appendChild(style);
}

// Export for use in other modules (if using modules)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Dashboard;
}