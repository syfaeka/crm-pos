import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, RotateCcw } from 'lucide-react';
import ProductCard from './components/ProductCard';
import CartSidebar from './components/CartSidebar';
import PaymentModal from './components/PaymentModal';
import useCart from '../../hooks/useCart';
import api from '../../lib/api';

export default function PosPage() {
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState('');
    const [isPaymentOpen, setPaymentOpen] = useState(false);
    const [totals, setTotals] = useState({ subtotal: 0, tax: 0, total: 0 });

    const { cart, addToCart, updateQuantity, removeFromCart, clearCart } = useCart();

    const { data: products = [], isLoading, error, refetch } = useQuery({
        queryKey: ['products', search, category],
        queryFn: async () => {
            const params = {};
            if (search) params.search = search;
            if (category) params.category_id = category;
            const response = await api.get('/products', { params });
            return response.data.data;
        }
    });

    const { data: categories = [] } = useQuery({
        queryKey: ['categories'],
        queryFn: async () => { 
            try {
                const res = await api.get('/categories');
                return res.data.data || [];
            } catch {
                return [];
            }
        }
    });

    const handleCheckout = (calculatedTotals) => {
        setTotals(calculatedTotals);
        setPaymentOpen(true);
    };

    const handlePaymentSuccess = () => {
        clearCart();
    };

    return (
        <div className="flex h-[calc(100vh-4rem)] lg:h-screen lg:pt-0 overflow-hidden bg-gray-100">

            {/* Left Side: Products */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Header / Filter Toolbar */}
                <div className="bg-white p-4 border-b border-gray-200 shadow-sm z-10">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="relative flex-1 max-w-lg">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Search className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                                type="text"
                                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary focus:border-primary sm:text-sm transition duration-150 ease-in-out"
                                placeholder="Search products by name, SKU, or barcode..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                autoFocus
                            />
                        </div>

                        {/* Simple Category Tabs (Mock or Real) */}
                        <div className="flex space-x-2 overflow-x-auto pb-1 md:pb-0 scrollbar-hide">
                            <button
                                onClick={() => setCategory('')}
                                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${category === ''
                                    ? 'bg-gray-900 text-white'
                                    : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                                    }`}
                            >
                                All Items
                            </button>
                            {categories.map((cat) => (
                                <button
                                    key={cat.id}
                                    onClick={() => setCategory(cat.id)}
                                    className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${category === cat.id
                                        ? 'bg-gray-900 text-white'
                                        : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                                        }`}
                                >
                                    {cat.name}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Product Grid */}
                <div className="flex-1 overflow-y-auto p-4">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-64">
                            <RotateCcw className="w-8 h-8 animate-spin text-gray-400" />
                        </div>
                    ) : error ? (
                        <div className="text-center text-red-500 py-10">
                            Failed to load products. <button onClick={() => refetch()} className="underline">Retry</button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                            {products.map((product) => (
                                <ProductCard
                                    key={product.id}
                                    product={product}
                                    onAddToCart={addToCart}
                                />
                            ))}
                            {products.length === 0 && (
                                <div className="col-span-full text-center text-gray-500 py-20">
                                    No products found.
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Right Side: Cart Sidebar */}
            <div className="w-96 hidden lg:block h-full">
                <CartSidebar
                    cart={cart}
                    onUpdateQty={updateQuantity}
                    onRemove={removeFromCart}
                    onCheckout={handleCheckout}
                    onClear={clearCart}
                    onAddToCart={addToCart}
                />
            </div>

            {/* Validation & Payment Modal */}
            <PaymentModal
                open={isPaymentOpen}
                onClose={() => setPaymentOpen(false)}
                totals={totals}
                cart={cart}
                onSuccess={handlePaymentSuccess}
            />
        </div>
    );
}
