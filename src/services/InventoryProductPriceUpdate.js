// multiple all prices by a given factor
const InventoryProduct = require("../models/InventoryProduct");

async function updateInventoryProductPrices(factor) {
  try {
    const products = await InventoryProduct.find();
    for (const product of products) {
      product.price = product.price * factor;
      product.netPrice = product.netPrice * factor;

      await product.save();

      console.log(
        `Updated product ${product.name}: new price ${product.price}, new net price ${product.netPrice}`,
      );
    }
  } catch (err) {
    console.error("Error updating product prices:", err);
  }
}



async function roundPrices() {
  try {
    const products = await InventoryProduct.find();
    for (const product of products) {
      product.price = Number(product.price.toFixed(2));
      product.netPrice = Number(product.netPrice.toFixed(2));

      await product.save();

      console.log(
        `Rounded product ${product.name}: new price ${product.price}, new net price ${product.netPrice}`,
      );
    }
  } catch (err) {
    console.error("Error rounding product prices:", err);
  }
}

module.exports = { updateInventoryProductPrices, roundPrices };