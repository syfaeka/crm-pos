import { useState, useEffect } from 'react';
import { Trash2, Plus, Minus, CreditCard, Ticket, X, Loader2, User, Search, Star, ShoppingBag, Crown } from 'lucide-react';
import { cn } from '../../../lib/utils';
import api from '../../../lib/api';

export default function CartSidebar({ cart, onUpdateQty, onRemove, onCheckout, onClear, onAddToCart }) {
    //  STATE VOUCHER 
    const [voucherCode, setVoucherCode] = useState('');
    const [voucherLoading, setVoucherLoading] = useState(false);
    const [voucher, setVoucher] = useState(null);
    const [voucherError, setVoucherError] = useState('');

    //  STATE CUSTOMER 
    const [customerSearch, setCustomerSearch] = useState('');
    const [customers, setCustomers] = useState([]);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [showCustomerList, setShowCustomerList] = useState(false);
    const [isSearchingCustomer, setIsSearchingCustomer] = useState(false);

    // STATE FAVORITES
    const [favorites, setFavorites] = useState([]);
    const [loadingFavorites, setLoadingFavorites] = useState(false);

    // STATE SETTINGS
    const [storeSettings, setStoreSettings] = useState({ tax_rate: 11 });

    useEffect(() => {
        try {
            const savedSettings = localStorage.getItem('storeSettings');
            if (savedSettings) {
                setStoreSettings(JSON.parse(savedSettings));
            }
        } catch (error) {
            console.error("Error parsing store settings", error);
        }
    }, []);


    useEffect(() => {
        if (cart.length === 0) {
            setVoucher(null);
            setVoucherCode('');
            setVoucherError('');
         
        }
    }, [cart.length]); 
    // ------------------------------------------------

    // CALCULATE TIER 
    const getTierInfo = (customer) => {
        if (!customer) return null;
        const spent = parseFloat(customer.total_spent || 0);

        if (spent > 5000000) return { name: 'Gold', color: 'bg-yellow-100 text-yellow-800 border-yellow-200', iconColor: 'text-yellow-600', discount: 10 };
        if (spent >= 1000000) return { name: 'Silver', color: 'bg-slate-100 text-slate-800 border-slate-200', iconColor: 'text-slate-600', discount: 5 };
        return { name: 'Bronze', color: 'bg-amber-100 text-amber-900 border-amber-200', iconColor: 'text-amber-700', discount: 0 };
    };

    const customerTier = selectedCustomer ? getTierInfo(selectedCustomer) : null;

    // CALCULATIONS
    const subtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);

    // Calculate estimated tier discount
    const tierDiscountPercent = customerTier?.discount || 0;
    const tierDiscountAmount = subtotal * (tierDiscountPercent / 100);

    const voucherDiscountAmount = voucher?.discount_amount || 0;

    // Total discount 
    const totalDiscount = tierDiscountAmount + voucherDiscountAmount;

    const taxableAmount = subtotal - totalDiscount;
    const taxRateDecimal = (storeSettings.tax_rate || 0) / 100;
    const tax = Math.max(0, taxableAmount) * taxRateDecimal;

    const total = Math.max(0, taxableAmount + tax);
    const pointsEarned = Math.floor(total / 10000);

    // CUSTOMER LOGIC
    const handleSearchCustomer = async (value) => {
        setCustomerSearch(value);
        setIsSearchingCustomer(true);
        try {
            const { data } = await api.get(`/customers?search=${value}`);
            setCustomers(data.data || []);
            setShowCustomerList(true);
        } catch (error) {
            console.error("Failed to fetch customers", error);
        } finally {
            setIsSearchingCustomer(false);
        }
    };

    const selectCustomer = async (customer) => {
        setSelectedCustomer(customer);
        setCustomerSearch('');
        setShowCustomerList(false);

        // Fetch favorites
        setLoadingFavorites(true);
        setFavorites([]);
        try {
            const { data } = await api.get(`/customers/${customer.id}/favorites`);
            if (data.data) {
                setFavorites(data.data);
            }
        } catch (error) {
            console.error("Failed to fetch favorites", error);
        } finally {
            setLoadingFavorites(false);
        }
    };

    const removeCustomer = () => {
        setSelectedCustomer(null);
        setCustomerSearch('');
        setFavorites([]);
    };

    //VOUCHER LOGIC
    const applyVoucher = async () => {
        if (!voucherCode.trim()) return;
        setVoucherLoading(true);
        setVoucherError('');

        try {
            const { data } = await api.post('/vouchers/validate', {
                code: voucherCode,
                subtotal: subtotal
            });
            setVoucher(data.data);
        } catch (err) {
            setVoucherError(err.response?.data?.message || 'Invalid voucher');
            setVoucher(null);
        } finally {
            setVoucherLoading(false);
        }
    };

    const removeVoucher = () => {
        setVoucher(null);
        setVoucherCode('');
        setVoucherError('');
    };

    return (
        <div className="flex flex-col h-full bg-white border-l border-gray-200 shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <h2 className="font-bold text-gray-800 flex items-center">
                    <CreditCard className="w-5 h-5 mr-2 text-primary" />
                    Current Order
                </h2>
                <button
                    onClick={onClear}
                    className="text-xs text-red-500 hover:bg-red-50 px-2 py-1 rounded transition-colors"
                    disabled={cart.length === 0}
                >
                    Clear
                </button>
            </div>

            {/* --- CUSTOMER SELECTOR --- */}
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 relative z-20">
                {selectedCustomer ? (
                    <div className="space-y-3">
                        <div className={cn("flex items-center justify-between p-3 rounded-lg border", customerTier?.color)}>
                            <div className="flex items-center overflow-hidden">
                                <div className="relative mr-3 shrink-0">
                                    <div className="w-10 h-10 rounded-full bg-white/50 flex items-center justify-center">
                                        <User className={cn("w-5 h-5", customerTier?.iconColor)} />
                                    </div>
                                    <div className="absolute -top-1 -right-1 bg-white rounded-full p-0.5 shadow-sm">
                                        <Crown className={cn("w-3 h-3", customerTier?.iconColor)} fill="currentColor" />
                                    </div>
                                </div>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                        <p className="text-sm font-bold truncate">{selectedCustomer.name}</p>
                                        <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 bg-white/60 rounded-full border border-white/20">
                                            {customerTier?.name}
                                        </span>
                                    </div>
                                    <p className="text-xs opacity-80 truncate">
                                        {selectedCustomer.total_points || 0} Points
                                    </p>
                                </div>
                            </div>
                            <button onClick={removeCustomer} className="p-1 hover:bg-white/50 rounded transition-colors">
                                <X className="w-4 h-4 opacity-60" />
                            </button>
                        </div>

                        {/* Frequently Ordered Section */}
                        {(favorites.length > 0 || loadingFavorites) && (
                            <div className="animate-in slide-in-from-top-1 duration-300">
                                <div className="flex items-center gap-1.5 mb-2">
                                    <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Frequently Ordered</span>
                                </div>
                                {loadingFavorites ? (
                                    <div className="flex gap-2">
                                        {[1, 2, 3].map(i => <div key={i} className="h-8 w-20 bg-gray-200 rounded animate-pulse" />)}
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-3 gap-2">
                                        {favorites.map(fav => (
                                            <button
                                                key={fav.product_id}
                                                onClick={() => onAddToCart && onAddToCart({
                                                    id: fav.product_id,
                                                    ...fav,
                                                    id: fav.product_id,
                                                    name: fav.product_name
                                                })}
                                                className="flex flex-col items-center p-2 bg-white border border-gray-200 rounded-lg hover:border-primary hover:bg-primary/5 transition-all text-center group"
                                            >
                                                <div className="w-full aspect-square bg-gray-100 rounded mb-1 overflow-hidden relative">
                                                    {fav.image ? (
                                                        <img src={fav.image} alt={fav.product_name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <ShoppingBag className="w-4 h-4 text-gray-300 absolute inset-0 m-auto" />
                                                    )}
                                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                                                        <Plus className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 scale-75 group-hover:scale-100 transition-all" />
                                                    </div>
                                                </div>
                                                <span className="text-[10px] font-medium text-gray-600 line-clamp-1 leading-tight group-hover:text-primary">
                                                    {fav.product_name}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="relative">
                        <div className="flex items-center border border-gray-300 rounded-lg bg-white focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all">
                            <Search className="w-4 h-4 text-gray-400 ml-3" />
                            <input
                                type="text"
                                placeholder="Cari Pelanggan..."
                                className="w-full px-3 py-2 text-sm outline-none bg-transparent"
                                value={customerSearch}
                                onChange={(e) => handleSearchCustomer(e.target.value)}
                                onFocus={() => {
                                    if (customers.length === 0) {
                                        handleSearchCustomer('');
                                    }
                                    setShowCustomerList(true);
                                }}
                            />
                            {isSearchingCustomer && <Loader2 className="w-4 h-4 text-primary animate-spin mr-3" />}
                        </div>

                        {/* Dropdown Results */}
                        {showCustomerList && customers.length > 0 && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-100 max-h-48 overflow-y-auto z-50">
                                {customers.map((c) => (
                                    <button
                                        key={c.id}
                                        className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm border-b border-gray-50 last:border-0 flex justify-between items-center"
                                        onClick={() => selectCustomer(c)}
                                    >
                                        <span className="font-medium text-gray-700">{c.name}</span>
                                        <span className="text-xs text-gray-400">{c.phone || c.email}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {cart.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-2">
                        <CreditCard className="w-12 h-12 opacity-20" />
                        <p className="text-sm">Cart is empty</p>
                    </div>
                ) : (
                    cart.map((item) => (
                        <div key={item.id} className="flex justify-between items-start bg-gray-50 p-2 rounded-md">
                            <div className="flex-1 min-w-0 pr-2">
                                <p className="font-medium text-sm text-gray-900 truncate">{item.name}</p>
                                <p className="text-xs text-gray-500">Rp {item.price.toLocaleString('id-ID')}</p>
                            </div>

                            <div className="flex items-center space-x-2">
                                <div className="flex items-center border border-gray-300 rounded bg-white">
                                    <button
                                        onClick={() => onUpdateQty(item.id, -1)}
                                        className="p-1 hover:bg-gray-100 text-gray-600"
                                    >
                                        <Minus className="w-3 h-3" />
                                    </button>
                                    <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                                    <button
                                        onClick={() => onUpdateQty(item.id, 1)}
                                        className="p-1 hover:bg-gray-100 text-gray-600"
                                    >
                                        <Plus className="w-3 h-3" />
                                    </button>
                                </div>
                                <button
                                    onClick={() => onRemove(item.id)}
                                    className="p-1.5 text-red-500 hover:bg-red-50 rounded"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Voucher Section */}
            <div className="px-4 py-3 border-t border-gray-100">
                {voucher ? (
                    <div className="flex items-center justify-between bg-green-50 p-2 rounded-lg">
                        <div className="flex items-center">
                            <Ticket className="w-4 h-4 text-green-600 mr-2" />
                            <div>
                                <p className="text-sm font-medium text-green-800">{voucher.code}</p>
                                <p className="text-xs text-green-600">-Rp {voucherDiscountAmount.toLocaleString('id-ID')}</p>
                            </div>
                        </div>
                        <button onClick={removeVoucher} className="p-1 hover:bg-green-100 rounded">
                            <X className="w-4 h-4 text-green-700" />
                        </button>
                    </div>
                ) : (
                    <div>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                placeholder="Voucher code"
                                className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                                value={voucherCode}
                                onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                                onKeyDown={(e) => e.key === 'Enter' && applyVoucher()}
                            />
                            <button
                                onClick={applyVoucher}
                                disabled={voucherLoading || !voucherCode.trim()}
                                className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium disabled:opacity-50"
                            >
                                {voucherLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Apply'}
                            </button>
                        </div>
                        {voucherError && <p className="text-xs text-red-500 mt-1">{voucherError}</p>}
                    </div>
                )}
            </div>

            {/* Summary Section */}
            <div className="border-t border-gray-200 p-4 bg-gray-50">
                <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Subtotal</span>
                        <span>Rp {subtotal.toLocaleString('id-ID')}</span>
                    </div>

                    {tierDiscountAmount > 0 && (
                        <div className="flex justify-between text-sm text-blue-600">
                            <span className="flex items-center gap-1">
                                <Crown className="w-3 h-3" />
                                {customerTier?.name} Discount ({customerTier?.discount}%)
                            </span>
                            <span>-Rp {tierDiscountAmount.toLocaleString('id-ID')}</span>
                        </div>
                    )}

                    {voucherDiscountAmount > 0 && (
                        <div className="flex justify-between text-sm text-green-600">
                            <span>Voucher Discount</span>
                            <span>-Rp {voucherDiscountAmount.toLocaleString('id-ID')}</span>
                        </div>
                    )}

                    <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Tax ({storeSettings.tax_rate}%)</span>
                        <span>Rp {Math.round(tax).toLocaleString('id-ID')}</span>
                    </div>

                    {selectedCustomer && (
                        <div className="flex justify-between text-sm text-blue-600 font-medium">
                            <span>Points to Earn</span>
                            <span>+{pointsEarned} pts</span>
                        </div>
                    )}

                    <div className="flex justify-between text-base font-bold text-gray-900 pt-2 border-t border-gray-200">
                        <span>Total</span>
                        <span>Rp {Math.round(total).toLocaleString('id-ID')}</span>
                    </div>
                </div>

                <button
                    onClick={() => onCheckout({
                        subtotal,
                        
                        discount: voucherDiscountAmount, 
                        tax: Math.round(tax),
                        total: Math.round(total),
                        voucher,
                        customer: selectedCustomer,
                        pointsEarned: selectedCustomer ? pointsEarned : 0
                    })}
                    disabled={cart.length === 0}
                    className="w-full bg-primary text-white py-3 rounded-lg font-bold shadow-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
                >
                    Charge Rp {Math.round(total).toLocaleString('id-ID')}
                </button>
            </div>
        </div>
    );
}