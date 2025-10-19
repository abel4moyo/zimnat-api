-- =============================================================================
-- POLICY LOOKUP VIEW FOR PAYMENT INTEGRATION (FIXED VERSION)
-- File: database/views/policy_lookup_view.sql
-- Description: Comprehensive view for fetching policy details for payment initiation
-- =============================================================================

CREATE OR ALTER VIEW vw_PolicyLookup AS
SELECT 
    -- Policy Identification
    p.PolicyNumber,
    p.PolicyId,
    p.CertificateNumber,
    
    -- Customer Information
    CONCAT(c.FirstName, ' ', ISNULL(c.MiddleName + ' ', ''), c.LastName) AS CustomerName,
    c.CustomerId,
    c.IdNumber,
    c.Email,
    c.MobileNumber,
    c.PhysicalAddress,
    
    -- Product Information
    pr.ProductName,
    pr.ProductCode,
    pr.ProductCategory,
    
    -- Policy Coverage Details
    p.RiskInsured,
    p.CoverDescription AS DescriptionOfCover,
    p.SumInsured,
    p.CoverTerm,
    
    -- Policy Dates and Status
    p.PolicyStartDate,
    p.PolicyEndDate,
    p.PolicyStatus,
    p.RenewalDate,
    
    -- Premium Information
    p.AnnualPremium,
    p.MonthlyPremium,
    p.PremiumFrequency,
    
    -- Outstanding Premium Details
    pp.PremiumAmount,
    pp.PremiumDueDate,
    pp.PremiumStatus,
    pp.InvoiceNumber,
    pp.PaymentReference,
    
    -- Payment Mapping Fields
    CASE 
        WHEN pp.InvoiceNumber IS NOT NULL THEN pp.InvoiceNumber
        WHEN p.PolicyNumber IS NOT NULL THEN 'POL-' + p.PolicyNumber
        ELSE 'REF-' + CAST(p.PolicyId AS VARCHAR(20))
    END AS PaymentMappingReference,
    
    -- Calculated Fields
    DATEDIFF(DAY, GETDATE(), pp.PremiumDueDate) AS DaysUntilDue,
    
    CASE 
        WHEN pp.PremiumDueDate < GETDATE() THEN 'OVERDUE'
        WHEN DATEDIFF(DAY, GETDATE(), pp.PremiumDueDate) <= 30 THEN 'DUE_SOON'
        ELSE 'CURRENT'
    END AS PaymentUrgency,
    
    -- Broker/Agent Information (if applicable)
    b.BrokerName,
    b.BrokerCode,
    
    -- Branch Information
    br.BranchName,
    br.BranchCode,
    
    -- Additional Policy Details
    p.DeductibleAmount,
    p.CommissionRate,
    p.TotalCommission,
    
    -- Timestamps
    p.CreatedDate,
    p.LastModifiedDate,
    pp.LastPaymentDate,
    
    -- Risk Location (for specific products like property)
    CASE 
        WHEN pr.ProductCategory = 'Property' THEN pd.RiskLocation
        WHEN pr.ProductCategory = 'Motor' THEN pd.VehicleRegistration
        WHEN pr.ProductCategory = 'Aviation' THEN pd.AircraftRegistration
        ELSE NULL
    END AS RiskLocation

FROM Policies p
    INNER JOIN Customers c ON p.CustomerId = c.CustomerId
    INNER JOIN Products pr ON p.ProductId = pr.ProductId
    LEFT JOIN PolicyPremiums pp ON p.PolicyId = pp.PolicyId 
        AND pp.PremiumStatus IN ('OUTSTANDING', 'OVERDUE', 'PENDING')
    LEFT JOIN Brokers b ON p.BrokerId = b.BrokerId
    LEFT JOIN Branches br ON p.BranchId = br.BranchId
    LEFT JOIN PolicyDetails pd ON p.PolicyId = pd.PolicyId

WHERE 
    p.PolicyStatus IN ('ACTIVE', 'LAPSED', 'SUSPENDED')
    AND (pp.PremiumAmount > 0 OR p.AnnualPremium > 0);

GO

-- =============================================================================
-- PERFORMANCE INDEXES (Applied to Base Tables, NOT the View)
-- =============================================================================

-- These indexes should be created on the underlying tables for better view performance

-- Customer table indexes (if not already exist)
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Customers_IdNumber')
CREATE NONCLUSTERED INDEX IX_Customers_IdNumber ON Customers(IdNumber);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Customers_Email')
CREATE NONCLUSTERED INDEX IX_Customers_Email ON Customers(Email);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Customers_Mobile')
CREATE NONCLUSTERED INDEX IX_Customers_Mobile ON Customers(MobileNumber);

-- Policy table indexes (if not already exist)
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Policies_PolicyNumber')
CREATE NONCLUSTERED INDEX IX_Policies_PolicyNumber ON Policies(PolicyNumber);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Policies_Status')
CREATE NONCLUSTERED INDEX IX_Policies_Status ON Policies(PolicyStatus);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Policies_CustomerId')
CREATE NONCLUSTERED INDEX IX_Policies_CustomerId ON Policies(CustomerId);

