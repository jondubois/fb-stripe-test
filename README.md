# fb-stripe-test

I did this in a few hours so it needs a bit more polish - I added TODOs in the code to point out which parts need more work.
I used a TDD approach to build this but the test isn't complete and it would probably need more tests since there is money involved.

I wouldn't store my keys in the repo like this but since I used dummy accounts for Firebase and Stripe,  I will make an exception this time for convenience reasons.

## Setup

```bash
git clone https://github.com/jondubois/fb-stripe-test.git
cd fb-stripe-test
npm install
```

You may need to update `config/config.js` with your own Firebase and Stripe credentials.
Also you may want to replace the Firebase service key file `config/fb-stripe-test-firebase-adminsdk-0bpyt-80da75990e.json` with your own.


## Run tests
To run test, use:

```bash
npm test
```

The test doesn't contain any assertions yet (see `test/ordering.js`), but ideally we should check data in Stripe and in Firebase as part of this test to make sure that everything is being processed as expected.

## Run

To run, use:

```bash
// This will run order-processor.js with node
npm start
```

If you insert a new document into the `orders` collection in your Firebase database (as specified in `config.js`) while the the `order-processor.js` is running, it will create the customer in stripe (if they don't already exist), charge them with Stripe and then update the order with the charge ID and Stripe customer ID.

The order document must be in the format:

```json
{
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
}
```

## Deviation from specs

Instead of providing a credit card details, we provide a Stripe token ID instead.
This was done because it's generally not safe to store credit card information inside Firebase - It's not PCI compliant.
This just means that we'll have to get a Stripe token on the front end before we send through the order (which is trivial to do).
