class PremiumCalculator {
  static async calculatePremium(productId, packageId, coverDetails, term) {
    try {
      const packageData = await PackageModel.getPackageWithDetails(packageId);
      if (!packageData) {
        throw new Error(`Package ${packageId} not found`);
      }

      const product = await ProductModel.findById(productId);
      if (!product) {
        throw new Error(`Product ${productId} not found`);
      }

      switch (product.rating_type) {
        case 'FLAT_PREMIUM':
          return this.calculateFlatPremium(packageData, term);
        case 'PERCENTAGE':
          return this.calculatePercentagePremium(packageData, coverDetails, term);
        case 'DURATION_BASED':
          return this.calculateDurationBasedPremium(packageData, coverDetails, term);
        default:
          throw new Error(`Unsupported rating type: ${product.rating_type}`);
      }
    } catch (error) {
      throw new Error(`Premium calculation failed: ${error.message}`);
    }
  }

  static calculateFlatPremium(packageData, term) {
    const monthlyPremium = packageData.rate;
    const totalPremium = monthlyPremium * term;

    return {
      basePremium: totalPremium,
      monthlyPremium,
      totalPremium,
      calculationMethod: 'FLAT_PREMIUM',
      ratingDetails: {
        rate: packageData.rate,
        term,
        currency: packageData.currency
      },
      benefits: packageData.benefits,
      limits: packageData.limits
    };
  }

  static calculatePercentagePremium(packageData, coverDetails, term) {
    const { propertyValue = 0, contentsValue = 0, coverageType = 'homeowners' } = coverDetails;
    
    let valueToRate = coverageType === 'homeowners' ? propertyValue : contentsValue;
    let calculatedPremium = valueToRate * packageData.rate;
    let monthlyPremium = Math.max(calculatedPremium, packageData.minimum_premium || 0);
    let totalPremium = monthlyPremium * term;

    return {
      basePremium: totalPremium,
      monthlyPremium,
      totalPremium,
      calculationMethod: 'PERCENTAGE',
      ratingDetails: {
        rate: packageData.rate,
        minimumPremium: packageData.minimum_premium,
        valueRated: valueToRate,
        calculatedPremium,
        term,
        currency: packageData.currency,
        coverageType
      },
      benefits: packageData.benefits,
      limits: packageData.limits
    };
  }

  static calculateDurationBasedPremium(packageData, coverDetails, term) {
    // Implementation for duration-based calculations (Travel insurance)
    const baseDailyRate = packageData.rate || 1.0;
    const days = coverDetails.duration || term * 30; // Assume 30 days per month if not specified
    const totalPremium = baseDailyRate * days;

    return {
      basePremium: totalPremium,
      dailyPremium: baseDailyRate,
      totalPremium,
      calculationMethod: 'DURATION_BASED',
      ratingDetails: {
        dailyRate: baseDailyRate,
        duration: days,
        currency: packageData.currency
      },
      benefits: packageData.benefits,
      limits: packageData.limits
    };
  }
}
