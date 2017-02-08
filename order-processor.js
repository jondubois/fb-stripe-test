var config = require('./config/config');
var firebase = require('firebase-admin');

var stripe = require('stripe')(config.stripe.apiSecretKey);

var fbApp = firebase.initializeApp(config.firebase, config.appName);
var database = fbApp.database();

// Start listening and processing new orders from Firebase.
module.exports.start = function () {
  var ordersRef = database.ref('orders');
  var usersRef = database.ref('users');

  ordersRef.on('child_added', (snapshot) => {
    var orderData = snapshot.val();

    // TODO: Use a separate module for validation - Each kind of data should have its own validation rules.
    // We could put those as rules in Firebase if we don't mind the lock-in (the rules would be quite lengthy) but it's
    // better to define the schema for each type as its own file in this repo somewhere.
    if (!orderData || !orderData.payment || !orderData.payment.type || !orderData.payment.details ||
      !orderData.customer || !orderData.customer.email || !orderData.product || orderData.product.price == null) {
      // TODO: Maybe log this in some remote error log somewhere (maybe in Firebase?). Or NewRelic?
      var error = new Error('Could not process order because it was formatted incorrectly.');
      error.name = 'InvalidOrderFormatError';
      console.error(error);
      return;
    }

    if (orderData.payment.type == 'stripe') {
      // TODO: Because we cannot process this payment in a single atomic transaction (since we are using multiple systems),
      // we may also need to run a cronjob from time to time to account for rare cases where the process might have crashed
      // before the full process was completed. We should probably move this logic to a separate file.

      var currentUserRef = usersRef.child(orderData.customer.id);
      currentUserRef.once('value').then((userSnapshot) => {
        // Check if the user already exists; if so, return that user for the
        // next function in the promises chain; otherwise, create a new one.
        var user = userSnapshot.val();
        if (user != null) {
          return user;
        }

        var userData = {
          id: orderData.customer.id,
          name: orderData.customer.name,
          email: orderData.customer.email
        };
        return currentUserRef.set(userData)
        .then(() => {
          return userData;
        });
      })
      .then((userData) => {
        // If the stripeCustomerId already exists, just return it for
        // the next function in the chain.
        if (userData.stripeCustomerId != null) {
          return userData.stripeCustomerId;
        }
        // Otherwise, create a new stripe customer before continuing.
        return stripe.customers.create({
          email: orderData.customer.email,
          source: orderData.payment.details.token,
        }).then((stripeCustomer) => {
          return currentUserRef.update({
            stripeCustomerId: stripeCustomer.id
          }).then(() => {
            return stripeCustomer.id;
          });
        });
      })
      .then((stripeCustomerId) => {
        // Create a new charge for the customer.
        return stripe.charges.create({
          // TODO: If the order JSON comes directly from the client-side, we shouldn't trust the price that's in
          // there, instead, we should do a separate lookup for a product in the DB (based on id) to get the latest price.
          amount: Math.round(orderData.product.price * 100),
          currency: 'gbp',
          customer: stripeCustomerId,
        });
      })
      .then((charge) => {
        // TODO: Ideally we may want to add the charge as a separate 'receipt' entry in the DB and add a reference to
        // this receipt inside the relevant order object, but to keep it simple for now, we just update the order directly.
        var currentOrder = ordersRef.child(orderData.id);
        return currentOrder.update({
          stripeChargeId: charge.id,
          stripeCustomerId: charge.customer,
          paidOnDate: Date.now()
        });
      })
      .catch((err) => {
        var error = new Error(err.message);
        error.name = 'FailedToChargeError';
        console.error(error);
      });
    } else {
      // TODO: Log this in some remote error log.
      var error = new Error(`Could not process order because payment type '${orderData.payment.type}' is not supported.`);
      error.name = 'InvalidPaymentTypeError';
      console.error(error);
      return;
    }
  });
};
