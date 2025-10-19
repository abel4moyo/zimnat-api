const { db } = require('../db');

class Payment {
  static async create(paymentData) {
    return db('payments').insert(paymentData).returning('*');
  }

  static async findById(paymentId) {
    return db('payments').where('id', paymentId).first();
  }

  static async findByExternalReference(externalRef) {
    return db('payments').where('external_reference', externalRef).first();
  }

  static async updateStatus(paymentId, status, metadata = {}) {
    return db('payments')
      .where('id', paymentId)
      .update({
        status,
        metadata: JSON.stringify(metadata),
        updated_at: db.fn.now()
      })
      .returning('*');
  }

  static async findByTransactionId(transactionId) {
    return db('payments as p')
      .select('p.*', 't.transaction_reference')
      .join('transactions as t', 'p.transaction_id', 't.id')
      .where('p.transaction_id', transactionId)
      .first();
  }

  static async findPending(limit = 100) {
    return db('payments')
      .where('status', 'pending')
      .orderBy('created_at', 'asc')
      .limit(limit);
  }
}

module.exports = Payment;