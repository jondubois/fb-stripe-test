var assert = require('assert');
var firebase = require('firebase-admin');
// firebase.database.enableLogging(true);

var orderProcessor = require('../order-processor');
var config = require('../config/config');
var stripe = require('stripe')(config.stripe.apiSecretKey);

var fbApp = firebase.initializeApp(config.firebase, config.appName + '-test');
var database = fbApp.database();
var ordersRef = database.ref('orders');
var usersRef = database.ref('users');

orderProcessor.start();

describe('order integration tests', function () {
  before('run the server before start', function (done) {
    done();
  });

  after('cleanup data and shut down server afterwards', function (done) {
    // TODO remove
    done();
    return;

    ordersRef.remove()
    usersRef.remove()
    .then(function () {
      console.log('Cleaned up test data.');
      done();
    })
    .catch(function (err) {
      console.log('Cleanup error:', err);
      done();
    });
  });

  describe('handle new order', function () {
    it('should charge user when a new order arrives from Firebase', function (done) {

      // TODO: This test is incomplete, once the order has been processed, we should
      // add some assertions to check that everything behaved as expected.
      createStripeTestToken()
      .then(function (stripeTokenId) {
        var newOrderRef = ordersRef.push();
        return newOrderRef.set({
          "id": newOrderRef.key,
          "customer": {
            "id": "C1",
            "name": "John Smith",
            "email": "john@smith.com"
          },
          "product": {
            "id": "I1",
            "name": "Item",
            "price": 3.99
          },
          "payment": {
            "type": "stripe",
            "details": {
              "token": stripeTokenId
            }
          }
        });
      })
      .then(function () {
        console.log('Data saved successfully.');
        finish();
      })
      .catch(function (err) {
        console.log('Test error:', err);
        finish();
      });

      // TODO: We should finish the test after certain conditions have been made
      // but as a shortcut, we will just finish the test after a few seconds.
      function finish() {
        setTimeout(function () {
          done();
        }, 3000);
      }
    });
  });
});

function createStripeTestToken() {
  // Create a test token from test credit card details.
  return new Promise(function (resolve, reject) {
    stripe.tokens.create({
      card: {
        "number": '4242424242424242',
        "exp_month": 12,
        "exp_year": 2034,
        "cvc": '123'
      }
    }, function (err, token) {
      if (err) {
        var error = new Error(err.message);
        error.name = 'FailedToCreateStripeTokenError';
        reject(error);
      } else {
        resolve(token.id);
      }
    });
  });
}
