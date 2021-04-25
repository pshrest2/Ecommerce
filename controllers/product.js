const Product = require("../models/product");
const formidable = require("formidable");
const _ = require("lodash");
const fs = require("fs");

const { errorHandler } = require("../helpers/dbErrorHandler");

//get a product from its given id
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

//read a product
exports.read = (req, res) => {
  req.product.photo = undefined; //make seperate method to send photo. don't send photo here
  return res.json(req.product);
};

//create a product
exports.create = (req, res) => {
  const form = new formidable.IncomingForm(); //use formidable package to handle the incomming form
  form.keepExtensions = true; //for extensions of images
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

    //create a new product model
    let product = new Product(fields);

    //validate photo so it is not > 20MB in size
    if (files.photo) {
      if (files.photo.size > 2000000) {
        return res.status(400).json({
          error: "Image needs to be less than 20 MB",
        });
      }
      product.photo.data = fs.readFileSync(files.photo.path); //access the file system
      product.photo.content = files.photo.type; //access the photo type (.png, .jpg, etc.)
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

//delete a product
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

//update a product
exports.update = (req, res) => {
  const form = new formidable.IncomingForm();
  form.keepExtensions = true;
  form.parse(req, (err, fields, files) => {
    if (err) {
      res.status(400).json({
        error: "Image could not be uploaded",
      });
    }

    let product = req.product;
    product = _.extend(product, fields); //replace the existing product info with the new fields

    //validate photo so it is not > 20MB in size
    if (files.photo) {
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

//All the query parameters will come from client (brower)
//list products by query parameters
exports.list = (req, res) => {
  let order = req.query.order ? req.query.order : "asc"; //if no orderBy query passed in URL, order in ascending
  let sortBy = req.query.sortBy ? req.query.sortBy : "_id"; //if not sortBy query passed in URL, sort by the ID
  let limit = req.query.limit ? parseInt(req.query.limit) : 5; //by default only display 5 products

  Product.find()
    .select("-photo") //neglect the photos
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

  //find products by id in a specific category
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

//list all categories
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

//filter products based on specific filters (category/price range)
exports.listBySearch = (req, res) => {
  let order = req.query.order ? req.query.order : "desc";
  let sortBy = req.query.sortBy ? req.query.sortBy : "_id";
  let limit = req.body.limit ? parseInt(req.body.limit) : 20;
  let skip = parseInt(req.body.skip);
  let findArgs = {};

  for (let key in req.body.filters) {
    if (req.body.filters[key].length > 0) {
      if (key === "price") {
        // gte -  greater than price [0-10]
        // lte - less than price
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

//controller function for the serach bar
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

//middleware for getting photo
exports.photo = (req, res, next) => {
  if (req.product.photo.data) {
    res.set("Content-Type", req.product.photo.contentType);
    return res.send(req.product.photo.data);
  }
  next();
};

//controller function to update sold attribute when someone buys that product
exports.decreaseQuantity = (req, res, next) => {
  let bulkOptions = req.body.order.products.map((item) => {
    return {
      updateOne: {
        filter: { _id: item._id },
        update: { $inc: { quantity: -item.count, sold: +item.count } },
      },
    };
  });

  //use of bulkWrite to send multiple operations to MongoDB
  Product.bulkWrite(bulkOptions, {}, (error, products) => {
    if (error) {
      return res.status(400).json({
        error: "Could not update product",
      });
    }
    next();
  });
};
