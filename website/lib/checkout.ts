// What "Start my subscription" on the paywall (app/(site)/_components/paywall.tsx) does. Two versions to try:
//
//   storeSheet: true   a drawer slides up with how to subscribe: get the app, sign in with the same email, start the
//                      plan in the App Store / Google Play, and it works everywhere. Purchases only happen in the stores.
//   storeSheet: false  opens /checkout, a card / PayPal / Apple Pay checkout MOCK-UP for showing people. It takes no
//                      payment and sends nothing anywhere; the button only says it's a demo.
export const CHECKOUT = {
  storeSheet: true,
};
