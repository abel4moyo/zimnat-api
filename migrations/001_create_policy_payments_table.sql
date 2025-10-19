-- =============================================================================
-- POLICY PAYMENTS TABLE MIGRATION
-- PostgreSQL migration for policy payment tracking
-- =============================================================================

-- Create policy_payments table
CREATE TABLE IF NOT EXISTS policy_payments (
    id SERIAL PRIMARY KEY,
    
    -- Policy Information
    policy_number VARCHAR(100) NOT NULL,
    policy_holder_name VARCHAR(255),
    product_category VARCHAR(100),
    insurance_type VARCHAR(20) CHECK (insurance_type IN ('Life', 'General')),
    
    -- Payment Details
    payment_reference VARCHAR(150) NOT NULL UNIQUE,
    transaction_id VARCHAR(150),
    amount DECIMAL(15,2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(3) NOT NULL CHECK (currency IN ('USD', 'ZIG')),
    payment_method VARCHAR(30) NOT NULL,
    payment_status VARCHAR(20) NOT NULL DEFAULT 'INITIATED' 
        CHECK (payment_status IN ('INITIATED', 'PENDING', 'SUCCESS', 'FAILED', 'EXPIRED', 'CANCELLED')),
    
    -- Customer Details
    customer_name VARCHAR(255),
    customer_email VARCHAR(150),
    customer_phone VARCHAR(30),
    
    -- Technical Details
    database_source VARCHAR(20) NOT NULL CHECK (database_source IN ('ZIMNATUSD', 'ZIMNATZIG')),
    partner_id INTEGER REFERENCES partners(id) ON DELETE SET NULL,
    
    -- URLs
    return_url TEXT,
    callback_url TEXT,
    
    -- Gateway Information
    payment_gateway VARCHAR(50),
    gateway_reference VARCHAR(150),
    gateway_response JSONB,
    
    -- Timestamps
    initiated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    paid_at TIMESTAMP WITH TIME ZONE,
    callback_received_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    
    -- Audit Fields
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by VARCHAR(100) DEFAULT 'API',
    
    -- Additional Information
    notes TEXT,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_policy_payments_policy_number ON policy_payments(policy_number);
CREATE INDEX IF NOT EXISTS idx_policy_payments_payment_reference ON policy_payments(payment_reference);
CREATE INDEX IF NOT EXISTS idx_policy_payments_transaction_id ON policy_payments(transaction_id);
CREATE INDEX IF NOT EXISTS idx_policy_payments_status ON policy_payments(payment_status);
CREATE INDEX IF NOT EXISTS idx_policy_payments_currency ON policy_payments(currency);
CREATE INDEX IF NOT EXISTS idx_policy_payments_initiated_at ON policy_payments(initiated_at DESC);
CREATE INDEX IF NOT EXISTS idx_policy_payments_paid_at ON policy_payments(paid_at DESC);
CREATE INDEX IF NOT EXISTS idx_policy_payments_customer_email ON policy_payments(customer_email);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic updated_at
DROP TRIGGER IF EXISTS update_policy_payments_updated_at ON policy_payments;
CREATE TRIGGER update_policy_payments_updated_at
    BEFORE UPDATE ON policy_payments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create payment status change log table
CREATE TABLE IF NOT EXISTS payment_status_log (
    id SERIAL PRIMARY KEY,
    payment_id INTEGER NOT NULL REFERENCES policy_payments(id) ON DELETE CASCADE,
    old_status VARCHAR(20),
    new_status VARCHAR(20) NOT NULL,
    change_reason VARCHAR(255),
    changed_by VARCHAR(100) DEFAULT 'API',
    changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    additional_data JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_payment_status_log_payment_id ON payment_status_log(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_status_log_changed_at ON payment_status_log(changed_at DESC);

-- Create trigger for payment status change logging
CREATE OR REPLACE FUNCTION log_payment_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.payment_status != NEW.payment_status THEN
        INSERT INTO payment_status_log (
            payment_id,
            old_status,
            new_status,
            change_reason,
            changed_by
        ) VALUES (
            NEW.id,
            OLD.payment_status,
            NEW.payment_status,
            COALESCE(NEW.notes, 'Status change via API'),
            COALESCE(NEW.created_by, 'API')
        );
        
        -- Update paid_at timestamp when payment is successful
        IF NEW.payment_status = 'SUCCESS' AND OLD.payment_status != 'SUCCESS' THEN
            NEW.paid_at = NOW();
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS log_payment_status_change_trigger ON policy_payments;
CREATE TRIGGER log_payment_status_change_trigger
    BEFORE UPDATE ON policy_payments
    FOR EACH ROW
    EXECUTE FUNCTION log_payment_status_change();

-- Create views for reporting
CREATE OR REPLACE VIEW policy_payment_summary AS
SELECT 
    currency,
    payment_status,
    insurance_type,
    database_source,
    COUNT(*) as payment_count,
    SUM(amount) as total_amount,
    AVG(amount) as average_amount,
    MIN(initiated_at) as first_payment,
    MAX(initiated_at) as last_payment
FROM policy_payments
GROUP BY currency, payment_status, insurance_type, database_source;

-- Create view for successful payments
CREATE OR REPLACE VIEW successful_policy_payments AS
SELECT 
    pp.*,
    (paid_at - initiated_at) as payment_duration
FROM policy_payments pp
WHERE payment_status = 'SUCCESS';

-- Grant permissions (adjust as needed for your user)
-- GRANT SELECT, INSERT, UPDATE ON policy_payments TO your_app_user;
-- GRANT SELECT, INSERT ON payment_status_log TO your_app_user;
-- GRANT SELECT ON policy_payment_summary, successful_policy_payments TO your_app_user;

-- Insert comment for documentation
COMMENT ON TABLE policy_payments IS 'Tracks policy payments from MSSQL policy lookups, storing payment information locally in PostgreSQL for better reliability and performance';
COMMENT ON COLUMN policy_payments.payment_reference IS 'Unique payment reference generated by the application, used to track payments across systems';
COMMENT ON COLUMN policy_payments.database_source IS 'Source database from MSSQL (ZIMNATUSD or ZIMNATZIG)';
COMMENT ON COLUMN policy_payments.gateway_response IS 'Full JSON response from the payment gateway for debugging and reconciliation';
COMMENT ON COLUMN policy_payments.metadata IS 'Additional flexible data storage for future requirements';

SELECT 'Policy payments table and related structures created successfully!' as result;