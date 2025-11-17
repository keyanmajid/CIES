// frontend/src/pages/ManagerDashboard.jsx
import React, { useState, useEffect } from "react";

const API_BASE_URL = "https://cies-5dc4.onrender.com/api/manager"; // your backend URL

export default function ManagerDashboard() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newEmployee, setNewEmployee] = useState({ name: "", email: "", password: "" });

  const token = localStorage.getItem("token");

  // Fetch employees
  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/employees`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setEmployees(data.employees);
      setLoading(false);
    } catch (err) {
      console.error("Error fetching employees:", err);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  // Create employee
  const handleCreate = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/employees`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newEmployee),
      });
      const data = await res.json();
      if (data.employee) {
        alert("Employee created ✅");
        setNewEmployee({ name: "", email: "", password: "" });
        fetchEmployees();
      } else {
        alert(data.message);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Fire employee
  const handleFire = async (id) => {
    if (!window.confirm("Are you sure you want to fire this employee?")) return;

    try {
      const res = await fetch(`${API_BASE_URL}/employees/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        alert("Employee fired ✅");
        fetchEmployees();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Manager Dashboard</h1>

      {/* Create Employee */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-2">Add New Employee</h2>
        <input
          type="text"
          placeholder="Name"
          value={newEmployee.name}
          onChange={(e) => setNewEmployee({ ...newEmployee, name: e.target.value })}
          className="border p-2 mr-2"
        />
        <input
          type="email"
          placeholder="Email"
          value={newEmployee.email}
          onChange={(e) => setNewEmployee({ ...newEmployee, email: e.target.value })}
          className="border p-2 mr-2"
        />
        <input
          type="password"
          placeholder="Password"
          value={newEmployee.password}
          onChange={(e) => setNewEmployee({ ...newEmployee, password: e.target.value })}
          className="border p-2 mr-2"
        />
        <button onClick={handleCreate} className="bg-blue-600 text-white px-4 py-2 rounded">
          Create
        </button>
      </div>

      {/* Employees List */}
      <div>
        <h2 className="text-xl font-semibold mb-2">Employees</h2>
        {loading ? (
          <p>Loading...</p>
        ) : (
          <table className="border w-full">
            <thead>
              <tr>
                <th className="border p-2">Name</th>
                <th className="border p-2">Email</th>
                <th className="border p-2">Score</th>
                <th className="border p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((emp) => (
                <tr key={emp._id}>
                  <td className="border p-2">{emp.name}</td>
                  <td className="border p-2">{emp.email}</td>
                  <td className="border p-2">{emp.score}</td>
                  <td className="border p-2">
                    <button
                      onClick={() => handleFire(emp._id)}
                      className="bg-red-600 text-white px-2 py-1 rounded"
                    >
                      Fire
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      
    </div>
  );
}
