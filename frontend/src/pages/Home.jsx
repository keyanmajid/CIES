import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ShoppingCart, ChevronLeft, ChevronRight, User, LogOut, Sparkles, TrendingUp } from "lucide-react";
import { useCart } from "../context/CartContext";
import { useRecommendations } from "../context/RecommendationContext";

export default function Home() {
    const { addToCart, cartCount, isAuthenticated } = useCart();
    const { 
        personalizedRecs, 
        forYouRecs, 
        trendingRecs, 
        loading,
        mlServiceStatus,
        refreshAll 
    } = useRecommendations();
    
    const [userName, setUserName] = useState("Guest");
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const navigate = useNavigate();

    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isSearchLoading, setIsSearchLoading] = useState(false);

    const [products, setProducts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [current, setCurrent] = useState(0);
    const [currentProductIndex, setCurrentProductIndex] = useState(0);
    const productsPerView = 4;
    const productContainerRef = useRef(null);

    // ✅ Fixed: Helper function for backend images
    const backendImagePath = useCallback((filename) => {
        if (!filename || typeof filename !== 'string') {
            return '/placeholder.jpg';
        }
        const cleanFilename = filename.startsWith('/') ? filename.substring(1) : filename;
        return `https://cies-5dc4.onrender.com/public/${cleanFilename}`;
    }, []);

    const slides = useMemo(() => [
        { id: 1, img: "/slider/bhautik-patel-ui8yd5Qxv-Y-unsplash.jpg", title: "DESIGN SLIDER", topic: "ANIMAL", des: "Lorem ipsum dolor sit amet, consectetur adipisicing elit. Rem magnam nesciunt minima placeat." },
        { id: 2, img: "/slider/nimble-made-N0ke5zChVBU-unsplash.jpg", title: "MODERN DESIGN", topic: "NATURE", des: "Ut sequi, rem magnam nesciunt minima placeat, itaque eum neque officiis unde." },
        { id: 3, img: "/slider/martin-bammer-Y99t-LAsXmM-unsplash.jpg", title: "SIMPLE ART", topic: "TRAVEL", des: "Explicabo, laboriosam nisi reprehenderit tempora at laborum natus unde. Laudantium." },
        { id: 4, img: "/slider/cord-allman-1dmnxQ9mBfI-unsplash.jpg", title: "VISUAL BEAUTY", topic: "WILDLIFE", des: "Explicabo, laboriosam nisi reprehenderit tempora at laborum natus unde." },
    ], []);

    useEffect(() => {
        const fetchProducts = async () => {
            try {
                setIsLoading(true);
                const res = await fetch(`https://cies-5dc4.onrender.com/api/products?limit=16`);
                const data = await res.json();
                
                const productsData = Array.isArray(data) ? data : (data.products || data.results || []);
                setProducts(productsData.slice(0, 16));
            } catch (error) {
                console.error("Error fetching products:", error);
                setProducts([]);
            } finally {
                setIsLoading(false);
            }
        };
        fetchProducts();
    }, []);

    useEffect(() => {
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
            try {
                const user = JSON.parse(storedUser);
                if (user.name) setUserName(user.name.split(' ')[0]);
                else if (user.email) setUserName(user.email.split('@')[0]);
                else setUserName("Guest");
            } catch (err) {
                console.error("Error parsing user from localStorage:", err);
                setUserName("Guest");
            }
        } else {
            setUserName("Guest");
        }
    }, [isAuthenticated]);

    const handleLogout = useCallback(() => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.location.href = "/login";
    }, []);

    const handleSearch = useCallback(async (query) => {
        if (!query.trim()) {
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
                `https://cies-5dc4.onrender.com/api/products/search?query=${encodeURIComponent(query)}&limit=8`,
                { headers }
            );
            
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
            
            const data = await res.json();
            const results = Array.isArray(data) ? data : (data.results || data.products || []);
            setSearchResults(results.slice(0, 5));
        } catch (error) {
            console.error("Search error:", error);
            setSearchResults([]);
        } finally {
            setIsSearchLoading(false);
        }
    }, []);

    useEffect(() => {
        const trimmedQuery = searchQuery.trim();
        if (trimmedQuery === "") {
            setIsSearching(false);
            setIsSearchLoading(false);
            setSearchResults([]);
            return;
        }

        const delay = setTimeout(() => {
            handleSearch(trimmedQuery);
        }, 400);

        return () => clearTimeout(delay);
    }, [searchQuery, handleSearch]);

    const nextSlide = useCallback(() => setCurrent((current + 1) % slides.length), [current, slides.length]);
    const prevSlide = useCallback(() => setCurrent((current - 1 + slides.length) % slides.length), [current, slides.length]);

    const nextProducts = useCallback(() => {
        const displayProducts = isAuthenticated ? personalizedRecs : forYouRecs;
        const sliderProducts = displayProducts.slice(0, 8);
        const totalSlides = Math.ceil(Math.min(sliderProducts.length, 8) / productsPerView);
        setCurrentProductIndex((prev) => (prev < totalSlides - 1 ? prev + 1 : 0));
    }, [isAuthenticated, personalizedRecs, forYouRecs, productsPerView]);

    const prevProducts = useCallback(() => {
        const displayProducts = isAuthenticated ? personalizedRecs : forYouRecs;
        const sliderProducts = displayProducts.slice(0, 8);
        const totalSlides = Math.ceil(Math.min(sliderProducts.length, 8) / productsPerView);
        setCurrentProductIndex((prev) => (prev > 0 ? prev - 1 : totalSlides - 1));
    }, [isAuthenticated, personalizedRecs, forYouRecs, productsPerView]);

    useEffect(() => {
        if (productContainerRef.current) {
            const container = productContainerRef.current;
            const displayProducts = isAuthenticated ? personalizedRecs : forYouRecs;
            const sliderProducts = displayProducts.slice(0, 8);
            const totalProducts = Math.min(sliderProducts.length, 8);
            const totalSlides = Math.ceil(totalProducts / productsPerView);
            const scrollAmount = currentProductIndex * (container.scrollWidth / totalSlides);
            container.scrollTo({ left: scrollAmount, behavior: 'smooth' });
        }
    }, [currentProductIndex, isAuthenticated, personalizedRecs, forYouRecs, productsPerView]);

    useEffect(() => {
        const timer = setInterval(nextSlide, 6000);
        return () => clearInterval(timer);
    }, [nextSlide]);

    const formatPrice = useCallback((price) => {
        return typeof price === "number" ? `$${price.toFixed(2)}` : `$${parseFloat(price).toFixed(2)}`;
    }, []);

    // ✅ FIXED: Handle Add to Cart
    const handleAddToCart = useCallback(async (product) => {
        if (!isAuthenticated) {
            navigate("/login");
            return;
        }
        
        console.log("[HOME DEBUG] Adding product to cart:", {
            id: product._id || product.product_id,
            name: product.name,
            category: product.category,
            tags: product.tags,
            price: product.price
        });
        
        // Ensure product has the correct ID structure and tags
        const productToAdd = {
            ...product,
            _id: product._id || product.product_id,
            id: product._id || product.product_id || product.id,
            tags: product.tags || [], // Ensure tags exist
            category: product.category || "Uncategorized" // Ensure category exists
        };

        const result = await addToCart(productToAdd);
        if (result && result.success) {
            alert(`${product.name} added to cart!`);
            // Refresh recommendations after adding to cart
            setTimeout(() => {
                console.log("[HOME] Refreshing recommendations after add to cart");
                refreshAll();
            }, 1000);
        } else {
            console.error("[HOME ERROR] Add to cart failed:", result?.error);
            alert(result?.error || "Failed to add item to cart. Please try again.");
        }
    }, [addToCart, isAuthenticated, navigate, refreshAll]);

    // ✅ ML-Powered Recommended Products Section
    const RecommendedProductsSection = () => {
        const displayProducts = isAuthenticated ? personalizedRecs : forYouRecs;
        const sliderProducts = displayProducts.slice(0, 8);
        const sectionTitle = isAuthenticated ? "Recommended For You" : "You Might Like";
        const sectionSubtitle = isAuthenticated 
            ? "Personalized recommendations based on your activities"
            : "Popular items you might be interested in";

        if (loading.personalized || loading.forYou) {
            return (
                <section className="bg-cies-900 py-10 px-4 sm:px-6 md:px-10 relative">
                    <h2 className="text-2xl sm:text-3xl md:text-3xl font-bold text-white mb-2 text-center">
                        {sectionTitle}
                    </h2>
                    <p className="text-cies-300 text-center mb-6">{sectionSubtitle}</p>
                    <div className="flex space-x-4 md:space-x-6 overflow-x-auto scrollbar-hide px-2">
                        {Array.from({ length: 8 }).map((_, index) => (
                            <ProductSkeleton key={index} />
                        ))}
                    </div>
                </section>
            );
        }

        if (sliderProducts.length === 0) {
            return null;
        }

        return (
            <section className="bg-cies-900 py-10 px-4 sm:px-6 md:px-10 relative">
                <div className="flex items-center justify-center mb-2">
                    <Sparkles className="w-5 h-5 text-orange-500 mr-2" />
                    <h2 className="text-2xl sm:text-3xl md:text-3xl font-bold text-white text-center">
                        {sectionTitle}
                    </h2>
                    <Sparkles className="w-5 h-5 text-orange-500 ml-2" />
                </div>
                <p className="text-cies-300 text-center mb-6">{sectionSubtitle}</p>
                
                <div className="relative max-w-7xl mx-auto">
                    {sliderProducts.length > productsPerView && (
                        <>
                            <button onClick={prevProducts} className="absolute left-0 top-1/2 transform -translate-y-1/2 -translate-x-2 md:-translate-x-4 bg-cies-800 hover:bg-cies-700 text-white w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center z-20 transition-all duration-200">
                                <ChevronLeft className="w-4 h-4 md:w-6 md:h-6" />
                            </button>
                            <button onClick={nextProducts} className="absolute right-0 top-1/2 transform -translate-y-1/2 translate-x-2 md:translate-x-4 bg-cies-800 hover:bg-cies-700 text-white w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center z-20 transition-all duration-200">
                                <ChevronRight className="w-4 h-4 md:w-6 md:h-6" />
                            </button>
                        </>
                    )}

                    <div ref={productContainerRef} className="flex space-x-4 md:space-x-6 overflow-x-auto scrollbar-hide px-2 scroll-smooth snap-x snap-mandatory">
                        {sliderProducts.map((product, index) => (
                            <div 
                                key={product.product_id || product._id} 
                                className="flex-shrink-0 w-[200px] sm:w-[240px] md:w-[280px] h-[300px] sm:h-[350px] md:h-[400px] bg-cies-800 rounded-3xl shadow-md overflow-hidden relative group border-2 border-orange-500/30 snap-start"
                            >
                                <div className="absolute top-2 right-2 bg-orange-500 text-white text-xs px-2 py-1 rounded-full z-10">
                                    AI Recommended
                                </div>
                                <img
                                    src={backendImagePath(product.imageUrl)}
                                    alt={product.name}
                                    loading="lazy"
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                                <div className="absolute bottom-0 left-0 right-0 bg-black/70 p-3 sm:p-4 rounded-t-3xl border-t border-orange-500/30">
                                    <h3 className="text-sm sm:text-base md:text-lg font-semibold text-white truncate">{product.name}</h3>
                                    <p className="text-gray-300 text-xs sm:text-sm mb-1 line-clamp-2">{product.description}</p>
                                    <p className="text-orange-400 font-bold text-sm sm:text-lg mb-1">{formatPrice(product.price)}</p>
                                    {product.reason && (
                                        <p className="text-green-400 text-xs mb-2 truncate">✓ {product.reason}</p>
                                    )}
                                    <button 
                                        onClick={() => handleAddToCart({
                                            ...product,
                                            _id: product.product_id || product._id,
                                            product_id: product.product_id || product._id,
                                            tags: product.tags || [],
                                            category: product.category || "Uncategorized"
                                        })} 
                                        className="bg-orange-500 hover:bg-orange-600 text-white px-2 py-1 sm:px-4 sm:py-2 rounded-full font-semibold w-full text-xs sm:text-sm md:text-base transition-colors"
                                    >
                                        {isAuthenticated ? "Add to Cart" : "Login to Buy"}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {sliderProducts.length > productsPerView && (
                        <div className="flex justify-center mt-4 space-x-2">
                            {Array.from({ length: Math.ceil(sliderProducts.length / productsPerView) }).map((_, index) => (
                                <button
                                    key={index}
                                    onClick={() => setCurrentProductIndex(index)}
                                    className={`w-2 h-2 rounded-full transition-all ${
                                        index === currentProductIndex ? 'bg-orange-500 w-4' : 'bg-cies-600'
                                    }`}
                                />
                            ))}
                        </div>
                    )}
                </div>
                
                <div className="text-center mt-4">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                        mlServiceStatus === 'healthy' ? 'bg-green-500/20 text-green-400' : 
                        mlServiceStatus === 'unhealthy' ? 'bg-yellow-500/20 text-yellow-400' : 
                        'bg-gray-500/20 text-gray-400'
                    }`}>
                        {mlServiceStatus === 'healthy' ? '✓ AI Powered' : 
                         mlServiceStatus === 'unhealthy' ? '⚡ Basic Recommendations' : 
                         '⟳ Checking AI Service...'}
                    </span>
                </div>
            </section>
        );
    };

    // ✅ Trending Now Section
    const TrendingNowSection = () => {
        const trendingProducts = trendingRecs.length >= 16 ? trendingRecs.slice(0, 16) : products.slice(0, 16);
        const isMlPowered = trendingRecs.length >= 16;

        if (isLoading || loading.trending) {
            return (
                <section className="bg-cies-900 py-10 px-4 sm:px-6 md:px-10">
                    <div className="max-w-7xl mx-auto">
                        <div className="flex items-center justify-center mb-6">
                            <TrendingUp className="w-6 h-6 text-orange-500 mr-2" />
                            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white text-center">
                                Trending Now
                            </h2>
                            <TrendingUp className="w-6 h-6 text-orange-500 ml-2" />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 auto-rows-[200px]">
                            {Array.from({ length: 16 }).map((_, index) => (
                                <BentoGridSkeleton key={index} />
                            ))}
                        </div>
                    </div>
                </section>
            );
        }

        if (trendingProducts.length === 0) {
            return null;
        }

        return (
            <section className="bg-cies-900 py-10 px-4 sm:px-6 md:px-10">
                <div className="max-w-7xl mx-auto">
                    <div className="flex items-center justify-center mb-6">
                        <TrendingUp className="w-6 h-6 text-orange-500 mr-2" />
                        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white text-center">
                            Trending Now
                        </h2>
                        <TrendingUp className="w-6 h-6 text-orange-500 ml-2" />
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 auto-rows-[200px]">
                        {trendingProducts.map((item, index) => (
                            <div 
                                key={item.product_id || item._id} 
                                className="relative group rounded-3xl shadow-md overflow-hidden hover:-translate-y-1 transition-transform duration-300 row-span-2"
                            >
                                {isMlPowered && index < 4 && (
                                    <div className="absolute top-2 right-2 bg-purple-500 text-white text-xs px-2 py-1 rounded-full z-10">
                                        Hot 🔥
                                    </div>
                                )}
                                
                                {isMlPowered && item.popularity_score > 10 && (
                                    <div className="absolute top-2 left-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full z-10">
                                        Popular
                                    </div>
                                )}
                                
                                <img
                                    src={backendImagePath(item.imageUrl)}
                                    alt={item.name}
                                    loading={index < 8 ? "eager" : "lazy"}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                                <div className="absolute bottom-0 left-0 right-0 bg-black/70 p-3 sm:p-4 rounded-t-3xl border-t border-white/10">
                                    <h3 className="text-sm sm:text-base md:text-lg font-semibold text-white truncate">{item.name}</h3>
                                    <p className="text-gray-300 text-xs sm:text-sm mb-1 line-clamp-2">{item.description}</p>
                                    <p className="text-orange-400 font-bold text-sm sm:text-lg mb-1">{formatPrice(item.price)}</p>
                                    
                                    {isMlPowered && item.popularity_score && (
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-green-400 text-xs">
                                                ⭐ {Math.round(item.popularity_score)} interactions
                                            </span>
                                            {item.purchase_count > 0 && (
                                                <span className="text-blue-400 text-xs">
                                                    🛒 {item.purchase_count} bought
                                                </span>
                                            )}
                                        </div>
                                    )}
                                    
                                    <button 
                                        onClick={() => handleAddToCart({
                                            ...item,
                                            _id: item.product_id || item._id,
                                            product_id: item.product_id || item._id,
                                            tags: item.tags || [],
                                            category: item.category || "Uncategorized"
                                        })} 
                                        className="bg-orange-500 hover:bg-orange-600 text-white px-2 py-1 sm:px-4 sm:py-2 rounded-full font-semibold w-full text-xs sm:text-sm md:text-base transition-colors"
                                    >
                                        {isAuthenticated ? "Add to Cart" : "Login to Buy"}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                    
                    <div className="text-center mt-6">
                        <div className="flex items-center justify-center space-x-4">
                            <p className="text-cies-400 text-sm">
                                Showing {trendingProducts.length} trending products
                            </p>
                            <span className={`text-xs px-2 py-1 rounded-full ${
                                isMlPowered ? 'bg-purple-500/20 text-purple-400' : 'bg-gray-500/20 text-gray-400'
                            }`}>
                                {isMlPowered ? '🎯 ML Trending' : '📊 Popular Products'}
                            </span>
                        </div>
                    </div>
                </div>
            </section>
        );
    };

    const ProductSkeleton = () => (
        <div className="flex-shrink-0 w-[200px] sm:w-[240px] md:w-[280px] h-[300px] sm:h-[350px] md:h-[400px] bg-cies-800 rounded-3xl shadow-md overflow-hidden relative animate-pulse">
            <div className="w-full h-3/4 bg-cies-700"></div>
            <div className="absolute bottom-0 left-0 right-0 bg-cies-800 p-4 rounded-t-3xl">
                <div className="h-4 bg-cies-700 rounded mb-2"></div>
                <div className="h-3 bg-cies-700 rounded mb-2 w-3/4"></div>
                <div className="h-4 bg-cies-700 rounded mb-3 w-1/2"></div>
                <div className="h-8 bg-cies-700 rounded"></div>
            </div>
        </div>
    );

    const BentoGridSkeleton = () => (
        <div className="relative rounded-3xl shadow-md overflow-hidden row-span-2 animate-pulse">
            <div className="w-full h-full bg-cies-700"></div>
            <div className="absolute bottom-0 left-0 right-0 bg-cies-800 p-4 rounded-t-3xl">
                <div className="h-4 bg-cies-700 rounded mb-2"></div>
                <div className="h-3 bg-cies-700 rounded mb-2 w-3/4"></div>
                <div className="h-4 bg-cies-700 rounded mb-3 w-1/2"></div>
                <div className="h-8 bg-cies-700 rounded"></div>
            </div>
        </div>
    );

    const SearchResultSkeleton = () => (
        <div className="flex items-center justify-between p-3 border-b border-cies-700 animate-pulse">
            <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-cies-700 rounded-md flex-shrink-0"></div>
                <div>
                    <div className="h-4 bg-cies-700 rounded w-32 mb-2"></div>
                    <div className="h-3 bg-cies-700 rounded w-16"></div>
                </div>
            </div>
            <div className="bg-cies-700 w-12 h-6 rounded-full flex-shrink-0"></div>
        </div>
    );

    return (
        <div className="min-h-screen w-full bg-cies-900 text-white">
            {/* NAVBAR */}
            <nav className="flex items-center justify-between p-4 bg-cies-900 shadow-md sticky top-0 z-50">
                <div className="flex items-center space-x-4">
                    <button
                        className="md:hidden w-6 h-5 flex flex-col justify-between"
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                    >
                        <span className="w-full h-0.5 bg-white"></span>
                        <span className="w-full h-0.5 bg-white"></span>
                        <span className="w-full h-0.5 bg-white"></span>
                    </button>

                    <div className="hidden md:flex space-x-6">
                        <Link to="/">Home</Link>
                        <Link to="/chat/customer">Customer Care</Link>
                        <Link to="/login">Login</Link>
                        <Link to="/signup">Sign Up</Link>
                        <Link to="/products">Products</Link>
                    </div>
                </div>

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

                    {isSearching && (
                        <div className="absolute top-full mt-2 w-full max-w-md bg-cies-800 border border-cies-700 rounded-xl shadow-2xl max-h-80 overflow-y-auto z-50">
                            {isSearchLoading ? (
                                <>
                                    {Array.from({ length: 3 }).map((_, index) => (
                                        <SearchResultSkeleton key={index} />
                                    ))}
                                </>
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
                                                    loading="lazy"
                                                />
                                                <div>
                                                    <h4 className="text-sm font-semibold truncate max-w-[150px]">{product.name}</h4>
                                                    <p className="text-orange-400 text-xs">{formatPrice(product.price)}</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleAddToCart({
                                                    ...product,
                                                    _id: product._id,
                                                    product_id: product._id,
                                                    tags: product.tags || [],
                                                    category: product.category || "Uncategorized"
                                                })}
                                                className="bg-orange-500 hover:bg-orange-600 text-white px-3 py-1 text-xs rounded-full flex items-center flex-shrink-0"
                                            >
                                                {isAuthenticated ? "Add" : "Login"}
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

                <div className="flex items-center space-x-4">
                    {isAuthenticated ? (
                        <div className="hidden md:flex items-center space-x-2">
                            <div className="bg-cies-800 px-4 py-2 rounded-full text-sm flex items-center space-x-2">
                                <User className="w-4 h-4 text-cies-300" />
                                <span>Hello, {userName}</span>
                            </div>
                            <button
                                onClick={handleLogout}
                                className="bg-red-600 hover:bg-red-700 px-3 py-2 rounded-full text-sm flex items-center space-x-1 transition-colors"
                                title="Logout"
                            >
                                <LogOut className="w-4 h-4" />
                                <span className="hidden sm:inline">Logout</span>
                            </button>
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

            {isMenuOpen && (
                <div className="md:hidden absolute top-[64px] left-0 right-0 bg-cies-800 border-t border-cies-700 shadow-xl z-40">
                    <div className="flex flex-col p-4 space-y-3">
                        <Link to="/" onClick={() => setIsMenuOpen(false)} className="py-2 text-cies-300 hover:text-white border-b border-cies-700/50">Home</Link>
                        <Link to="/chat/customer" onClick={() => setIsMenuOpen(false)} className="py-2 text-cies-300 hover:text-white border-b border-cies-700/50">Customer Care</Link>
                        <Link to="/login" onClick={() => setIsMenuOpen(false)} className="py-2 text-cies-300 hover:text-white border-b border-cies-700/50">Login</Link>
                        <Link to="/signup" onClick={() => setIsMenuOpen(false)} className="py-2 text-cies-300 hover:text-white border-b border-cies-700/50">Sign Up</Link>
                        <Link to="/manager-dashboard" onClick={() => setIsMenuOpen(false)} className="py-2 text-cies-300 hover:text-white">Manager Dashboard</Link>
                        {isAuthenticated && (
                            <button
                                onClick={() => {
                                    handleLogout();
                                    setIsMenuOpen(false);
                                }}
                                className="py-2 text-red-400 hover:text-red-300 text-left border-t border-cies-700/50 mt-2"
                            >
                                Logout
                            </button>
                        )}
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
                                <img 
                                    src={slide.img} 
                                    alt={slide.title} 
                                    className="w-full h-full object-cover" 
                                    loading={index === 0 ? "eager" : "lazy"}
                                />
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

                    {/* ML-POWERED RECOMMENDATIONS SECTION */}
                    <RecommendedProductsSection />

                    {/* ML-POWERED TRENDING NOW SECTION */}
                    <TrendingNowSection />

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