-- PolicyPremiums table indexes (if not already exist)
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_PolicyPremiums_Status')
CREATE NONCLUSTERED INDEX IX_PolicyPremiums_Status ON PolicyPremiums(PremiumStatus);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_PolicyPremiums_DueDate')
CREATE NONCLUSTERED INDEX IX_PolicyPremiums_DueDate ON PolicyPremiums(PremiumDueDate);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_PolicyPremiums_PolicyId')
CREATE NONCLUSTERED INDEX IX_PolicyPremiums_PolicyId ON PolicyPremiums(PolicyId);

-- Product table indexes (if not already exist)
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Products_Category')
CREATE NONCLUSTERED INDEX IX_Products_Category ON Products(ProductCategory);

GO

-- =============================================================================
-- VIEW TESTING QUERIES
-- =============================================================================

-- Test 1: Basic functionality - Your 9 original requirements
PRINT 'Test 1: Basic Policy Details (Your Original 9 Requirements)';
SELECT TOP 10
    CustomerName,                    -- 1. Customer Name
    ProductName,                     -- 2. Product Name  
    RiskInsured,                     -- 3. Risk Insured
    DescriptionOfCover,              -- 4. Description of cover
    CoverTerm,                       -- 5. CoverTerm
    PremiumAmount,                   -- 6. Premium Amount
    PremiumDueDate,                  -- 7. Premium due date
    PolicyStatus,                    -- 8. Policy Status
    InvoiceNumber                    -- 9. Invoice number (payment mapping)
FROM vw_PolicyLookup 
WHERE PremiumAmount IS NOT NULL
ORDER BY PremiumDueDate;

-- Test 2: Aviation policies (your example product)
PRINT 'Test 2: Aviation Policies';
SELECT 
    CustomerName,
    ProductName,
    RiskLocation AS AircraftRegistration,
    SumInsured,
    PremiumAmount,
    PolicyStatus,
    PaymentMappingReference
FROM vw_PolicyLookup 
WHERE ProductCategory = 'Aviation';

-- Test 3: Overdue payments
PRINT 'Test 3: Overdue Payments';
SELECT 
    CustomerName,
    PolicyNumber,
    PremiumAmount,
    PremiumDueDate,
    DaysUntilDue,
    PaymentUrgency
FROM vw_PolicyLookup 
WHERE PaymentUrgency = 'OVERDUE'
ORDER BY PremiumDueDate;

-- Test 4: Payment urgency distribution
PRINT 'Test 4: Payment Urgency Distribution';
SELECT 
    PaymentUrgency,
    COUNT(*) as PolicyCount,
    SUM(PremiumAmount) as TotalPremium
FROM vw_PolicyLookup 
GROUP BY PaymentUrgency
ORDER BY PolicyCount DESC;

-- Test 5: Customer lookup by different identifiers
PRINT 'Test 5: Customer Lookup Tests';

-- By ID Number
SELECT TOP 3 'ID Number Search' as SearchType, CustomerName, IdNumber, PolicyNumber, PremiumAmount 
FROM vw_PolicyLookup WHERE IdNumber LIKE '63-%';

-- By Mobile Number  
SELECT TOP 3 'Mobile Search' as SearchType, CustomerName, MobileNumber, PolicyNumber, PremiumAmount 
FROM vw_PolicyLookup WHERE MobileNumber LIKE '+2637%';

-- By Email
SELECT TOP 3 'Email Search' as SearchType, CustomerName, Email, PolicyNumber, PremiumAmount 
FROM vw_PolicyLookup WHERE Email LIKE '%.com';

PRINT '';
PRINT '=== SAMPLE QUERIES FOR YOUR APPLICATION ===';
PRINT '';
PRINT '-- Find policies by customer ID number';
PRINT 'SELECT * FROM vw_PolicyLookup WHERE IdNumber = ''63-1234567-A-01'' ORDER BY PremiumDueDate;';
PRINT '';
PRINT '-- Find overdue policies';
PRINT 'SELECT * FROM vw_PolicyLookup WHERE PaymentUrgency = ''OVERDUE'' ORDER BY PremiumDueDate;';
PRINT '';
PRINT '-- Find policies by product type';
PRINT 'SELECT * FROM vw_PolicyLookup WHERE ProductName LIKE ''%Aviation%'' AND PolicyStatus = ''ACTIVE'';';
PRINT '';
PRINT '-- Find policies by mobile number';
PRINT 'SELECT * FROM vw_PolicyLookup WHERE MobileNumber = ''+263771234567'';';
PRINT '';
PRINT '-- Find policies with specific payment reference';
PRINT 'SELECT * FROM vw_PolicyLookup WHERE PaymentMappingReference = ''INV2024000001'';';
PRINT '';
PRINT '✅ View created successfully and ready for use!';
PRINT '✅ All your 9 original requirements are supported';
PRINT '✅ Indexes created on base tables for optimal performance';
PRINT '✅ Sample test queries provided above';