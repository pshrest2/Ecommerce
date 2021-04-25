const { Order, CartItem } = require("../models/order");
const { errorHandler } = require("../helpers/dbErrorHandler");

//find an order with its given id
exports.orderById = (req, res, next, id) => {
  Order.findById(id)
    .populate("products.product", "name price")
    .exec((err, order) => {
      if (err || !order) {
        return res.status(400).json({
          error: errorHandler(err),
        });
      }
      req.order = order;
      next();
    });
};

//create a new order
exports.create = (req, res) => {
  req.body.order.user = req.profile;
  const order = new Order(req.body.order);
  order.save((error, data) => {
    if (error) {
      return res.status(400).json({
        error: errorHandler(error),
      });
    }
    res.json(data);
  });
};

//list all the orders made
exports.listOrders = (req, res) => {
  Order.find()
    .populate("user", "_id name address1 address2 city state zip")
    .sort("-createdAt")
    .exec((error, orders) => {
      if (error) {
        return res.status(400).json({
          error: errorHandler(error),
        });
      }
      res.json(orders);
    });
};

//find an order
exports.findOrder = (req, res) => {
  return res.json(req.order);
};

//get all the order status data
exports.getStatusValues = (req, res) => {
  res.json(Order.schema.path("status").enumValues);
};

//update the status of an order
exports.updateOrderStatus = (req, res) => {
  Order.update(
    { _id: req.body.orderId },
    { $set: { status: req.body.status } },
    (err, order) => {
      if (err) {
        return res.status(400).json({
          error: errorHandler(error),
        });
      }
      res.json(order);
    }
  );
};
