const { errorHandler } = require("../helpers/dbErrorHandler");
const { Order } = require("../models/order");
const User = require("../models/user");

exports.userById = (req, res, next, id) => {
  User.findById(id).exec((err, user) => {
    if (err || !user) {
      return res.status(400).json({
        error: "User not found",
      });
    }
    req.profile = user;
    next();
  });
};

exports.read = (req, res) => {
  req.profile.hashed_password = undefined;
  req.profile.salt = undefined;

  return res.json(req.profile);
};

exports.hashed_password = (req, res) => {
  let userId = req.body.id;
  User.findOne({ _id: userId }, (err, user) => {
    if (err || !user) {
      return res.status(400).json({
        error: "User does not exists",
      });
    }

    if (user.authenticate(req.body.old_password)) {
      return res.json(true);
    } else {
      return res.json(false);
    }
  });
};

exports.update = (req, res) => {
  User.findOne(req.profile._id, (err, user) => {
    if (err || !user) {
      return res.status(400).json({
        error: "User does not exist",
      });
    }

    let { name, email } = req.body;
    let hashed_password = user.encryptPassword(req.body.password);

    let dataUpdate = {
      name: name,
      email: email,
      hashed_password: hashed_password,
    };

    User.findOneAndUpdate(
      { _id: req.profile._id },
      { $set: dataUpdate },
      { new: true },
      (err, user) => {
        if (err) {
          return res.status(400).json({
            error: "Not Authorized to update this profile",
          });
        }

        user.salt = undefined;
        user.hashed_password = undefined;
        res.json(user);
      }
    );
  });
};

exports.addOrderToUserHistory = (req, res, next) => {
  let history = [];

  req.body.order.products.forEach((item) => {
    history.push({
      _id: item._id,
      name: item.name,
      description: item.description,
      category: item.category,
      quantity: item.count,
      transaction_id: req.body.order.transaction_id,
      amount: req.body.order.amount,
    });
  });

  User.findOneAndUpdate(
    { _id: req.profile._id },
    { $push: { history: history } },
    { new: true },
    (error, data) => {
      if (error) {
        return res.status(400).json({
          error: "Could not update user purchase history",
        });
      }
      next();
    }
  );
};

exports.purchaseHistory = (req, res) => {
  Order.find({ user: req.profile._id })
    .populate("user", "_id name")
    .sort("-created")
    .exec((err, orders) => {
      if (err) {
        return res.status(400).json({
          error: errorHandler(err),
        });
      }
      res.json(orders);
    });
};
