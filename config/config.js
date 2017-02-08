var admin = require('firebase-admin');

module.exports = {
  appName: 'fb-stripe-test',
  firebase: {
    credential: admin.credential.cert(__dirname + '/fb-stripe-test-firebase-adminsdk-0bpyt-80da75990e.json'),
    databaseURL: "https://fb-stripe-test.firebaseio.com"
  },
  stripe: {
    apiSecretKey: 'sk_test_c9eEKAtikFjuqsJgcZKx07ad',
    apiPublishableKey: 'pk_test_dQzaYFiK2gcJuLGUwAzepcFZ'
  }
};
