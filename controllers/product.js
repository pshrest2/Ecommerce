const Product = require("../models/product");
const formidable = require("formidable");
const _ = require("lodash");
const fs = require("fs");

const { errorHandler } = require("../helpers/dbErrorHandler");

exports.productById = (req, res, next, id) => {
  Product.findById(id).exec((err, product) => {
    if (err || !product) {
      res.status(400).json({
        error: "Product not found",
      });
    }
    req.product = product;
    next();
  });
};

exports.read = (req, res) => {
  req.product.photo = undefined; //make seperate method to send photo. don't send photo here
  return res.json(req.product);
};

exports.create = (req, res) => {
  const form = new formidable.IncomingForm();
  form.keepExtensions = true;
  form.parse(req, (err, fields, files) => {
    if (err) {
      res.status(400).json({
        error: "Image could not be uploaded",
      });
    }

    //check all fields to make sure data is availalbe
    const { name, description, price, category, quantity, shipping } = fields;
    if (
      !name ||
      !description ||
      !price ||
      !category ||
      !quantity ||
      !shipping
    ) {
      return res.status(400).json({
        error: "All Fields are required",
      });
    }

    let product = new Product(fields);

    //validate photo so it is not > 2MB in size
    if (files.photo) {
      console.log("FILES PHOTO: ", files.photo);

      if (files.photo.size > 2000000) {
        return res.status(400).json({
          error: "Image needs to be less than 1 MB",
        });
      }
      product.photo.data = fs.readFileSync(files.photo.path);
      product.photo.content = files.photo.type;
    }

    // if everything looks good, finally save the product to the database and send the result response back to client
    product.save((err, result) => {
      if (err) {
        return res.status(400).json({
          error: errorHandler(err),
        });
      }

      res.json(result);
    });
  });
};

exports.remove = (req, res) => {
  let product = req.product;
  product.remove((err, productDeleted) => {
    if (err) {
      return res.status(400).json({
        error: errorHandler(err),
      });
    }
    res.json({
      message: "Product deleted successfully",
    });
  });
};

exports.update = (req, res) => {
  const form = new formidable.IncomingForm();
  form.keepExtensions = true;
  form.parse(req, (err, fields, files) => {
    if (err) {
      res.status(400).json({
        error: "Image could not be uploaded",
      });
    }

    //check all fields to make sure data is availalbe
    const { name, description, price, category, quantity, shipping } = fields;
    if (
      !name ||
      !description ||
      !price ||
      !category ||
      !quantity ||
      !shipping
    ) {
      return res.status(400).json({
        error: "All Fields are required",
      });
    }

    let product = req.product;
    product = _.extend(product, fields);

    //validate photo so it is not > 2MB in size
    if (files.photo) {
      console.log("FILES PHOTO: ", files.photo);

      if (files.photo.size > 2000000) {
        return res.status(400).json({
          error: "Image needs to be less than 1 MB",
        });
      }
      product.photo.data = fs.readFileSync(files.photo.path);
      product.photo.content = files.photo.type;
    }

    // if everything looks good, finally save the product to the database and send the result response back to client
    product.save((err, result) => {
      if (err) {
        return res.status(400).json({
          error: errorHandler(err),
        });
      }

      res.json(result);
    });
  });
};
