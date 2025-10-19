// src/models/generated/index.js - Auto-generated model index
const PackageBenefitsModel = require('./PackageBenefitsModel');
const PackageLimitsModel = require('./PackageLimitsModel');
const PackagesModel = require('./PackagesModel');
const PartnersModel = require('./PartnersModel');
const PaymentTransactionsModel = require('./PaymentTransactionsModel');
const PoliciesModel = require('./PoliciesModel');
const ProductsModel = require('./ProductsModel');
const QuotesModel = require('./QuotesModel');
const RatingFactorsModel = require('./RatingFactorsModel');

module.exports = {
  PackageBenefits: PackageBenefitsModel,
  PackageLimits: PackageLimitsModel,
  Packages: PackagesModel,
  Partners: PartnersModel,
  PaymentTransactions: PaymentTransactionsModel,
  Policies: PoliciesModel,
  Products: ProductsModel,
  Quotes: QuotesModel,
  RatingFactors: RatingFactorsModel,
};

// Usage examples:
// const { Partner, Product, Policy } = require('./models/generated');
// const partners = await Partner.findAll();
// const partner = await Partner.findById(1);
