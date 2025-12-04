import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { ShoppingCart } from "lucide-react";

const PRODUCTS_PER_PAGE = 12;

export default function ProductPageWithNavbar() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const { addToCart, cartCount, isAuthenticated, logout, userName } = useCart();
  const navigate = useNavigate();

  const backendImagePath = (filename) =>
    filename ? `https://cies-5dc4.onrender.com/public/${filename.replace(/^\/+/, "")}` : "/placeholder.jpg";

  const formatPrice = (price) =>
    typeof price === "number" ? `$${price.toFixed(2)}` : `$${parseFloat(price).toFixed(2)}`;

  const handleAddToCart = async (product) => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    const result = await addToCart(product);
    alert(result?.success ? `${product.name} added to cart!` : result?.error || "Failed to add item to cart.");
  };

  useEffect(() => {
    fetch("https://cies-5dc4.onrender.com/api/products")
      .then((res) => res.json())
      .then((data) => {
        setProducts(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching products:", err);
        setLoading(false);
      });
  }, []);

  const Navbar = () => (
    <nav className="flex items-center justify-between p-4 bg-cies-900 shadow-md sticky top-0 z-50 text-white">
      <div className="flex items-center space-x-4">
        <button className="md:hidden w-6 h-5 flex flex-col justify-between" onClick={() => setIsMenuOpen(!isMenuOpen)}>
          <span className="w-full h-0.5 bg-white"></span>
          <span className="w-full h-0.5 bg-white"></span>
          <span className="w-full h-0.5 bg-white"></span>
        </button>

        <div className="hidden md:flex space-x-6 items-center">
          <Link to="/">Home</Link>
          <Link to="/chat/customer">Customer Care</Link>
          <Link to="/products">Products</Link>
          {!isAuthenticated ? (
            <>
              <Link to="/login">Login</Link>
              <Link to="/signup">Sign Up</Link>
            </>
          ) : (
            <>
              <span className="text-cies-300">Hello, {userName}</span>
              <button onClick={logout} className="text-red-400 hover:text-red-500">
                Logout
              </button>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center space-x-4">
        <Link to="/cart" className="relative bg-cies-800 hover:bg-cies-700 w-10 h-10 rounded-full flex items-center justify-center transition-colors">
          <ShoppingCart className="w-5 h-5" />
          <span className="absolute -top-1 -right-1 bg-red-500 text-xs w-4 h-4 rounded-full flex items-center justify-center">{cartCount}</span>
        </Link>
      </div>
    </nav>
  );

  const paginatedProducts = products.slice((currentPage - 1) * PRODUCTS_PER_PAGE, currentPage * PRODUCTS_PER_PAGE);
  const totalPages = Math.ceil(products.length / PRODUCTS_PER_PAGE);

  // Skeleton loader for product cards
  const renderSkeletons = () => {
    return Array.from({ length: PRODUCTS_PER_PAGE }).map((_, i) => (
      <div key={i} className="rounded-2xl shadow-lg overflow-hidden bg-cies-800 animate-pulse">
        <div className="w-full h-56 bg-cies-700"></div>
        <div className="p-4 flex flex-col gap-3">
          <div className="h-5 bg-cies-700 rounded w-3/4"></div>
          <div className="h-3 bg-cies-700 rounded w-full"></div>
          <div className="h-5 bg-orange-700 rounded w-1/2"></div>
          <div className="h-10 bg-orange-500 rounded w-full"></div>
        </div>
      </div>
    ));
  };

  return (
    <div className="min-h-screen w-full bg-cies-900 text-white">
      <Navbar />

      <section className="bg-cies-900 py-10 px-4 sm:px-6 md:px-10">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white mb-10 text-center border-b border-cies-700 pb-4">
            Explore All Products
          </h1>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {loading ? renderSkeletons() : paginatedProducts.map((product) => (
              <div
  key={product._id}
  className="rounded-2xl shadow-lg overflow-hidden bg-cies-800 flex flex-col"
>
  <img
    src={backendImagePath(product.imageUrl)}
    alt={product.name}
    loading="lazy"
    className="w-full h-56 object-cover"
  />
  
  {/* Flex container with space-between to push button to bottom */}
  <div className="p-4 flex flex-col justify-between flex-1">
    <div>
      <h3 className="text-xl font-semibold text-white line-clamp-1">{product.name}</h3>
      <p className="text-gray-400 text-sm mt-1 line-clamp-2">{product.description}</p>
      <p className="text-orange-400 font-extrabold text-xl mt-2">{formatPrice(product.price)}</p>
    </div>
    
    <button
      onClick={() => handleAddToCart(product)}
      className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-full w-full font-semibold mt-4 transition-colors"
    >
      {isAuthenticated ? "Add to Cart" : "Login to Buy"}
    </button>
  </div>
</div>

            ))}
          </div>

          {!loading && totalPages > 1 && (
            <div className="flex justify-center mt-8 space-x-2">
              {Array.from({ length: totalPages }, (_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentPage(i + 1)}
                  className={`px-3 py-1 rounded ${currentPage === i + 1 ? "bg-orange-500" : "bg-cies-700 hover:bg-cies-600"}`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
