"use client";
import { useEffect, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "");

function PaymentForm() {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setLoading(true);
    setError(null);

    // Ensure return_url is always a string for both client and server builds
    const returnUrl =
      typeof window !== "undefined"
        ? `${window.location.origin}/book`
        : `${process.env.NEXT_PUBLIC_SITE_URL || "https://rosecityexpress.netlify.app"}/book`;

    const { error: submitError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: returnUrl,
      },
    });

    if (submitError) setError(submitError.message || "Payment failed");
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-md mx-auto space-y-4 p-6 bg-white rounded-lg shadow">
      <PaymentElement />
      {error && <div className="text-red-600 text-sm">{error}</div>}
      <button
        type="submit"
        disabled={!stripe || loading}
        className={`w-full py-2 rounded-md font-medium ${!stripe || loading ? "bg-gray-300 text-gray-500" : "bg-blue-600 text-white hover:bg-blue-700"}`}
      >
        {loading ? "Processing..." : "Finalize Payment"}
      </button>
    </form>
  );
}

export default function PayPage() {
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  useEffect(() => {
    // Retrieve draft booking from sessionStorage
    const draftStr = sessionStorage.getItem("booking_draft");
    if (!draftStr) return;
    const draft = JSON.parse(draftStr);
    const amount = Math.round((draft.totalPrice || 0) * 100);

    fetch("/api/create-payment-intent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount, currency: "usd", metadata: { tripId: draft.tripId, date: draft.date } }),
    })
      .then((r) => r.json())
      .then((data) => setClientSecret(data.clientSecret))
      .catch(() => setClientSecret(null));
  }, []);

  if (!clientSecret) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-600">Preparing payment…</div>
    );
  }

  return (
    <Elements stripe={stripePromise} options={{ clientSecret }}>
      <PaymentForm />
    </Elements>
  );
}


