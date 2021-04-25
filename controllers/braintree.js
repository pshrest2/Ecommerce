const braintree = require("braintree");
require("dotenv").config();

//get all the env variables for braintree setup from .env file
const gateway = new braintree.BraintreeGateway({
  environment: braintree.Environment.Sandbox,
  merchantId: process.env.BRAINTREE_MERCHANT_ID,
  publicKey: process.env.BRAINTREE_PUBLIC_KEY,
  privateKey: process.env.BRAINTREE_PRIVATE_KEY,
});

//generate a token to show the DropIn UI
exports.generateToken = (req, res) => {
  gateway.clientToken.generate({}, function (err, token) {
    if (err) {
      res.status(500).send(err);
    } else {
      res.send(token);
    }
  });
};

//controller function to process a payment once all info (credit-card/paypal, amount) is received from client
exports.processPayment = (req, res) => {
  let nonceClient = req.body.paymentMethodNonce;
  let amountClient = req.body.amount;

  //charge the user
  let newTransaction = gateway.transaction.sale(
    {
      amount: amountClient,
      paymentMethodNonce: nonceClient,
      options: {
        submitForSettlement: true,
      },
    },
    (error, result) => {
      if (error) {
        res.status(500).json(error);
      } else {
        res.json(result);
      }
    }
  );
};
