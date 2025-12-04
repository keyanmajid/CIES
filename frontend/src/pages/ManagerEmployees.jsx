import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const ManagerEmployees = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is manager
    const token = localStorage.getItem("token");
    const userData = localStorage.getItem("user");
    
    if (!token) {
      alert("Please login first");
      navigate("/login");
      return;
    }

    if (userData) {
      const user = JSON.parse(userData);
      if (user.role !== "manager") {
        alert("Only managers can access this page");
        navigate("/care");
        return;
      }
    }

    const fetchEmployees = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch("https://cies-5dc4.onrender.com/api/manager/employees", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await res.json();
        if (Array.isArray(data)) {
          setEmployees(data);
        } else if (Array.isArray(data.employees)) {
          setEmployees(data.employees);
        } else {
          console.error("Unexpected response:", data);
          setEmployees([]);
        }
      } catch (error) {
        console.error("Error fetching employees:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchEmployees();
  }, [navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-zinc-950 text-gray-200">
        <p className="text-lg">Loading employees...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-gray-200 p-8">
      <h1 className="text-3xl font-bold mb-6 text-cyan-400">All Employees</h1>

      {employees.length === 0 ? (
        <p className="text-gray-400">No employees found.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {employees.map((emp) => (
            <div
              key={emp._id}
              className="bg-zinc-900 border border-gray-700 rounded-2xl p-6 shadow-lg hover:shadow-cyan-800/20 transition-all duration-300"
            >
              <h2 className="text-xl font-semibold text-white mb-2">{emp.name}</h2>
              <p className="text-gray-400 text-sm mb-2">{emp.email}</p>
              <p className="text-gray-300 text-sm">
                <span className="text-cyan-400 font-semibold">Score:</span> {emp.score ?? "N/A"}
              </p>
              <p className="text-xs text-gray-500 mt-2">
                Joined: {new Date(emp.createdAt).toLocaleDateString()}
              </p>

              <button
                onClick={() => alert(`Remove ${emp.name} (feature coming soon)`)}
                className="mt-4 w-full py-2 bg-red-600 hover:bg-red-700 rounded-lg font-medium text-white transition-all"
              >
                Remove Employee
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ManagerEmployees;