/**
 * Calculate the daily cost of an item
 * @param {number} price - Item price
 * @param {string} purchaseDate - Purchase date (ISO format)
 * @returns {number} - Daily cost
 */
export const calculateDailyCost = (price, purchaseDate) => {
  const purchaseTime = new Date(purchaseDate).getTime();
  const currentTime = new Date().getTime();
  const daysDiff = Math.max(1, Math.ceil((currentTime - purchaseTime) / (1000 * 60 * 60 * 24)));
  return price / daysDiff;
};
 