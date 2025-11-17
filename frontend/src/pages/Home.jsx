import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { ShoppingCart, ChevronLeft, ChevronRight, User } from "lucide-react";
import { useCart } from "../context/CartContext";

export default function Home() {
    const { addToCart, cartCount, isAuthenticated } = useCart();
    const [userName, setUserName] = useState("Guest");
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isSearchLoading, setIsSearchLoading] = useState(false);

    // ✅ FIXED: Helper function for backend images
    const backendImagePath = (filename) => {
        if (!filename || typeof filename !== 'string') {
            return '/placeholder.jpg';
        }
        const cleanFilename = filename.startsWith('/') ? filename.substring(1) : filename;
        return `https://cies-5dc4.onrender.com/public/${cleanFilename}`;
    };

    // CAROUSEL SLIDES
    const slides = [
        { id: 1, img: "/slider/bhautik-patel-ui8yd5Qxv-Y-unsplash.jpg", title: "DESIGN SLIDER", topic: "ANIMAL", des: "Lorem ipsum dolor sit amet, consectetur adipisicing elit. Rem magnam nesciunt minima placeat." },
        { id: 2, img: "/slider/nimble-made-N0ke5zChVBU-unsplash.jpg", title: "MODERN DESIGN", topic: "NATURE", des: "Ut sequi, rem magnam nesciunt minima placeat, itaque eum neque officiis unde." },
        { id: 3, img: "/slider/martin-bammer-Y99t-LAsXmM-unsplash.jpg", title: "SIMPLE ART", topic: "TRAVEL", des: "Explicabo, laboriosam nisi reprehenderit tempora at laborum natus unde. Laudantium." },
        { id: 4, img: "/slider/cord-allman-1dmnxQ9mBfI-unsplash.jpg", title: "VISUAL BEAUTY", topic: "WILDLIFE", des: "Explicabo, laboriosam nisi reprehenderit tempora at laborum natus unde." },
    ];

    const [products, setProducts] = useState([]);
    const [bentoItems, setBentoItems] = useState([]);
    const [current, setCurrent] = useState(0);
    const [currentProductIndex, setCurrentProductIndex] = useState(0);
    const productsPerView = 4;
    const productContainerRef = useRef(null);

    // ✅ FIXED: Fetch products from backend
    useEffect(() => {
        const fetchProducts = async () => {
            try {
                const res = await fetch(`https://cies-5dc4.onrender.com/api/products`);
                const data = await res.json();
                setProducts(data);
                setBentoItems(data);
            } catch (error) {
                console.error("Error fetching products:", error);
            }
        };
        fetchProducts();
    }, []);

    // Get user name from token/localStorage
    useEffect(() => {
        const getUserName = () => {
            try {
                const token = localStorage.getItem("token");
                if (token) {
                    const payload = JSON.parse(atob(token.split('.')[1]));
                    if (payload.name) setUserName(payload.name.split(' ')[0]);
                    else if (payload.email) setUserName(payload.email.split('@')[0]);
                } else setUserName("Guest");
            } catch (error) {
                console.error("Error getting user name:", error);
                setUserName("Guest");
            }
        };
        getUserName();
    }, [isAuthenticated]);

    // ✅ FIXED: Search function
    const handleSearch = async () => {
        const trimmedQuery = searchQuery.trim();
        
        if (trimmedQuery === "") {
            setSearchResults([]);
            setIsSearching(false);
            return;
        }

        setIsSearchLoading(true);
        setIsSearching(true);

        try {
            const token = localStorage.getItem("token");
            const headers = {
                'Content-Type': 'application/json',
            };
            
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const res = await fetch(
                `https://cies-5dc4.onrender.com/api/products/search?query=${encodeURIComponent(trimmedQuery)}`,
                { headers }
            );
            
            if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}`);
            }
            const data = await res.json();
            setSearchResults(data);
        } catch (error) {
            console.error("Search error:", error);
            setSearchResults([]);
        } finally {
            setIsSearchLoading(false);
        }
    };

    // Debounce search
    useEffect(() => {
        if (searchQuery.trim() === "") {
            setIsSearching(false);
            setIsSearchLoading(false);
            setSearchResults([]);
            return;
        }

        const delay = setTimeout(() => {
            handleSearch();
        }, 400);

        return () => clearTimeout(delay);
    }, [searchQuery]);

    const nextSlide = () => setCurrent((current + 1) % slides.length);
    const prevSlide = () => setCurrent((current - 1 + slides.length) % slides.length);

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

    // Shuffle Bento Grid randomly
    useEffect(() => {
        const timer = setTimeout(() => {
            setBentoItems(prev => [...prev].sort(() => Math.random() - 0.5));
        }, 2000);
        return () => clearTimeout(timer);
    }, []);

    const formatPrice = (price) => {
        return typeof price === "number" ? `$${price.toFixed(2)}` : `$${parseFloat(price).toFixed(2)}`;
    };

    const handleAddToCart = async (product) => {
        const result = await addToCart(product);
        if (result && result.success) alert(`${product.name} added to cart!`);
        else alert(result?.error || "Failed to add item to cart. Please try again.");
    };

    return (
        <div className="min-h-screen w-full bg-cies-900 text-white">
            {/* NAVBAR */}
            <nav className="flex items-center justify-between p-4 bg-cies-900 shadow-md sticky top-0 z-50">
                <div className="flex items-center space-x-4">
                    {/* Burger Button */}
                    <button
                        className="md:hidden w-6 h-5 flex flex-col justify-between"
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                    >
                        <span className="w-full h-0.5 bg-white"></span>
                        <span className="w-full h-0.5 bg-white"></span>
                        <span className="w-full h-0.5 bg-white"></span>
                    </button>

                    {/* Desktop Links */}
                    <div className="hidden md:flex space-x-6">
                        <Link to="/">Home</Link>
                        <Link to="/chat/customer">Customer Care</Link>
                        <Link to="/login">Login</Link>
                        <Link to="/signup">Sign Up</Link>
                        <Link to="/manager-dashboard">Manager Dashboard</Link>
                    </div>
                </div>

                {/* SEARCH BAR CONTAINER */}
                <div className="flex items-center w-full md:w-1/3 relative"> 
                    <div className="w-full max-w-md border border-cies-700 rounded-full bg-cies-850/60 px-3 py-2">
                        <input
                            type="search"
                            placeholder="Search..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onBlur={() => setTimeout(() => setIsSearching(false), 200)}
                            onFocus={() => searchQuery.trim() !== "" && setIsSearching(true)}
                            className="w-full bg-transparent outline-none"
                        />
                    </div>

                    {/* SEARCH RESULTS OVERLAY */}
                    {isSearching && (
                        <div className="absolute top-full mt-2 w-full max-w-md bg-cies-800 border border-cies-700 rounded-xl shadow-2xl max-h-80 overflow-y-auto z-50">
                            {isSearchLoading ? (
                                <div className="p-3 text-center text-gray-400">Searching...</div>
                            ) : searchResults.length > 0 ? (
                                <>
                                    {searchResults.slice(0, 5).map((product) => (
                                        <div 
                                            key={product._id} 
                                            className="flex items-center justify-between p-3 border-b border-cies-700 last:border-b-0 hover:bg-cies-700/50 transition-colors"
                                        >
                                            <div className="flex items-center space-x-3">
                                                <img
                                                    src={backendImagePath(product.imageUrl)}
                                                    alt={product.name}
                                                    className="w-10 h-10 object-cover rounded-md flex-shrink-0"
                                                />
                                                <div>
                                                    <h4 className="text-sm font-semibold truncate max-w-[150px]">{product.name}</h4>
                                                    <p className="text-orange-400 text-xs">{formatPrice(product.price)}</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleAddToCart(product)}
                                                className="bg-orange-500 hover:bg-orange-600 text-white px-3 py-1 text-xs rounded-full flex items-center flex-shrink-0"
                                            >
                                                Add
                                            </button>
                                        </div>
                                    ))}
                                    <Link 
                                        to={`/search-results?query=${searchQuery}`} 
                                        className="block text-center py-2 text-sm text-cies-300 hover:text-white border-t border-cies-700"
                                        onClick={() => setIsSearching(false)}
                                    >
                                        See all {searchResults.length} results
                                    </Link>
                                </>
                            ) : (
                                <div className="p-3 text-center text-gray-400">No products found for "{searchQuery}"</div>
                            )}
                        </div>
                    )}
                </div>

                {/* USER + CART */}
                <div className="flex items-center space-x-4">
                    {isAuthenticated ? (
                        <div className="hidden md:flex items-center space-x-2 bg-cies-800 px-4 py-2 rounded-full text-sm">
                            <User className="w-4 h-4 text-cies-300" />
                            <span>Hello, {userName}</span>
                        </div>
                    ) : (
                        <Link to="/login" className="hidden md:flex items-center space-x-2 bg-cies-800 px-4 py-2 rounded-full hover:bg-cies-700 transition-colors">
                            <User className="w-4 h-4 text-cies-300" />
                            <span>Login</span>
                        </Link>
                    )}

                    <Link to="/cart" className="relative bg-cies-800 hover:bg-cies-700 w-10 h-10 rounded-full flex items-center justify-center transition-colors">
                        <ShoppingCart className="w-5 h-5" />
                        <span className="absolute -top-1 -right-1 bg-red-500 text-xs w-4 h-4 rounded-full flex items-center justify-center">
                            {cartCount}
                        </span>
                    </Link>
                </div>
            </nav>

            {/* MOBILE MENU */}
            {isMenuOpen && (
                <div className="md:hidden absolute top-[64px] left-0 right-0 bg-cies-800 border-t border-cies-700 shadow-xl z-40">
                    <div className="flex flex-col p-4 space-y-3">
                        <Link to="/" onClick={() => setIsMenuOpen(false)} className="py-2 text-cies-300 hover:text-white border-b border-cies-700/50">Home</Link>
                        <Link to="/chat/customer" onClick={() => setIsMenuOpen(false)} className="py-2 text-cies-300 hover:text-white border-b border-cies-700/50">Customer Care</Link>
                        <Link to="/login" onClick={() => setIsMenuOpen(false)} className="py-2 text-cies-300 hover:text-white border-b border-cies-700/50">Login</Link>
                        <Link to="/signup" onClick={() => setIsMenuOpen(false)} className="py-2 text-cies-300 hover:text-white border-b border-cies-700/50">Sign Up</Link>
                        <Link to="/manager-dashboard" onClick={() => setIsMenuOpen(false)} className="py-2 text-cies-300 hover:text-white">Manager Dashboard</Link>
                    </div>
                </div>
            )}

            {/* MAIN CONTENT */}
            {!isSearching && (
                <>
                    {/* CAROUSEL */}
                    <div className="relative w-full h-[60vh] md:h-[90vh] overflow-hidden">
                        {slides.map((slide, index) => (
                            <div key={slide.id} className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${index === current ? "opacity-100 z-10" : "opacity-0 z-0"}`}>
                                <img src={slide.img} alt={slide.title} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/50 flex flex-col justify-center items-start px-4 sm:px-10 md:px-20 text-left">
                                    <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold mt-2">{slide.title}</h2>
                                    <h3 className="text-xl sm:text-2xl md:text-3xl font-semibold text-orange-500 mt-2">{slide.topic}</h3>
                                    <p className="mt-2 sm:mt-4 max-w-xs sm:max-w-xl md:max-w-2xl text-gray-200">{slide.des}</p>
                                </div>
                            </div>
                        ))}
                        <button onClick={prevSlide} className="absolute left-2 md:left-4 top-1/2 transform -translate-y-1/2 -mt-4 bg-black/50 hover:bg-black/70 text-white w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center z-20 transition-all duration-200">
                            <ChevronLeft className="w-4 h-4 md:w-6 md:h-6" />
                        </button>
                        <button onClick={nextSlide} className="absolute right-2 md:right-4 top-1/2 transform -translate-y-1/2 -mt-4 bg-black/50 hover:bg-black/70 text-white w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center z-20 transition-all duration-200">
                            <ChevronRight className="w-4 h-4 md:w-6 md:h-6" />
                        </button>
                        <div className="absolute bottom-2 md:bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-1 md:space-x-2 z-20">
                            {slides.map((_, index) => (
                                <button key={index} onClick={() => setCurrent(index)} className={`w-2 h-2 md:w-3 md:h-3 rounded-full transition-all duration-300 ${index === current ? 'bg-orange-500 scale-125' : 'bg-white/50'}`} />
                            ))}
                        </div>
                    </div>

                    {/* RECOMMENDED PRODUCTS */}
                    <section className="bg-cies-900 py-10 px-4 sm:px-6 md:px-10 relative">
                        <h2 className="text-2xl sm:text-3xl md:text-3xl font-bold text-white mb-6 text-center">Recommended For You</h2>
                        <div className="relative max-w-7xl mx-auto">
                            <button onClick={prevProducts} className="absolute left-0 top-1/2 transform -translate-y-1/2 -translate-x-2 md:-translate-x-4 bg-cies-800 hover:bg-cies-700 text-white w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center z-20 transition-all duration-200">
                                <ChevronLeft className="w-4 h-4 md:w-6 md:h-6" />
                            </button>
                            <button onClick={nextProducts} className="absolute right-0 top-1/2 transform -translate-y-1/2 translate-x-2 md:translate-x-4 bg-cies-800 hover:bg-cies-700 text-white w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center z-20 transition-all duration-200">
                                <ChevronRight className="w-4 h-4 md:w-6 md:h-6" />
                            </button>

                            <div ref={productContainerRef} className="flex space-x-4 md:space-x-6 overflow-x-auto scrollbar-hide px-2 scroll-smooth">
                                {products.map((product) => (
                                    <div key={product._id} className="flex-shrink-0 w-[200px] sm:w-[240px] md:w-[280px] h-[300px] sm:h-[350px] md:h-[400px] bg-cies-800 rounded-3xl shadow-md overflow-hidden relative group">
                                        <img
                                            src={backendImagePath(product.imageUrl)}
                                            alt={product.name}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                        />
                                        <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-3 sm:p-4 rounded-t-3xl border-t border-white/10">
                                            <h3 className="text-sm sm:text-base md:text-lg font-semibold text-white">{product.name}</h3>
                                            <p className="text-gray-300 text-xs sm:text-sm mb-1">{product.description}</p>
                                            <p className="text-orange-400 font-bold text-sm sm:text-lg mb-1">{formatPrice(product.price)}</p>
                                            <button onClick={() => handleAddToCart(product)} className="bg-orange-500 hover:bg-orange-600 text-white px-2 py-1 sm:px-4 sm:py-2 rounded-full font-semibold w-full text-xs sm:text-sm md:text-base">
                                                Add to Cart
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>

                    {/* BENTO GRID */}
                    <section className="bg-cies-900 py-10 px-4 sm:px-6 md:px-10">
                        <div className="max-w-7xl mx-auto">
                            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-6 text-center">Trending Products</h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 auto-rows-[200px]">
                                {bentoItems.map((item) => (
                                    <div key={item._id} className="relative group rounded-3xl shadow-md overflow-hidden hover:-translate-y-1 transition-transform duration-300 row-span-2">
                                        <img
                                            src={backendImagePath(item.imageUrl)}
                                            alt={item.name}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                        />
                                        <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-3 sm:p-4 rounded-t-3xl border-t border-white/10">
                                            <h3 className="text-sm sm:text-base md:text-lg font-semibold text-white">{item.name}</h3>
                                            <p className="text-gray-300 text-xs sm:text-sm mb-1 line-clamp-2">{item.description}</p>
                                            <p className="text-orange-400 font-bold text-sm sm:text-lg mb-1">{formatPrice(item.price)}</p>
                                            <button onClick={() => handleAddToCart(item)} className="bg-orange-500 hover:bg-orange-600 text-white px-2 py-1 sm:px-4 sm:py-2 rounded-full font-semibold w-full text-xs sm:text-sm md:text-base">
                                                Add to Cart
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>

                    {/* FOOTER */}
                    <footer className="bg-cies-800 py-8 px-4 sm:px-6 md:px-10">
                        <div className="max-w-7xl mx-auto text-center">
                            <p className="text-gray-300 text-xs sm:text-sm md:text-base">© 2024 CIES. All rights reserved.</p>
                            <div className="flex flex-wrap justify-center space-x-2 sm:space-x-4 md:space-x-6 mt-4">
                                <Link to="/about" className="text-gray-300 hover:text-white transition-colors text-xs sm:text-sm md:text-base">About</Link>
                                <Link to="/contact" className="text-gray-300 hover:text-white transition-colors text-xs sm:text-sm md:text-base">Contact</Link>
                                <Link to="/privacy" className="text-gray-300 hover:text-white transition-colors text-xs sm:text-sm md:text-base">Privacy Policy</Link>
                                <Link to="/terms" className="text-gray-300 hover:text-white transition-colors text-xs sm:text-sm md:text-base">Terms of Service</Link>
                            </div>
                        </div>
                    </footer>
                </>
            )}
        </div>
    );
}