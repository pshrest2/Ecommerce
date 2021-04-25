const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const { ObjectId } = mongoose.Schema;

//schema for cart item model
const CartItemSchema = new mongoose.Schema(
  {
    product: { type: ObjectId, ref: "Product" },
    name: String,
    price: Number,
    count: Number,
  },
  { timestamps: true }
);

const CartItem = mongoose.model("CartItem", CartItemSchema);

//schema for order model
const OrderSchema = new mongoose.Schema(
  {
    products: [CartItemSchema],
    transaction_id: {},
    amount: { type: Number },
    address1: String,
    address2: String,
    city: String,
    state: String,
    zip: Number,
    status: {
      type: String,
      default: "Not processed",
      enum: ["Not processed", "Shipped"], // enum means string objects
    },
    updated: Date,
    user: { type: ObjectId, ref: "User" },
  },
  { timestamps: true }
);

const Order = mongoose.model("Order", OrderSchema);

module.exports = { Order, CartItem };
