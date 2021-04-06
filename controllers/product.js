const Product = require("../models/product");
const formidable = require("formidable");
const _ = require("lodash");
const fs = require("fs");

const { errorHandler } = require("../helpers/dbErrorHandler");

exports.productById = (req, res, next, id) => {
  Product.findById(id)
    .populate("category")
    .exec((err, product) => {
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

      if (files.photo.size > 20000000) {
        return res.status(400).json({
          error: "Image needs to be less than 20 MB",
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

/*
-> sell /arrival
-> by sell = /products?sortBy=sold&order=desc&limit=4
-> by arrival = /products?sortBy=createdAt&order=desc&limit=4
-> if no params are sent, then all products are returned

Note: All the query parameters will come from client (browers)
*/
exports.list = (req, res) => {
  let order = req.query.order ? req.query.order : "asc";
  let sortBy = req.query.sortBy ? req.query.sortBy : "_id";
  let limit = req.query.limit ? parseInt(req.query.limit) : 5;

  Product.find()
    .select("-photo")
    .populate("category")
    .sort([[sortBy, order]])
    .limit(limit)
    .exec((err, products) => {
      if (err) {
        return res.status(400).json({
          error: "Products not found",
        });
      }
      res.json(products);
    });
};

// it will find the products based on the request product category
// other products that has the same category will be returned

exports.listRelated = (req, res) => {
  let limit = req.query.limit ? parseInt(req.query.limit) : 5;

  Product.find({
    _id: { $ne: req.product },
    category: req.product.category,
  })
    .limit(limit)
    .populate("category", "_id name")
    .exec((err, products) => {
      if (err) {
        return res.status(400).json({
          error: "Products not found",
        });
      }
      res.json(products);
    });
};

exports.listCategories = (req, res) => {
  Product.distinct("category", {}, (err, categories) => {
    if (err) {
      return res.status(400).json({
        error: "Categories not found",
      });
    }
    res.json(categories);
  });
};

exports.listBySearch = (req, res) => {
  let order = req.query.order ? req.query.order : "desc";
  let sortBy = req.query.sortBy ? req.query.sortBy : "_id";
  let limit = req.query.limit ? parseInt(req.query.limit) : 100;
  let skip = parseInt(req.body.skip);
  let findArgs = {};

  for (let key in req.body.filters) {
    if (req.body.filters[key].length > 0) {
      if (key === "price") {
        // gte -  greater than price [0-10]
        // lte - less than
        findArgs[key] = {
          $gte: req.body.filters[key][0],
          $lte: req.body.filters[key][1],
        };
      } else {
        findArgs[key] = req.body.filters[key];
      }
    }
  }

  Product.find(findArgs)
    .select("-photo")
    .populate("category")
    .sort([[sortBy, order]])
    .skip(skip)
    .limit(limit)
    .exec((err, data) => {
      if (err) {
        return res.status(400).json({
          error: "Products not found",
        });
      }
      res.json({
        size: data.length,
        data,
      });
    });
};

exports.listSearched = (req, res) => {
  //create query object to hold search value and category value
  const querySearchAndCategory = {};
  const search = req.query.search;
  const category = req.query.category;

  //assign search value to query.name
  //i = case insensitivity, regex provides regular expression properties in mongoose for pattern matching
  if (search) {
    querySearchAndCategory.name = { $regex: search, $options: "i" };

    //TODO: how to implement search by description as well?
    // querySearchAndCategory.description = { $regex: search, $options: "i" };

    //assign category value to query.category
    if (category && category != "All") {
      querySearchAndCategory.category = category;
    }

    //find the product based on query object with 2 properties i.e. search and category
    Product.find(querySearchAndCategory, (err, products) => {
      if (err) {
        return res.status(400).json({
          error: errorHandler(err),
        });
      }
      res.json(products);
      console.log(products);
    }).select("-photo");
  }
};

exports.photo = (req, res, next) => {
  if (req.product.photo.data) {
    res.set("Content-Type", req.product.photo.contentType);
    return res.send(req.product.photo.data);
  }
  next();
};

exports.decreaseQuantity = (req, res, next) => {
  let bulkOptions = req.body.order.products.map((item) => {
    return {
      updateOne: {
        filter: { _id: item._id },
        update: { $inc: { quantity: -item.count, sold: +item.count } },
      },
    };
  });

  Product.bulkWrite(bulkOptions, {}, (error, products) => {
    if (error) {
      return res.status(400).json({
        error: "Could not update product",
      });
    }
    next();
  });
};
