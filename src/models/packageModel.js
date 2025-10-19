class PackageModel {
  static async findById(packageId) {
    return await db('packages').where('package_id', packageId).first();
  }

  static async getPackageWithDetails(packageId) {
    const packageData = await db('packages')
      .join('products', 'packages.product_id', 'products.product_id')
      .where('packages.package_id', packageId)
      .select('packages.*', 'products.rating_type', 'products.product_name')
      .first();

    if (!packageData) return null;

    const benefits = await db('package_benefits').where('package_id', packageId);
    const limits = await db('package_limits').where('package_id', packageId);

    return {
      ...packageData,
      benefits: benefits.reduce((acc, b) => {
        acc[b.benefit_type] = b.benefit_value !== null ? b.benefit_value : b.benefit_description;
        return acc;
      }, {}),
      limits: limits.reduce((acc, l) => {
        acc[l.limit_type] = l.limit_value;
        return acc;
      }, {})
    };
  }
}