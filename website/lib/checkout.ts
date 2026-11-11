// What "Start my subscription" on the paywall (app/(site)/_components/paywall.tsx) does. Two versions to try:
//
//   storeSheet: true   a drawer slides up with how to subscribe: get the app, sign in with the same email, start the
//                      plan in the App Store / Google Play, and it works everywhere. Purchases only happen in the stores.
//   storeSheet: false  opens /checkout, a card / PayPal / Apple Pay checkout MOCK-UP for showing people. It takes no
//                      payment and sends nothing anywhere; the button only says it's a demo.
export const CHECKOUT = {
  storeSheet: true,
};

// How the web funnel (/f/…) takes payment, set with the CHECKOUT_MODE environment variable (read on the server):
//
//   store   (default) the plan is bought in the App Store / Google Play: the button opens the store sheet.
//   stripe  a checkout on the page, then the audio-prayers upsell. For now a MOCK-UP: there is no Stripe account
//           yet, so nothing is charged and nothing is sent anywhere; the screens say it's a demo.
export type CheckoutMode = "store" | "stripe";
export const checkoutMode = (): CheckoutMode => (process.env.CHECKOUT_MODE === "stripe" ? "stripe" : "store");
