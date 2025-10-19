// =============================================================================
// PAYMENT METHODS UPDATE FOR MSSQL POLICY SERVICE
// Additional methods to be added to mssqlPolicyService.js
// =============================================================================

// Add these methods to the MSSQLPolicyService class:

/**
 * Record a new payment initiation
 */
async recordPaymentInitiation(policyData, paymentData, currency) {
  try {
    if (!this.isConnected[currency] || !this.pools[currency]) {
      throw new Error(`Database not connected for ${currency}`);
    }

    const request = this.pools[currency].request();
    
    const insertQuery = `
      INSERT INTO policy_payments (
        policy_number,
        payment_reference,
        amount,
        currency,
        payment_method,
        payment_status,
        customer_name,
        customer_email,
        customer_phone,
        insurance_type,
        product_category,
        return_url,
        callback_url,
        initiated_at
      ) VALUES (
        @policyNumber,
        @paymentReference,
        @amount,
        @currency,
        @paymentMethod,
        @paymentStatus,
        @customerName,
        @customerEmail,
        @customerPhone,
        @insuranceType,
        @productCategory,
        @returnUrl,
        @callbackUrl,
        GETDATE()
      )
    `;

    request.input('policyNumber', sql.VarChar(50), policyData.policy_number);
    request.input('paymentReference', sql.VarChar(100), paymentData.paymentReference);
    request.input('amount', sql.Decimal(15, 2), paymentData.amount);
    request.input('currency', sql.VarChar(3), currency);
    request.input('paymentMethod', sql.VarChar(20), paymentData.paymentMethod);
    request.input('paymentStatus', sql.VarChar(20), 'INITIATED');
    request.input('customerName', sql.VarChar(200), policyData.policy_holder_name);
    request.input('customerEmail', sql.VarChar(100), paymentData.customerDetails?.email || null);
    request.input('customerPhone', sql.VarChar(20), paymentData.customerDetails?.phone || policyData.mobile);
    request.input('insuranceType', sql.VarChar(20), policyData.insurance_type);
    request.input('productCategory', sql.VarChar(100), policyData.product_category);
    request.input('returnUrl', sql.VarChar(500), paymentData.returnUrl || null);
    request.input('callbackUrl', sql.VarChar(500), paymentData.callbackUrl || null);

    await request.query(insertQuery);

    logger.info('Payment initiation recorded', {
      policyNumber: policyData.policy_number,
      paymentReference: paymentData.paymentReference,
      amount: paymentData.amount,
      currency
    });

    return {
      success: true,
      message: 'Payment initiation recorded successfully'
    };

  } catch (error) {
    logger.error('Error recording payment initiation', {
      error: error.message,
      policyNumber: policyData.policy_number,
      paymentReference: paymentData.paymentReference,
      currency
    });
    
    // Don't throw error - payment can still proceed even if recording fails
    return {
      success: false,
      message: 'Payment initiation recording failed',
      error: error.message
    };
  }
},

/**
 * Update payment status after callback
 */
async updatePaymentStatus(paymentReference, callbackData, currency) {
  try {
    if (!this.isConnected[currency] || !this.pools[currency]) {
      throw new Error(`Database not connected for ${currency}`);
    }

    const request = this.pools[currency].request();
    
    const updateQuery = `
      UPDATE policy_payments 
      SET 
        payment_status = @paymentStatus,
        transaction_id = @transactionId,
        completed_at = CASE WHEN @paymentStatus = 'SUCCESS' THEN GETDATE() ELSE completed_at END,
        callback_received_at = GETDATE(),
        gateway_response = @gatewayResponse,
        updated_at = GETDATE()
      WHERE payment_reference = @paymentReference
    `;

    request.input('paymentReference', sql.VarChar(100), paymentReference);
    request.input('paymentStatus', sql.VarChar(20), callbackData.status);
    request.input('transactionId', sql.VarChar(100), callbackData.transactionId || null);
    request.input('gatewayResponse', sql.NVarChar(sql.MAX), JSON.stringify(callbackData));

    const result = await request.query(updateQuery);

    logger.info('Payment status updated', {
      paymentReference,
      status: callbackData.status,
      transactionId: callbackData.transactionId,
      rowsAffected: result.rowsAffected[0],
      currency
    });

    return {
      success: true,
      message: 'Payment status updated successfully',
      rowsUpdated: result.rowsAffected[0]
    };

  } catch (error) {
    logger.error('Error updating payment status', {
      error: error.message,
      paymentReference,
      currency
    });
    throw error;
  }
},

/**
 * Get payment history for a policy
 */
async getPaymentHistory(policyNumber, currency) {
  try {
    if (!this.isConnected[currency] || !this.pools[currency]) {
      throw new Error(`Database not connected for ${currency}`);
    }

    const request = this.pools[currency].request();
    
    const selectQuery = `
      SELECT 
        payment_id,
        policy_number,
        payment_reference,
        transaction_id,
        amount,
        currency,
        payment_method,
        payment_status,
        customer_name,
        initiated_at,
        completed_at,
        callback_received_at
      FROM policy_payments 
      WHERE policy_number = @policyNumber
      ORDER BY initiated_at DESC
    `;

    request.input('policyNumber', sql.VarChar(50), policyNumber);
    const result = await request.query(selectQuery);

    return {
      success: true,
      payments: result.recordset,
      totalPayments: result.recordset.length
    };

  } catch (error) {
    logger.error('Error getting payment history', {
      error: error.message,
      policyNumber,
      currency
    });
    throw error;
  }
}

// =============================================================================
// USAGE INSTRUCTIONS:
// =============================================================================
// 1. Add the above methods to your MSSQLPolicyService class in mssqlPolicyService.js
// 2. Run the create-payment-tracking-table.sql script on your database
// 3. Update the payment routes to use these new methods
// 4. Test the complete payment flow

console.log('📋 Payment Methods Ready for Integration');
console.log('==========================================');
console.log('✅ Payment Initiation Recording');
console.log('✅ Payment Status Updates');
console.log('✅ Payment History Retrieval');
console.log('✅ Multi-Currency Support (USD/ZIG)');
console.log('');
console.log('Next steps:');
console.log('1. Run: create-payment-tracking-table.sql on your database');
console.log('2. Add the methods above to mssqlPolicyService.js');
console.log('3. Test with: node test-policy-payment-flow.js');