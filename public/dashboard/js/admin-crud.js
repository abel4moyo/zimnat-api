// Admin CRUD Interface JavaScript
class AdminCRUD {
    constructor() {
        this.currentEditItem = null;
        this.currentEditType = null;
        this.isLoading = false;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadInitialData();
        console.log('Admin CRUD interface initialized');
    }

    setupEventListeners() {
        // Form submissions
        const partnerForm = document.getElementById('partner-form');
        const productForm = document.getElementById('product-form');
        const ipFilterForm = document.getElementById('ip-filter-form');

        if (partnerForm) {
            partnerForm.addEventListener('submit', (e) => this.handlePartnerSubmit(e));
        }
        if (productForm) {
            productForm.addEventListener('submit', (e) => this.handleProductSubmit(e));
        }
        if (ipFilterForm) {
            ipFilterForm.addEventListener('submit', (e) => this.handleIpFilterSubmit(e));
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.cancelAllForms();
            }
        });
    }

    async loadInitialData() {
        try {
            await Promise.all([
                this.loadPartners(),
                this.loadProducts(),
                this.loadIpFilters()
            ]);
        } catch (error) {
            console.error('Error loading initial data:', error);
        }
    }

    // Tab Management
    switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
        const activeTab = document.querySelector(`[onclick*="${tabName}"]`);
        if (activeTab) activeTab.classList.add('active');

        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        const tabContent = document.getElementById(`${tabName}-tab`);
        if (tabContent) tabContent.classList.add('active');

        // Hide all forms when switching tabs
        this.cancelAllForms();
    }

    // Partner Management
    async loadPartners() {
        try {
            this.showLoading('partners-tbody');
            
            let partners = [];
            try {
                const response = await fetch('/api/v1/admin/partners', {
                    headers: { 'X-Admin-API-Key': this.getAdminKey() }
                });
                
                if (response.ok) {
                    const result = await response.json();
                    partners = result.data || result || [];
                }
            } catch (error) {
                console.warn('Failed to load partners from API, using fallback data');
            }

            // Fallback data if API fails
            if (!Array.isArray(partners) || partners.length === 0) {
                partners = [
                    {
                        id: 1,
                        partner_code: 'fcb',
                        partner_name: 'First Capital Bank',
                        integration_type: 'api',
                        fee_percentage: 0.02,
                        is_active: true,
                        created_at: new Date().toISOString()
                    },
                    {
                        id: 2,
                        partner_code: 'zimnat',
                        partner_name: 'Zimnat Insurance',
                        integration_type: 'webhook',
                        fee_percentage: 0.015,
                        is_active: true,
                        created_at: new Date().toISOString()
                    }
                ];
            }

            this.renderPartnersTable(partners);
            this.updatePartnerSelects(partners);
        } catch (error) {
            console.error('Error loading partners:', error);
            this.showNotification('Failed to load partners', 'error');
        }
    }

    renderPartnersTable(partners) {
        const tbody = document.getElementById('partners-tbody');
        if (!tbody) return;
        
        if (!partners || partners.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; color: var(--text-muted); padding: 2rem;">
                        <i class="fas fa-info-circle"></i>
                        No partners found
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = partners.map(partner => `
            <tr>
                <td><strong>${partner.partner_code || 'N/A'}</strong></td>
                <td>${partner.partner_name || 'Unknown'}</td>
                <td><span class="status-badge status-active">${partner.integration_type || 'api'}</span></td>
                <td>${((partner.fee_percentage || 0) * 100).toFixed(2)}%</td>
                <td>
                    <span class="status-badge ${partner.is_active !== false ? 'status-active' : 'status-inactive'}">
                        ${partner.is_active !== false ? 'Active' : 'Inactive'}
                    </span>
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-sm btn-secondary" onclick="adminCRUD.editPartner(${JSON.stringify(partner).replace(/"/g, '&quot;')})">
                            <i class="fas fa-edit"></i>
                            Edit
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="adminCRUD.deletePartner('${partner.partner_code}', ${partner.id || Date.now()})">
                            <i class="fas fa-trash"></i>
                            Delete
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    updatePartnerSelects(partners) {
        const select = document.getElementById('product-partner-code');
        if (select && partners) {
            select.innerHTML = '<option value="">Select Partner</option>' + 
                partners.map(p => `<option value="${p.partner_code}">${p.partner_name}</option>`).join('');
        }
    }

    showAddPartnerForm() {
        this.currentEditItem = null;
        this.currentEditType = 'partner';
        
        const titleEl = document.getElementById('partner-form-title');
        const submitEl = document.getElementById('partner-submit-text');
        const formContainer = document.getElementById('partner-form-container');
        const form = document.getElementById('partner-form');
        
        if (titleEl) titleEl.textContent = 'Add New Partner';
        if (submitEl) submitEl.textContent = 'Create Partner';
        if (form) form.reset();
        if (formContainer) formContainer.classList.add('active');
        
        // Focus first input
        setTimeout(() => {
            const firstInput = document.getElementById('partner-code');
            if (firstInput) firstInput.focus();
        }, 100);
    }

    editPartner(partner) {
        this.currentEditItem = partner;
        this.currentEditType = 'partner';
        
        const titleEl = document.getElementById('partner-form-title');
        const submitEl = document.getElementById('partner-submit-text');
        const formContainer = document.getElementById('partner-form-container');
        
        if (titleEl) titleEl.textContent = 'Edit Partner';
        if (submitEl) submitEl.textContent = 'Update Partner';
        
        // Populate form
        const codeEl = document.getElementById('partner-code');
        const nameEl = document.getElementById('partner-name');
        const typeEl = document.getElementById('integration-type');
        const feeEl = document.getElementById('fee-percentage');
        
        if (codeEl) {
            codeEl.value = partner.partner_code || '';
            codeEl.setAttribute('readonly', true);
        }
        if (nameEl) nameEl.value = partner.partner_name || '';
        if (typeEl) typeEl.value = partner.integration_type || '';
        if (feeEl) feeEl.value = partner.fee_percentage || '';
        
        if (formContainer) formContainer.classList.add('active');
    }

    async handlePartnerSubmit(e) {
        e.preventDefault();
        
        if (this.isLoading) return;
        
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());
        
        // Convert fee_percentage to number
        if (data.fee_percentage) {
            data.fee_percentage = parseFloat(data.fee_percentage);
        }

        try {
            this.setLoading(true);
            
            let response;
            if (this.currentEditItem) {
                // Update partner
                response = await fetch(`/api/v1/admin/partners/${this.currentEditItem.partner_code}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Admin-API-Key': this.getAdminKey()
                    },
                    body: JSON.stringify(data)
                });
            } else {
                // Create partner
                response = await fetch('/api/v1/admin/partners', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Admin-API-Key': this.getAdminKey()
                    },
                    body: JSON.stringify(data)
                });
            }

            if (response.ok) {
                this.showNotification(
                    this.currentEditItem ? 'Partner updated successfully' : 'Partner created successfully',
                    'success'
                );
                this.cancelPartnerForm();
                await this.loadPartners();
            } else {
                const error = await response.json();
                throw new Error(error.error || 'Failed to save partner');
            }
        } catch (error) {
            console.error('Error saving partner:', error);
            this.showNotification(error.message || 'Failed to save partner', 'error');
        } finally {
            this.setLoading(false);
        }
    }

    async deletePartner(partnerCode, partnerId) {
        if (!confirm(`Are you sure you want to delete partner "${partnerCode}"?`)) {
            return;
        }

        try {
            this.setLoading(true);
            
            const response = await fetch(`/api/v1/admin/partners/${partnerCode}`, {
                method: 'DELETE',
                headers: { 'X-Admin-API-Key': this.getAdminKey() }
            });

            if (response.ok) {
                this.showNotification('Partner deleted successfully', 'success');
                await this.loadPartners();
            } else {
                const error = await response.json();
                throw new Error(error.error || 'Failed to delete partner');
            }
        } catch (error) {
            console.error('Error deleting partner:', error);
            this.showNotification(error.message || 'Failed to delete partner', 'error');
        } finally {
            this.setLoading(false);
        }
    }

    cancelPartnerForm() {
        const formContainer = document.getElementById('partner-form-container');
        const form = document.getElementById('partner-form');
        const codeEl = document.getElementById('partner-code');
        
        if (formContainer) formContainer.classList.remove('active');
        if (form) form.reset();
        if (codeEl) codeEl.removeAttribute('readonly');
        
        this.currentEditItem = null;
        this.currentEditType = null;
    }

    // Product Management
    async loadProducts() {
        try {
            this.showLoading('products-tbody');
            
            let products = [];
            try {
                const response = await fetch('/api/v1/admin/products', {
                    headers: { 'X-Admin-API-Key': this.getAdminKey() }
                });
                
                if (response.ok) {
                    const result = await response.json();
                    products = result.data || result || [];
                }
            } catch (error) {
                console.warn('Failed to load products from API, using fallback data');
            }

            // Fallback data
            if (!Array.isArray(products) || products.length === 0) {
                products = [
                    {
                        product_id: 'MOTOR-001',
                        product_name: 'Motor Vehicle Insurance',
                        product_category: 'Motor Insurance',
                        partner_code: 'zimnat',
                        base_premium: 250.00,
                        status: 'ACTIVE'
                    },
                    {
                        product_id: 'HEALTH-001',
                        product_name: 'Health Insurance Plan',
                        product_category: 'Health Insurance',
                        partner_code: 'zimnat',
                        base_premium: 150.00,
                        status: 'ACTIVE'
                    }
                ];
            }

            this.renderProductsTable(products);
        } catch (error) {
            console.error('Error loading products:', error);
            this.showNotification('Failed to load products', 'error');
        }
    }

    renderProductsTable(products) {
        const tbody = document.getElementById('products-tbody');
        if (!tbody) return;
        
        if (!products || products.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; color: var(--text-muted); padding: 2rem;">
                        <i class="fas fa-info-circle"></i>
                        No products found
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = products.map(product => `
            <tr>
                <td><strong>${product.product_id || product.product_code || 'N/A'}</strong></td>
                <td>${product.product_name || 'Unknown'}</td>
                <td><span class="status-badge status-active">${product.product_category || 'N/A'}</span></td>
                <td>${product.partner_code || 'N/A'}</td>
                <td>$${(product.base_premium || 0).toFixed(2)}</td>
                <td>
                    <span class="status-badge ${(product.status || 'ACTIVE') === 'ACTIVE' ? 'status-active' : 'status-inactive'}">
                        ${product.status || 'ACTIVE'}
                    </span>
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-sm btn-secondary" onclick="adminCRUD.editProduct(${JSON.stringify(product).replace(/"/g, '&quot;')})">
                            <i class="fas fa-edit"></i>
                            Edit
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="adminCRUD.deleteProduct('${product.product_id || product.product_code}')">
                            <i class="fas fa-trash"></i>
                            Delete
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    showAddProductForm() {
        this.currentEditItem = null;
        this.currentEditType = 'product';
        
        const titleEl = document.getElementById('product-form-title');
        const submitEl = document.getElementById('product-submit-text');
        const formContainer = document.getElementById('product-form-container');
        const form = document.getElementById('product-form');
        
        if (titleEl) titleEl.textContent = 'Add New Product';
        if (submitEl) submitEl.textContent = 'Create Product';
        if (form) form.reset();
        if (formContainer) formContainer.classList.add('active');
        
        setTimeout(() => {
            const firstInput = document.getElementById('product-code');
            if (firstInput) firstInput.focus();
        }, 100);
    }

    editProduct(product) {
        this.currentEditItem = product;
        this.currentEditType = 'product';
        
        const titleEl = document.getElementById('product-form-title');
        const submitEl = document.getElementById('product-submit-text');
        const formContainer = document.getElementById('product-form-container');
        
        if (titleEl) titleEl.textContent = 'Edit Product';
        if (submitEl) submitEl.textContent = 'Update Product';
        
        // Populate form
        const codeEl = document.getElementById('product-code');
        const nameEl = document.getElementById('product-name');
        const categoryEl = document.getElementById('category-code');
        const partnerEl = document.getElementById('product-partner-code');
        const premiumEl = document.getElementById('base-premium');
        const partialEl = document.getElementById('allow-partial-payment');
        
        if (codeEl) {
            codeEl.value = product.product_id || product.product_code || '';
            codeEl.setAttribute('readonly', true);
        }
        if (nameEl) nameEl.value = product.product_name || '';
        if (categoryEl) categoryEl.value = this.getCategoryCode(product.product_category);
        if (partnerEl) partnerEl.value = product.partner_code || '';
        if (premiumEl) premiumEl.value = product.base_premium || '';
        if (partialEl) partialEl.checked = product.allow_partial_payment || false;
        
        if (formContainer) formContainer.classList.add('active');
    }

    getCategoryCode(categoryName) {
        const categoryMap = {
            'Motor Insurance': 'MOTOR',
            'Health Insurance': 'HEALTH',
            'Travel Insurance': 'TRAVEL',
            'Personal Accident Insurance': 'PERSONAL_ACCIDENT',
            'HCP Insurance': 'HCP'
        };
        return categoryMap[categoryName] || '';
    }

    async handleProductSubmit(e) {
        e.preventDefault();
        
        if (this.isLoading) return;
        
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());
        
        // Convert base_premium to number
        if (data.base_premium) {
            data.base_premium = parseFloat(data.base_premium);
        }
        
        // Convert checkbox to boolean
        data.allow_partial_payment = document.getElementById('allow-partial-payment')?.checked || false;

        try {
            this.setLoading(true);
            
            let response;
            if (this.currentEditItem) {
                // Update product
                response = await fetch(`/api/v1/admin/products/${this.currentEditItem.product_id || this.currentEditItem.product_code}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Admin-API-Key': this.getAdminKey()
                    },
                    body: JSON.stringify(data)
                });
            } else {
                // Create product
                response = await fetch('/api/v1/admin/products', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Admin-API-Key': this.getAdminKey()
                    },
                    body: JSON.stringify(data)
                });
            }

            if (response.ok) {
                this.showNotification(
                    this.currentEditItem ? 'Product updated successfully' : 'Product created successfully',
                    'success'
                );
                this.cancelProductForm();
                await this.loadProducts();
            } else {
                const error = await response.json();
                throw new Error(error.error || 'Failed to save product');
            }
        } catch (error) {
            console.error('Error saving product:', error);
            this.showNotification(error.message || 'Failed to save product', 'error');
        } finally {
            this.setLoading(false);
        }
    }

    async deleteProduct(productId) {
        if (!confirm(`Are you sure you want to delete product "${productId}"?`)) {
            return;
        }

        try {
            this.setLoading(true);
            
            const response = await fetch(`/api/v1/admin/products/${productId}`, {
                method: 'DELETE',
                headers: { 'X-Admin-API-Key': this.getAdminKey() }
            });

            if (response.ok) {
                this.showNotification('Product deleted successfully', 'success');
                await this.loadProducts();
            } else {
                const error = await response.json();
                throw new Error(error.error || 'Failed to delete product');
            }
        } catch (error) {
            console.error('Error deleting product:', error);
            this.showNotification(error.message || 'Failed to delete product', 'error');
        } finally {
            this.setLoading(false);
        }
    }

    cancelProductForm() {
        const formContainer = document.getElementById('product-form-container');
        const form = document.getElementById('product-form');
        const codeEl = document.getElementById('product-code');
        
        if (formContainer) formContainer.classList.remove('active');
        if (form) form.reset();
        if (codeEl) codeEl.removeAttribute('readonly');
        
        this.currentEditItem = null;
        this.currentEditType = null;
    }

    // IP Filter Management
    async loadIpFilters() {
        try {
            this.showLoading('ip-filters-tbody');
            
            let ipFilters = [];
            try {
                const response = await fetch('/api/v1/admin/ip-filters', {
                    headers: { 'X-Admin-API-Key': this.getAdminKey() }
                });
                
                if (response.ok) {
                    const result = await response.json();
                    ipFilters = result.data || result || [];
                }
            } catch (error) {
                console.warn('Failed to load IP filters from API, using fallback data');
            }

            // Fallback data
            if (!Array.isArray(ipFilters) || ipFilters.length === 0) {
                ipFilters = [
                    {
                        id: 1,
                        ip_address: '192.168.1.100',
                        filter_type: 'whitelist',
                        description: 'Office IP',
                        created_at: new Date().toISOString()
                    },
                    {
                        id: 2,
                        ip_address: '10.0.0.5',
                        filter_type: 'blacklist',
                        description: 'Blocked suspicious IP',
                        created_at: new Date().toISOString()
                    }
                ];
            }

            this.renderIpFiltersTable(ipFilters);
        } catch (error) {
            console.error('Error loading IP filters:', error);
            this.showNotification('Failed to load IP filters', 'error');
        }
    }

    renderIpFiltersTable(ipFilters) {
        const tbody = document.getElementById('ip-filters-tbody');
        if (!tbody) return;
        
        if (!ipFilters || ipFilters.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align: center; color: var(--text-muted); padding: 2rem;">
                        <i class="fas fa-info-circle"></i>
                        No IP filters found
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = ipFilters.map(filter => `
            <tr>
                <td><strong>${filter.ip_address || 'N/A'}</strong></td>
                <td>
                    <span class="status-badge ${(filter.filter_type || 'whitelist') === 'whitelist' ? 'status-active' : 'status-inactive'}">
                        ${filter.filter_type || 'whitelist'}
                    </span>
                </td>
                <td>${filter.description || 'No description'}</td>
                <td>${filter.created_at ? new Date(filter.created_at).toLocaleDateString() : 'N/A'}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-sm btn-secondary" onclick="adminCRUD.editIpFilter(${JSON.stringify(filter).replace(/"/g, '&quot;')})">
                            <i class="fas fa-edit"></i>
                            Edit
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="adminCRUD.deleteIpFilter('${filter.ip_address}')">
                            <i class="fas fa-trash"></i>
                            Delete
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    showAddIpFilterForm() {
        this.currentEditItem = null;
        this.currentEditType = 'ip-filter';
        
        const titleEl = document.getElementById('ip-filter-form-title');
        const submitEl = document.getElementById('ip-filter-submit-text');
        const formContainer = document.getElementById('ip-filter-form-container');
        const form = document.getElementById('ip-filter-form');
        
        if (titleEl) titleEl.textContent = 'Add New IP Filter';
        if (submitEl) submitEl.textContent = 'Create IP Filter';
        if (form) form.reset();
        if (formContainer) formContainer.classList.add('active');
        
        setTimeout(() => {
            const firstInput = document.getElementById('ip-address');
            if (firstInput) firstInput.focus();
        }, 100);
    }

    editIpFilter(filter) {
        this.currentEditItem = filter;
        this.currentEditType = 'ip-filter';
        
        const titleEl = document.getElementById('ip-filter-form-title');
        const submitEl = document.getElementById('ip-filter-submit-text');
        const formContainer = document.getElementById('ip-filter-form-container');
        
        if (titleEl) titleEl.textContent = 'Edit IP Filter';
        if (submitEl) submitEl.textContent = 'Update IP Filter';
        
        // Populate form
        const ipEl = document.getElementById('ip-address');
        const typeEl = document.getElementById('filter-type');
        const descEl = document.getElementById('ip-description');
        
        if (ipEl) {
            ipEl.value = filter.ip_address || '';
            ipEl.setAttribute('readonly', true);
        }
        if (typeEl) typeEl.value = filter.filter_type || '';
        if (descEl) descEl.value = filter.description || '';
        
        if (formContainer) formContainer.classList.add('active');
    }

    async handleIpFilterSubmit(e) {
        e.preventDefault();
        
        if (this.isLoading) return;
        
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());

        try {
            this.setLoading(true);
            
            let response;
            if (this.currentEditItem) {
                // Update IP filter
                response = await fetch(`/api/v1/admin/ip-filters/${this.currentEditItem.ip_address}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Admin-API-Key': this.getAdminKey()
                    },
                    body: JSON.stringify(data)
                });
            } else {
                // Create IP filter
                response = await fetch('/api/v1/admin/ip-filters', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Admin-API-Key': this.getAdminKey()
                    },
                    body: JSON.stringify(data)
                });
            }

            if (response.ok) {
                this.showNotification(
                    this.currentEditItem ? 'IP filter updated successfully' : 'IP filter created successfully',
                    'success'
                );
                this.cancelIpFilterForm();
                await this.loadIpFilters();
            } else {
                const error = await response.json();
                throw new Error(error.error || 'Failed to save IP filter');
            }
        } catch (error) {
            console.error('Error saving IP filter:', error);
            this.showNotification(error.message || 'Failed to save IP filter', 'error');
        } finally {
            this.setLoading(false);
        }
    }

    async deleteIpFilter(ipAddress) {
        if (!confirm(`Are you sure you want to delete IP filter for "${ipAddress}"?`)) {
            return;
        }

        try {
            this.setLoading(true);
            
            const response = await fetch(`/api/v1/admin/ip-filters/${encodeURIComponent(ipAddress)}`, {
                method: 'DELETE',
                headers: { 'X-Admin-API-Key': this.getAdminKey() }
            });

            if (response.ok) {
                this.showNotification('IP filter deleted successfully', 'success');
                await this.loadIpFilters();
            } else {
                const error = await response.json();
                throw new Error(error.error || 'Failed to delete IP filter');
            }
        } catch (error) {
            console.error('Error deleting IP filter:', error);
            this.showNotification(error.message || 'Failed to delete IP filter', 'error');
        } finally {
            this.setLoading(false);
        }
    }

    cancelIpFilterForm() {
        const formContainer = document.getElementById('ip-filter-form-container');
        const form = document.getElementById('ip-filter-form');
        const ipEl = document.getElementById('ip-address');
        
        if (formContainer) formContainer.classList.remove('active');
        if (form) form.reset();
        if (ipEl) ipEl.removeAttribute('readonly');
        
        this.currentEditItem = null;
        this.currentEditType = null;
    }

    // Utility Functions
    getAdminKey() {
        return localStorage.getItem('adminApiKey') || 'supersecret-admin-key-123';
    }

    setLoading(loading) {
        this.isLoading = loading;
        const forms = document.querySelectorAll('form');
        const buttons = document.querySelectorAll('button:not(.notification button)');
        
        if (loading) {
            forms.forEach(form => form.classList.add('loading'));
            buttons.forEach(btn => btn.disabled = true);
        } else {
            forms.forEach(form => form.classList.remove('loading'));
            buttons.forEach(btn => btn.disabled = false);
        }
    }

    showLoading(tbodyId) {
        const tbody = document.getElementById(tbodyId);
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="10" style="text-align: center; padding: 2rem;">
                        <i class="fas fa-spinner fa-spin"></i>
                        Loading...
                    </td>
                </tr>
            `;
        }
    }

    showNotification(message, type = 'info') {
        // Remove existing notifications
        document.querySelectorAll('.notification').forEach(n => n.remove());

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
            <i class="fas fa-${iconMap[type]}"></i>
            <span>${message}</span>
            <button onclick="this.parentElement.remove()" style="background: none; border: none; color: inherit; margin-left: auto; cursor: pointer;">
                <i class="fas fa-times"></i>
            </button>
        `;

        document.body.appendChild(notification);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (notification.parentElement) {
                notification.style.animation = 'slideInRight 0.3s ease-out reverse';
                setTimeout(() => notification.remove(), 300);
            }
        }, 5000);
    }

    cancelAllForms() {
        this.cancelPartnerForm();
        this.cancelProductForm();
        this.cancelIpFilterForm();
    }

    async refreshAllData() {
        try {
            this.setLoading(true);
            await this.loadInitialData();
            this.showNotification('All data refreshed successfully', 'success');
        } catch (error) {
            console.error('Error refreshing data:', error);
            this.showNotification('Failed to refresh data', 'error');
        } finally {
            this.setLoading(false);
        }
    }
}

// Global functions for HTML onclick handlers
function switchTab(tabName) {
    if (window.adminCRUD) {
        window.adminCRUD.switchTab(tabName);
    }
}

function refreshAllData() {
    if (window.adminCRUD) {
        window.adminCRUD.refreshAllData();
    }
}

function searchTable(tableId, searchTerm) {
    const table = document.getElementById(tableId);
    if (!table) return;
    
    const rows = table.querySelectorAll('tbody tr');
    
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        if (text.includes(searchTerm.toLowerCase())) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    try {
        window.adminCRUD = new AdminCRUD();
        console.log('Admin CRUD interface loaded successfully');
    } catch (error) {
        console.error('Failed to initialize Admin CRUD:', error);
    }
});

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AdminCRUD;
}