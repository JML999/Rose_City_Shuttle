import { NextRequest, NextResponse } from "next/server";
import { getStripeServer } from "@/lib/stripe";

export async function POST(req: NextRequest) {
  try {
    const { amount, currency, metadata } = await req.json();
    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    const stripe = getStripeServer();
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: currency || "usd",
      automatic_payment_methods: { enabled: true },
      metadata: metadata || {},
    });

    return NextResponse.json({ clientSecret: paymentIntent.client_secret });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Server error" }, { status: 500 });
  }
}


