class QuoteService {
  static async generateQuote(quoteRequest) {
    const { productId, packageId, coverDetails, term, customerInfo } = quoteRequest;

    // Calculate premium using rating tables
    const premiumCalculation = await PremiumCalculator.calculatePremium(
      productId, packageId, coverDetails, term
    );

    // Add taxes (2% tax as per specification)
    const taxes = premiumCalculation.basePremium * 0.02;
    const totalPremium = premiumCalculation.basePremium + taxes;

    // Generate quotation number
    const quotationNumber = `QT${Date.now()}${Math.random().toString(36).substr(2, 5)}`;

    // Get product and package details
    const product = await ProductModel.findById(productId);
    const packageData = await PackageModel.getPackageWithDetails(packageId);

    // Create quote object - EXACT specification format
    const quote = {
      quotationNumber,
      status: 'GENERATED',
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
      generatedAt: new Date().toISOString(),
      productDetails: {
        productId: product.product_id,
        productName: product.product_name,
        packageId: packageData.package_id,
        packageName: packageData.package_name,
        ratingType: product.rating_type
      },
      premiumCalculation: {
        ...premiumCalculation,
        taxes,
        totalPremium
      },
      customerInfo,
      benefits: packageData.benefits,
      limits: packageData.limits
    };

    // In production, save to database
    // await db('quotes').insert(quote);

    return quote;
  }
}