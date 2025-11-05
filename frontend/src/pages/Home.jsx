import { Link } from "react-router-dom";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-50">
      <h1 className="text-4xl font-bold text-blue-600 mb-6">Homepage</h1>
      <div className="space-x-4">
        <Link to="/login" className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
          Login
        </Link>
        <Link to="/signup" className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600">
          Signup
        </Link>
      </div>
    </div>
  );
}
