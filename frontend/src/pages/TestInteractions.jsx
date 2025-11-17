import React, { useState, useEffect } from "react";

const API_BASE = "https://cies-5dc4.onrender.com/api/interactions"; // update if deployed

export default function TestInteractions() {
  const [myInteractions, setMyInteractions] = useState([]);
  const [allInteractions, setAllInteractions] = useState([]);
  const [loading, setLoading] = useState(false);
  const token = localStorage.getItem("token");

  const fetchMyInteractions = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/my`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setMyInteractions(data.interactions || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllInteractions = async () => {
    setLoading(true);
    try {
      const res = await fetch(API_BASE, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setAllInteractions(data.interactions || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyInteractions();
    fetchAllInteractions();
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">Interaction Test Page</h1>
      {loading && <p>Loading...</p>}

      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-2">My Interactions</h2>
        {myInteractions.length === 0 ? (
          <p>No interactions found</p>
        ) : (
          <ul className="space-y-2">
            {myInteractions.map((i) => (
              <li key={i._id} className="border p-3 rounded">
                <p><b>Customer:</b> {i.customerName}</p>
                <p><b>Type:</b> {i.type}</p>
                <p><b>Sentiment:</b> {i.sentimentScore}</p>
                <p><b>Points Deducted:</b> {i.pointsDeducted}</p>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-2">All Interactions (Manager)</h2>
        {allInteractions.length === 0 ? (
          <p>No interactions found</p>
        ) : (
          <ul className="space-y-2">
            {allInteractions.map((i) => (
              <li key={i._id} className="border p-3 rounded">
                <p><b>Employee:</b> {i.employeeId?.name}</p>
                <p><b>Customer:</b> {i.customerName}</p>
                <p><b>Type:</b> {i.type}</p>
                <p><b>Sentiment:</b> {i.sentimentScore}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
