import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const EmployeeSignup = () => {
  const navigate = useNavigate();

  // Check if user is manager
  useEffect(() => {
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
          navigate("/care"); // FIXED: Changed from "/dashboard" to "/care"
        return;
      }
    }
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const token = localStorage.getItem("token");
    
    const data = {
      name: `${e.target.firstName.value} ${e.target.lastName.value}`,
      email: e.target.email.value,
      password: e.target.password.value,
      role: "employee",
    };

    try {
      // ✅ FIXED: Use the correct endpoint - manager/employees instead of auth/manager/employees
      const res = await fetch("https://cies-5dc4.onrender.com/api/manager/employees", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(data),
      });

      const result = await res.json();
      
      if (res.ok && result.success) {
        alert("Employee created successfully ✅");
        // Reset form
        e.target.reset();
        // Navigate back to employees list
        navigate("/manager/employees");
      } else {
        alert(result.message || "Failed to create employee ❌");
      }
    } catch (error) {
      console.error('Signup error:', error);
      alert("Network error. Please try again.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#8B0000] via-[#A52A2A] to-black py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl w-full bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row">
        
        {/* Left Side - Keep your original image background */}
        <div
          className="md:w-1/2 bg-cover bg-center p-8 flex flex-col justify-center items-center text-white relative"
          style={{
            backgroundImage: "url('/EMPLOYEESIGn/download1.jpeg')",
          }}
        >
          <div className="absolute top-0 left-0 w-32 h-32 bg-white bg-opacity-10 rounded-full -translate-x-16 -translate-y-16"></div>
          <div className="absolute bottom-0 right-0 w-40 h-40 bg-white bg-opacity-10 rounded-full translate-x-20 translate-y-20"></div>
          
          <div className="relative z-10 text-center">
            <h1 className="text-4xl font-bold mb-4">Add New Employee</h1>
            <p className="text-lg opacity-90 mb-6">
              Create employee accounts for your team members.
            </p>
          </div>
        </div>

        {/* Right Side - Sign Up Form */}
        <div className="md:w-1/2 p-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-800">Create Employee Account</h2>
            <p className="text-gray-600 mt-2">Manager Access Required</p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>

            {/* Name Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
                  First name
                </label>
                <input
                  type="text"
                  id="firstName"
                  name="firstName"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  placeholder="John"
                />
              </div>
              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
                  Last name
                </label>
                <input
                  type="text"
                  id="lastName"
                  name="lastName"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  placeholder="Doe"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email address
              </label>
              <input
                type="email"
                id="email"
                name="email"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder="employee@company.com"
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                type="password"
                id="password"
                name="password"
                required
                minLength="6"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder="••••••••"
              />
            </div>

            {/* Terms & Conditions */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="terms"
                name="terms"
                required
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="terms" className="ml-2 block text-sm text-gray-700">
                I confirm I'm creating an employee account
              </label>
            </div>

            {/* Sign Up Button */}
            <button
              type="submit"
              className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-green-700 transition shadow-lg"
            >
              Create Employee Account
            </button>

            {/* Back to dashboard */}
            <p className="text-center text-sm text-gray-600 mt-4">
              Back to{" "}
              <a href="/CustomerCare" className="text-blue-600 hover:underline">
                Dashboard
              </a>
            </p>

            {/* Divider */}
            <div className="relative flex items-center my-6">
              <div className="flex-grow border-t border-gray-300"></div>
              <span className="flex-shrink mx-4 text-gray-500 text-sm">Manager Access Only</span>
              <div className="flex-grow border-t border-gray-300"></div>
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> Only managers can create employee accounts. 
                New employees will start with a score of 100 and can be managed from the Employees page.
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EmployeeSignup;