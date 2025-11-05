import React from 'react';

const Login = () => {
  
  const handleLogin = async (e) => {
  e.preventDefault();

  const data = {
    email: e.target.email.value,
    password: e.target.password.value,
  };

  const res = await fetch("https://takisha-unfluorinated-companionably.ngrok-free.dev/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  const result = await res.json();

  if (res.ok) {
    localStorage.setItem("token", result.token);
    alert("Login Successful ✅");
    window.location.href = "/Dashboard"; // or your home page
  } else {
    alert(result.message || "Login failed ❌");
  }
};

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-tr from-[#007896] to-black py-12 px-4 sm:px-6 lg:px-8">

      <div className="max-w-4xl w-full bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row">
        
        {/* Left Side - Gradient Background */}<div
        className="md:w-1/2 bg-cover bg-center p-8 flex flex-col justify-center items-center text-white relative"
        style={{
    backgroundImage: "url('/src/Images/3dd9db7384d6d8879c288d7f456357bc.jpg')",
  }}>
          {/* Optional decorative elements */}
          <div className="absolute top-0 left-0 w-32 h-32 bg-white bg-opacity-10 rounded-full -translate-x-16 -translate-y-16"></div>
          <div className="absolute bottom-0 right-0 w-40 h-40 bg-white bg-opacity-10 rounded-full translate-x-20 translate-y-20"></div>
          
          <div className="relative z-10 text-center">
            <h1 className="text-4xl font-bold mb-4">Join Our Creative Community</h1>
            <p className="text-lg opacity-90 mb-6">
              Share your artwork with thousands of artists and get discovered by clients worldwide.
            </p>
           
          </div>
        </div>

        {/* Right Side - Sign Up Form */}
        <div className="md:w-1/2 p-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-800">Login To Your Account</h2>
            <p className="text-gray-600 mt-2">Share your artwork and Get projects!</p>
          </div>

          <form className="space-y-4" onSubmit={handleLogin}>

           

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email address
              </label>
              <input
                type="email"
                id="email"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder="john@example.com"
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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder="••••••••"
              />
            </div>

            {/* Terms & Conditions */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="terms"
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="terms" className="ml-2 block text-sm text-gray-700">
                Accept Terms & Conditions
              </label>
            </div>

            {/* Sign Up Button */}
            <button
              type="submit"
              className="w-full bg-black text-white py-3 px-4 rounded-lg font-semibold hover:bg-gray-800 transition shadow-lg"
            >
              Log In
            </button>
            {/* 👇 Added this part */}
            <p className="text-center text-sm text-gray-600 mt-4">
              Dont have an account?{" "}
              <a href="/Signup" className="text-blue-600 hover:underline">
                Sign up
              </a>
            </p>

            {/* Divider */}
            <div className="relative flex items-center my-6">
              <div className="flex-grow border-t border-gray-300"></div>
              <span className="flex-shrink mx-4 text-gray-500 text-sm">or</span>
              <div className="flex-grow border-t border-gray-300"></div>
            </div>

            {/* Social Sign Up Buttons */}
            <div className="space-y-3">
              <button
                type="button"
                className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Sign up with Google
              </button>

              <button
                type="button"
                className="w-full bg-black text-white flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-900 transition"
              >
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.05 12.04C17.05 8.35 14.42 6.46 11.23 6.46C7.7 6.46 5.5 8.53 5.5 11.22C5.5 14.56 8.17 15.93 10.97 15.93C12.25 15.93 13.4 15.7 14.05 15.42L13.8 17.2C13.33 17.37 12.45 17.55 11.47 17.55C7.94 17.55 5.11 15.5 5.11 11.97C5.11 8.44 7.93 5.5 11.65 5.5C15.1 5.5 17.05 7.9 17.05 10.9C17.05 13.58 15.69 14.87 13.9 14.87C12.62 14.87 11.77 14.1 11.96 12.85H11.94C12.25 12.85 14.12 12.84 14.12 10.92C14.12 9.33 13.18 8.46 11.65 8.46C9.95 8.46 8.87 9.6 8.87 11.51C8.87 13.58 10.08 14.2 10.97 14.2C11.55 14.2 12.05 13.88 12.05 13.28C12.05 12.12 10.73 12.32 10.73 11.23C10.73 10.84 11.02 10.54 11.46 10.54C11.89 10.54 12.18 10.82 12.18 11.23H12.19C12.19 12.04 17.05 12.04 17.05 12.04Z"/>
                </svg>
                Sign up with Apple
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;