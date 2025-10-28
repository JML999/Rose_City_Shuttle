"use client";
import { useEffect, useState } from "react";
import { collection, addDoc, getDocs, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function TestPage() {
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setMessages([]);
      
      setMessages([`🔥 Firebase Status: Connected!`, `📁 Project: thomasville-shuttle`, `🗄️ Database: Firestore`]);
      
      try {
        const col = collection(db, "test");
        // write a test doc
        await addDoc(col, { createdAt: serverTimestamp() });
        // read docs
        const snap = await getDocs(col);
        setMessages(prev => [...prev, `✅ Success! Document IDs:`, ...snap.docs.map((d) => d.id)]);
      } catch (err) {
        setMessages(prev => [...prev, `❌ Error: ${String(err)}`]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Firebase Test</h1>
      <p className="text-sm text-gray-600">Client write/read to Firestore.</p>
      {loading ? <p>Loading…</p> : null}
      <ul className="list-disc pl-6">
        {messages.map((m, i) => (
          <li key={i} className="break-all">{m}</li>
        ))}
      </ul>
    </div>
  );
}

