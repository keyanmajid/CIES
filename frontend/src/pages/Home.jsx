import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { ShoppingCart, ChevronLeft, ChevronRight, User } from "lucide-react";
import { useCart } from "../context/CartContext"; // Adjust the path if needed

export default function Home() {
  const { addToCart, cartCount, isAuthenticated } = useCart(); // ✅ Use cart context
  const [userName, setUserName] = useState("Guest");

  // CAROUSEL SLIDES
  const slides = [
    { id: 1, img: "/slider/bhautik-patel-ui8yd5Qxv-Y-unsplash.jpg", title: "DESIGN SLIDER", topic: "ANIMAL", des: "Lorem ipsum dolor sit amet, consectetur adipisicing elit. Rem magnam nesciunt minima placeat." },
    { id: 2, img: "/slider/nimble-made-N0ke5zChVBU-unsplash.jpg", title: "MODERN DESIGN", topic: "NATURE", des: "Ut sequi, rem magnam nesciunt minima placeat, itaque eum neque officiis unde." },
    { id: 3, img: "/slider/martin-bammer-Y99t-LAsXmM-unsplash.jpg", title: "SIMPLE ART", topic: "TRAVEL", des: "Explicabo, laboriosam nisi reprehenderit tempora at laborum natus unde. Laudantium." },
    { id: 4, img: "/slider/cord-allman-1dmnxQ9mBfI-unsplash.jpg", title: "VISUAL BEAUTY", topic: "WILDLIFE", des: "Explicabo, laboriosam nisi reprehenderit tempora at laborum natus unde." },
  ];

  // RECOMMENDED PRODUCTS
  const products = [
    { id: 1, name: "Classic Sneakers", image: "/recomend/undefined.jpeg", price: 79.99, desc: "Comfortable sneakers for everyday wear." },
    { id: 2, name: "Casual Hoodie", image: "/recomend/Braith - Sencillo, cálido hoodie para hombres, Negro _ XL.jpeg", price: 59.99, desc: "Warm and cozy cotton hoodie for cool weather." },
    { id: 3, name: "Denim Jacket", image: "/recomend/benjamin-voros-TnNo84AJJ5A-unsplash.jpg", price: 89.99, desc: "Trendy denim jacket with a relaxed fit." },
    { id: 4, name: "Leather Handbag", image: "/recomend/james-ree-ZmeFtu11Hpc-unsplash.jpg", price: 109.99, desc: "Elegant leather handbag for all occasions." },
    { id: 5, name: "Wireless Earbuds", image: "/recomend/yogesh-phuyal-NBP7p4qWzYs-unsplash.jpg", price: 49.99, desc: "Noise-cancelling Bluetooth earbuds." },
    { id: 6, name: "Smart Watch", image: "/recomend/onur-binay-8OQt1zTnJeE-unsplash.jpg", price: 199.99, desc: "Feature-rich smartwatch with health tracking." },
    { id: 7, name: "Backpack", image: "/recomend/backpack.jpg", price: 69.99, desc: "Durable backpack with laptop compartment." },
    { id: 8, name: "Sunglasses", image: "/recomend/sunglasses.jpg", price: 39.99, desc: "UV protection sunglasses with stylish design." },
  ];

  // BENTO GRID / TRENDING
  const [bentoItems, setBentoItems] = useState([
    { id: 1, type: 'tall', title: 'Wireless Headphones', description: 'Premium sound quality with noise cancellation', image: '/ml/boAt Rockerz 411.jpeg', category: 'electronics', price: 199.99, rating: '★★★★☆ (124)' },
    { id: 2, type: 'small', title: 'Running Shoes', description: 'Lightweight and comfortable for daily runs', image: '/ml/Nuevas botas de fútbol adidas Predator en negro y….jpeg', category: 'sports', price: 89.99, rating: '★★★★★ (89)' },
    { id: 3, type: 'small', title: 'Smart Watch', description: 'Track your fitness and stay connected', image: '/ml/smart.jpeg', category: 'electronics', price: 249.99, rating: '★★★★☆ (156)' },
    { id: 4, type: 'tall', title: 'Designer Handbag', description: 'Elegant leather handbag for all occasions', image: '/ml/undefined (1).jpeg', category: 'fashion', price: 159.99, rating: '★★★★★ (67)' },
    { id: 5, type: 'small', title: 'Coffee Maker', description: 'Brew perfect coffee every morning', image: '/ml/Brewing creativity with this Dieter Rams-inspired….jpeg', category: 'home', price: 79.99, rating: '★★★★☆ (203)' },
    { id: 6, type: 'small', title: 'Yoga Mat', description: 'Non-slip premium yoga mat', image: '/ml/Joint-friendly cushioning for flows, Pilates, and….jpeg', category: 'sports', price: 45.99, rating: '★★★★★ (142)' },
    { id: 7, type: 'tall', title: 'Gaming Laptop', description: 'High-performance laptop for gaming', image: '/ml/undefined.jpeg', category: 'electronics', price: 1299.99, rating: '★★★★☆ (78)' },
    { id: 8, type: 'small', title: 'Sunglasses', description: 'UV protection with stylish design', image: '/ml/Free Returns ✓ Free Shipping✓_ Men Metal Geometric….jpeg', category: 'fashion', price: 129.99, rating: '★★★★★ (91)' }
  ]);

  const [current, setCurrent] = useState(0);
  const [currentProductIndex, setCurrentProductIndex] = useState(0);
  const length = slides.length;
  const productsPerView = 4;
  const productContainerRef = useRef(null);

  // Get user name from token or localStorage
  useEffect(() => {
    const getUserName = () => {
      try {
        const token = localStorage.getItem("token");
        if (token) {
          // Decode JWT token to get user info
          const payload = JSON.parse(atob(token.split('.')[1]));
          if (payload.name) {
            setUserName(payload.name.split(' ')[0]); // Show first name only
          } else if (payload.email) {
            setUserName(payload.email.split('@')[0]); // Show username from email
          }
        } else {
          setUserName("Guest");
        }
      } catch (error) {
        console.error("Error getting user name:", error);
        setUserName("Guest");
      }
    };

    getUserName();
  }, [isAuthenticated]);

  const nextSlide = () => setCurrent((current + 1) % length);
  const prevSlide = () => setCurrent((current - 1 + length) % length);

  const nextProducts = () => {
    const maxIndex = Math.ceil(products.length / productsPerView) - 1;
    setCurrentProductIndex((prev) => (prev < maxIndex ? prev + 1 : 0));
  };

  const prevProducts = () => {
    const maxIndex = Math.ceil(products.length / productsPerView) - 1;
    setCurrentProductIndex((prev) => (prev > 0 ? prev - 1 : maxIndex));
  };

  useEffect(() => {
    if (productContainerRef.current) {
      const container = productContainerRef.current;
      const scrollAmount = currentProductIndex * (container.scrollWidth / Math.ceil(products.length / productsPerView));
      container.scrollTo({ left: scrollAmount, behavior: 'smooth' });
    }
  }, [currentProductIndex, products.length]);

  // Carousel autoplay
  useEffect(() => {
    const timer = setInterval(nextSlide, 6000);
    return () => clearInterval(timer);
  }, [current]);

  // Shuffle Bento Grid based on user behavior
  const updateBentoGridBasedOnUserHistory = () => {
    setTimeout(() => {
      setBentoItems(prev => {
        const newItems = [...prev];
        newItems.sort(() => Math.random() - 0.5);
        return newItems;
      });
    }, 2000);
  };

  useEffect(() => {
    updateBentoGridBasedOnUserHistory();
  }, []);

  const formatPrice = (price) => {
    return typeof price === "number" ? `$${price.toFixed(2)}` : `$${parseFloat(price).toFixed(2)}`;
  };

  const handleAddToCart = async (product) => {
    const result = await addToCart(product);
    if (result && result.success) {
      alert(`${product.name} added to cart!`);
    } else {
      alert(result?.error || "Failed to add item to cart. Please try again.");
    }
  };

  return (
    <div className="min-h-screen w-full bg-cies-900 text-white">
      {/* NAVBAR */}
      <nav className="flex items-center justify-between p-4 bg-cies-900 shadow-md sticky top-0 z-50">
        <div className="flex items-center space-x-6">
          <Link to="/" className="hover:text-cies-300 transition-colors">Home</Link>
          <Link to="/CustomerCare" className="hover:text-cies-300 transition-colors">Customer Care</Link>
          <Link to="/login" className="hover:text-cies-300 transition-colors">Login</Link>
          <Link to="/signup" className="hover:text-cies-300 transition-colors">Sign Up</Link>
          <Link to="/cart" className="hover:text-cies-300 transition-colors">Cart</Link>
        </div>
        
        <div className="flex items-center justify-center w-1/3">
          <div className="flex items-center w-full max-w-md border border-cies-700 rounded-full bg-cies-850/60 backdrop-blur-sm px-3 py-2 focus-within:bg-cies-800/70 transition-all duration-200">
            <input type="search" placeholder="Search..." className="w-full bg-transparent text-white placeholder-gray-300 outline-none px-2" />
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
         {/* User Info */}
{isAuthenticated ? (
  <div className="flex items-center space-x-2 bg-cies-800 px-4 py-2 rounded-full">
    <User className="w-4 h-4 text-cies-300" />
    <span className="text-sm font-medium">Hello, {userName}</span>
  </div>
) : (
  <Link
    to="/login"
    className="flex items-center space-x-2 bg-cies-800 px-4 py-2 rounded-full hover:bg-cies-700 transition-colors"
  >
    <User className="w-4 h-4 text-cies-300" />
    <span className="text-sm font-medium">Login</span>
  </Link>
)}

          
          {/* Cart Icon */}
          <Link to="/cart" className="relative bg-cies-800 hover:bg-cies-700 w-10 h-10 flex items-center justify-center rounded-full shadow-md cursor-pointer transition-colors">
            <ShoppingCart className="text-white w-5 h-5" />
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center">
              {cartCount}
            </span>
          </Link>
        </div>
      </nav>

      {/* CAROUSEL */}
      <div className="relative w-full h-[90vh] overflow-hidden">
        {slides.map((slide, index) => (
          <div key={slide.id} className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${index === current ? "opacity-100 z-10" : "opacity-0 z-0"}`}>
            <img src={slide.img} alt={slide.title} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/50 flex flex-col justify-center items-start px-10 sm:px-20 text-left">
              <h2 className="text-5xl font-extrabold mt-2">{slide.title}</h2>
              <h3 className="text-3xl font-semibold text-orange-500 mt-2">{slide.topic}</h3>
              <p className="mt-4 max-w-xl text-gray-200">{slide.des}</p>
            </div>
          </div>
        ))}
        
        {/* Carousel Navigation Arrows */}
        <button 
          onClick={prevSlide} 
          className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white w-10 h-10 rounded-full flex items-center justify-center z-20 transition-all duration-200"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <button 
          onClick={nextSlide} 
          className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white w-10 h-10 rounded-full flex items-center justify-center z-20 transition-all duration-200"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
        
        {/* Carousel Indicators */}
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2 z-20">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrent(index)}
              className={`w-3 h-3 rounded-full transition-all duration-300 ${
                index === current ? 'bg-orange-500 scale-125' : 'bg-white/50'
              }`}
            />
          ))}
        </div>
      </div>

      {/* RECOMMENDED PRODUCTS */}
      <section className="bg-cies-900 py-10 px-6 relative">
        <h2 className="text-3xl font-bold text-white mb-6 text-center">Recommended For You</h2>
        <div className="relative max-w-7xl mx-auto">
          <button 
            onClick={prevProducts} 
            className="absolute left-0 top-1/2 transform -translate-y-1/2 -translate-x-4 bg-cies-800 hover:bg-cies-700 text-white w-10 h-10 rounded-full flex items-center justify-center z-20 transition-all duration-200"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button 
            onClick={nextProducts} 
            className="absolute right-0 top-1/2 transform -translate-y-1/2 translate-x-4 bg-cies-800 hover:bg-cies-700 text-white w-10 h-10 rounded-full flex items-center justify-center z-20 transition-all duration-200"
          >
            <ChevronRight className="w-6 h-6" />
          </button>

          <div 
            ref={productContainerRef} 
            className="flex space-x-6 overflow-x-hidden scrollbar-hide px-2 scroll-smooth"
            style={{ 
              width: '100%',
              display: 'flex',
              flexWrap: 'nowrap'
            }}
          >
            {products.map((product) => (
              <div 
                key={product.id} 
                className="flex-shrink-0 w-[280px] h-[400px] bg-cies-800 rounded-3xl shadow-md overflow-hidden relative group"
                style={{ 
                  flex: '0 0 auto',
                  width: '280px'
                }}
              >
                <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-4 rounded-t-3xl border-t border-white/10">
                  <h3 className="text-lg font-semibold text-white">{product.name}</h3>
                  <p className="text-gray-300 text-sm mb-2">{product.desc}</p>
                  <p className="text-orange-400 font-bold text-lg mb-2">{formatPrice(product.price)}</p>
                  <button
                    onClick={() => handleAddToCart(product)}
                    className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-full font-semibold transition w-full"
                  >
                    Add to Cart
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* BENTO GRID */}
      <section className="bg-cies-900 py-16 px-6">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl font-bold text-white mb-8 text-center">Trending Products</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 auto-rows-[200px]">
            {bentoItems.map((item) => (
              <div 
                key={item.id} 
                className={`relative group rounded-3xl shadow-md overflow-hidden hover:-translate-y-2 transition-transform duration-300 ${
                  item.type === 'tall' ? 'row-span-2' : 'row-span-2'
                }`}
              >
                <img src={item.image} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-4 rounded-t-3xl border-t border-white/10">
                  <h3 className="text-lg font-semibold text-white">{item.title}</h3>
                  <p className="text-gray-300 text-sm mb-2 line-clamp-2">{item.description}</p>
                  <p className="text-orange-400 font-bold text-lg mb-2">{formatPrice(item.price)}</p>
                  <button
                    onClick={() => handleAddToCart(item)}
                    className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-full font-semibold transition w-full"
                  >
                    Add to Cart
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-cies-800 py-8 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-gray-300">© 2024 CIES. All rights reserved.</p>
          <div className="flex justify-center space-x-6 mt-4">
            <Link to="/about" className="text-gray-300 hover:text-white transition-colors">About</Link>
            <Link to="/contact" className="text-gray-300 hover:text-white transition-colors">Contact</Link>
            <Link to="/privacy" className="text-gray-300 hover:text-white transition-colors">Privacy Policy</Link>
            <Link to="/terms" className="text-gray-300 hover:text-white transition-colors">Terms of Service</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}