import Stripe from "stripe";

let stripeSingleton: Stripe | null = null;

export function getStripeServer(): Stripe {
  if (!stripeSingleton) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      throw new Error("STRIPE_SECRET_KEY is not set");
    }
    stripeSingleton = new Stripe(secretKey, {
      apiVersion: "2024-06-20",
    });
  }
  return stripeSingleton;
}


