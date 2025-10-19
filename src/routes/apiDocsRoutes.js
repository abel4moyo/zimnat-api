// Add this to your main routes file or create a new apiDocsRoutes.js

const express = require('express');
const router = express.Router();

router.get('/api-docs', (req, res) => {
  const apiDocsHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>API Documentation - Enterprise Command Center</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@300;400;500&display=swap" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css" rel="stylesheet">
    <style>
        :root {
            --primary: #1a2332;
            --secondary: #2c3e50;
            --accent: #3498db;
            --success: #27ae60;
            --warning: #f39c12;
            --danger: #e74c3c;
            --bg-primary: linear-gradient(135deg, #0f1419 0%, #1a2332 50%, #2c3e50 100%);
            --bg-card: linear-gradient(145deg, rgba(26, 35, 50, 0.9), rgba(44, 62, 80, 0.7));
            --text-primary: #ffffff;
            --text-secondary: rgba(255, 255, 255, 0.8);
            --text-muted: rgba(255, 255, 255, 0.6);
            --border-primary: rgba(52, 152, 219, 0.3);
            --border-secondary: rgba(255, 255, 255, 0.1);
            --shadow-primary: 0 20px 40px rgba(0, 0, 0, 0.3);
            --shadow-secondary: 0 10px 20px rgba(0, 0, 0, 0.2);
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Inter', sans-serif;
            background: var(--bg-primary);
            color: var(--text-primary);
            min-height: 100vh;
            line-height: 1.6;
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 2rem;
        }

        .header {
            text-align: center;
            margin-bottom: 3rem;
            padding: 2rem 0;
            border-bottom: 1px solid var(--border-secondary);
        }

        .header h1 {
            font-size: 2.5rem;
            font-weight: 700;
            background: linear-gradient(135deg, var(--text-primary), var(--accent));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            margin-bottom: 0.5rem;
        }

        .header p {
            font-size: 1.1rem;
            color: var(--text-secondary);
        }

        .back-button {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.75rem 1.5rem;
            background: var(--bg-card);
            border: 1px solid var(--border-primary);
            border-radius: 8px;
            color: var(--text-primary);
            text-decoration: none;
            font-weight: 500;
            transition: all 0.3s ease;
            margin-bottom: 2rem;
        }

        .back-button:hover {
            transform: translateY(-2px);
            box-shadow: var(--shadow-secondary);
        }

        .endpoint-section {
            margin-bottom: 3rem;
        }

        .section-title {
            display: flex;
            align-items: center;
            gap: 1rem;
            font-size: 1.5rem;
            font-weight: 600;
            margin-bottom: 1.5rem;
            color: var(--text-primary);
        }

        .section-title i {
            color: var(--accent);
        }

        .endpoint-card {
            background: var(--bg-card);
            border: 1px solid var(--border-secondary);
            border-radius: 12px;
            padding: 1.5rem;
            margin-bottom: 1rem;
            backdrop-filter: blur(20px);
            box-shadow: var(--shadow-secondary);
            transition: all 0.3s ease;
        }

        .endpoint-card:hover {
            transform: translateY(-2px);
            border-color: var(--border-primary);
            box-shadow: var(--shadow-primary);
        }

        .endpoint-header {
            display: flex;
            align-items: center;
            gap: 1rem;
            margin-bottom: 1rem;
        }

        .method-badge {
            padding: 0.25rem 0.75rem;
            border-radius: 4px;
            font-size: 0.75rem;
            font-weight: 600;
            text-transform: uppercase;
            font-family: 'JetBrains Mono', monospace;
        }

        .method-get {
            background: rgba(39, 174, 96, 0.2);
            color: var(--success);
            border: 1px solid rgba(39, 174, 96, 0.3);
        }

        .method-post {
            background: rgba(52, 152, 219, 0.2);
            color: var(--accent);
            border: 1px solid rgba(52, 152, 219, 0.3);
        }

        .method-delete {
            background: rgba(231, 76, 60, 0.2);
            color: var(--danger);
            border: 1px solid rgba(231, 76, 60, 0.3);
        }

        .endpoint-path {
            font-family: 'JetBrains Mono', monospace;
            font-size: 1.1rem;
            color: var(--text-primary);
            font-weight: 500;
        }

        .endpoint-description {
            color: var(--text-secondary);
            margin-bottom: 1rem;
        }

        .endpoint-details {
            display: grid;
            gap: 1rem;
        }

        .detail-section {
            background: rgba(255, 255, 255, 0.02);
            border-radius: 8px;
            padding: 1rem;
            border: 1px solid var(--border-secondary);
        }

        .detail-title {
            font-size: 0.875rem;
            font-weight: 600;
            color: var(--accent);
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-bottom: 0.5rem;
        }

        .code-block {
            background: rgba(0, 0, 0, 0.3);
            border: 1px solid var(--border-secondary);
            border-radius: 6px;
            padding: 1rem;
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.875rem;
            color: var(--text-secondary);
            overflow-x: auto;
            white-space: pre;
        }

        .auth-required {
            background: rgba(243, 156, 18, 0.1);
            border: 1px solid rgba(243, 156, 18, 0.3);
            border-radius: 6px;
            padding: 0.75rem;
            margin-top: 0.5rem;
            color: var(--warning);
            font-size: 0.875rem;
        }

        .grid-2 {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 1rem;
        }

        @media (max-width: 768px) {
            .container {
                padding: 1rem;
            }
            
            .grid-2 {
                grid-template-columns: 1fr;
            }
            
            .endpoint-header {
                flex-direction: column;
                align-items: flex-start;
                gap: 0.5rem;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <a href="/dashboard" class="back-button">
            <i class="fas fa-arrow-left"></i>
            Back to Dashboard
        </a>

        <div class="header">
            <h1>API Documentation</h1>
            <p>Enterprise Command Center - Multi-Partner Integration Platform</p>
        </div>

        <!-- Public Endpoints -->
        <div class="endpoint-section">
            <h2 class="section-title">
                <i class="fas fa-globe"></i>
                Public Endpoints
            </h2>

            <div class="endpoint-card">
                <div class="endpoint-header">
                    <span class="method-badge method-get">GET</span>
                    <span class="endpoint-path">/</span>
                </div>
                <div class="endpoint-description">
                    Get API information and available endpoints
                </div>
                <div class="endpoint-details">
                    <div class="detail-section">
                        <div class="detail-title">Response</div>
                        <div class="code-block">{
  "success": true,
  "message": "🏦 FCB Multi-Partner Integration API",
  "version": "3.0.0",
  "status": "running",
  "endpoints": { ... }
}</div>
                    </div>
                </div>
            </div>

            <div class="endpoint-card">
                <div class="endpoint-header">
                    <span class="method-badge method-get">GET</span>
                    <span class="endpoint-path">/health</span>
                </div>
                <div class="endpoint-description">
                    Check system health and status
                </div>
                <div class="endpoint-details">
                    <div class="detail-section">
                        <div class="detail-title">Response</div>
                        <div class="code-block">{
  "status": "healthy",
  "timestamp": "2025-07-30T13:20:15.848Z",
  "version": "3.0.0",
  "uptime": 86400,
  "database": "connected"
}</div>
                    </div>
                </div>
            </div>

            <div class="endpoint-card">
                <div class="endpoint-header">
                    <span class="method-badge method-get">GET</span>
                    <span class="endpoint-path">/dashboard</span>
                </div>
                <div class="endpoint-description">
                    Access the enterprise dashboard interface
                </div>
                <div class="endpoint-details">
                    <div class="detail-section">
                        <div class="detail-title">Response</div>
                        <div class="code-block">Returns HTML dashboard interface with real-time metrics</div>
                    </div>
                </div>
            </div>
        </div>

        <!-- API v1 Endpoints -->
        <div class="endpoint-section">
            <h2 class="section-title">
                <i class="fas fa-code"></i>
                API v1 Endpoints
            </h2>

            <div class="endpoint-card">
                <div class="endpoint-header">
                    <span class="method-badge method-post">POST</span>
                    <span class="endpoint-path">/api/v1/policy/lookup</span>
                </div>
                <div class="endpoint-description">
                    Look up policy information by policy number or vehicle registration
                </div>
                <div class="endpoint-details">
                    <div class="grid-2">
                        <div class="detail-section">
                            <div class="detail-title">Request Body</div>
                            <div class="code-block">{
  "policyNumber": "POL123456",
  "vrn": "ABC123ZW",
  "customerReference": "CUST001"
}</div>
                        </div>
                        <div class="detail-section">
                            <div class="detail-title">Response</div>
                            <div class="code-block">{
  "success": true,
  "data": {
    "policyNumber": "POL123456",
    "customerName": "John Doe",
    "premiumAmount": 1250.00,
    "status": "ACTIVE"
  }
}</div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="endpoint-card">
                <div class="endpoint-header">
                    <span class="method-badge method-post">POST</span>
                    <span class="endpoint-path">/api/v1/payment/process</span>
                </div>
                <div class="endpoint-description">
                    Process a payment for a policy
                </div>
                <div class="endpoint-details">
                    <div class="grid-2">
                        <div class="detail-section">
                            <div class="detail-title">Request Body</div>
                            <div class="code-block">{
  "policyNumber": "POL123456",
  "amount": 1250.00,
  "paymentMethod": "CARD",
  "bankReference": "TXN789012"
}</div>
                        </div>
                        <div class="detail-section">
                            <div class="detail-title">Response</div>
                            <div class="code-block">{
  "success": true,
  "data": {
    "transactionId": "TXN789012",
    "status": "SUCCESS",
    "receiptNumber": "REC456789"
  }
}</div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="endpoint-card">
                <div class="endpoint-header">
                    <span class="method-badge method-get">GET</span>
                    <span class="endpoint-path">/api/v1/payment/status/:id</span>
                </div>
                <div class="endpoint-description">
                    Check the status of a payment transaction
                </div>
                <div class="endpoint-details">
                    <div class="detail-section">
                        <div class="detail-title">Response</div>
                        <div class="code-block">{
  "success": true,
  "data": {
    "transactionId": "TXN789012",
    "status": "SUCCESS",
    "amount": 1250.00,
    "processedAt": "2025-07-30T13:20:15.848Z"
  }
}</div>
                    </div>
                </div>
            </div>

            <div class="endpoint-card">
                <div class="endpoint-header">
                    <span class="method-badge method-get">GET</span>
                    <span class="endpoint-path">/api/v1/customers</span>
                </div>
                <div class="endpoint-description">
                    Retrieve customer information
                </div>
                <div class="endpoint-details">
                    <div class="detail-section">
                        <div class="detail-title">Query Parameters</div>
                        <div class="code-block">?page=1&limit=10&search=john</div>
                    </div>
                </div>
            </div>

            <div class="endpoint-card">
                <div class="endpoint-header">
                    <span class="method-badge method-get">GET</span>
                    <span class="endpoint-path">/api/v1/transactions</span>
                </div>
                <div class="endpoint-description">
                    Retrieve transaction history
                </div>
                <div class="endpoint-details">
                    <div class="detail-section">
                        <div class="detail-title">Query Parameters</div>
                        <div class="code-block">?page=1&limit=10&status=SUCCESS&date_from=2025-01-01</div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Admin Endpoints -->
        <div class="endpoint-section">
            <h2 class="section-title">
                <i class="fas fa-shield-alt"></i>
                Admin Endpoints
            </h2>

            <div class="endpoint-card">
                <div class="endpoint-header">
                    <span class="method-badge method-post">POST</span>
                    <span class="endpoint-path">/api/v1/admin/partners</span>
                </div>
                <div class="endpoint-description">
                    Create a new integration partner
                </div>
                <div class="auth-required">
                    <i class="fas fa-key"></i> Requires Admin API Key
                </div>
                <div class="endpoint-details">
                    <div class="grid-2">
                        <div class="detail-section">
                            <div class="detail-title">Headers</div>
                            <div class="code-block">X-Admin-API-Key: your-admin-key</div>
                        </div>
                        <div class="detail-section">
                            <div class="detail-title">Request Body</div>
                            <div class="code-block">{
  "partner_code": "NEWBANK",
  "partner_name": "New Bank Ltd",
  "integration_type": "banking",
  "fee_percentage": 0.02
}</div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="endpoint-card">
                <div class="endpoint-header">
                    <span class="method-badge method-post">POST</span>
                    <span class="endpoint-path">/api/v1/admin/ip-filter</span>
                </div>
                <div class="endpoint-description">
                    Add IP address to whitelist or blacklist
                </div>
                <div class="auth-required">
                    <i class="fas fa-key"></i> Requires Admin API Key
                </div>
                <div class="endpoint-details">
                    <div class="grid-2">
                        <div class="detail-section">
                            <div class="detail-title">Headers</div>
                            <div class="code-block">X-Admin-API-Key: your-admin-key</div>
                        </div>
                        <div class="detail-section">
                            <div class="detail-title">Request Body</div>
                            <div class="code-block">{
  "ip_address": "192.168.1.100",
  "filter_type": "whitelist",
  "description": "Office IP"
}</div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="endpoint-card">
                <div class="endpoint-header">
                    <span class="method-badge method-delete">DELETE</span>
                    <span class="endpoint-path">/api/v1/admin/ip-filter/:ipAddress</span>
                </div>
                <div class="endpoint-description">
                    Remove IP address from filters
                </div>
                <div class="auth-required">
                    <i class="fas fa-key"></i> Requires Admin API Key
                </div>
            </div>
        </div>

        <!-- Error Responses -->
        <div class="endpoint-section">
            <h2 class="section-title">
                <i class="fas fa-exclamation-triangle"></i>
                Error Responses
            </h2>

            <div class="endpoint-card">
                <div class="endpoint-description">
                    All endpoints return standardized error responses
                </div>
                <div class="endpoint-details">
                    <div class="detail-section">
                        <div class="detail-title">Error Response Format</div>
                        <div class="code-block">{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE",
  "timestamp": "2025-07-30T13:20:15.848Z"
}</div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</body>
</html>
  `;

  res.send(apiDocsHTML);
});

module.exports = router;