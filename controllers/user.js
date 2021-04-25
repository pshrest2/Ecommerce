const { errorHandler } = require("../helpers/dbErrorHandler");
const { Order } = require("../models/order");
const User = require("../models/user");

//find a user by his/her id
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

//Read a user
exports.read = (req, res) => {
  req.profile.hashed_password = undefined;
  req.profile.salt = undefined;

  return res.json(req.profile);
};

//function to authenticate. Return true if password match
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

//update user profile
exports.update = (req, res) => {
  //find a user
  User.findOne(req.profile._id, (err, user) => {
    if (err || !user) {
      return res.status(400).json({
        error: "User does not exist",
      });
    }

    //dereference name, email, password from request body
    let { name, email, password } = req.body;
    let dataUpdate = {};

    //only update password if password field is not empty
    if (password !== "") {
      let hashed_password = user.encryptPassword(password);
      dataUpdate.name = name;
      dataUpdate.email = email;
      dataUpdate.hashed_password = hashed_password;
    }
    //if password field is empty, simply update either name or email
    else {
      dataUpdate.name = name;
      dataUpdate.email = email;
    }

    //Update the DB with new information
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

//add order to purchase history
exports.addOrderToUserHistory = (req, res, next) => {
  let history = [];

  //for each products in the order, add it to the history array
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

  //find the user and update the history array for him/her
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

//list the purchase history for a user
exports.purchaseHistory = (req, res) => {
  Order.find({ user: req.profile._id })
    .populate("user", "_id name")
    .sort("-createdAt")
    .exec((err, orders) => {
      if (err) {
        return res.status(400).json({
          error: errorHandler(err),
        });
      }
      res.json(orders);
    });
};
