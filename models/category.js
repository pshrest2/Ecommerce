const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      required: true,
      maxlength: 32,
      unique: true,
    },
  },
  { timestamps: true }
);

categorySchema.pre("deleteMany", function (next) {
  var category = this;
  //Remove all the person that reference the removed category.
  category.model("Product").deleteOne({ category: category._id, next });
});

module.exports = mongoose.model("Category", categorySchema);
