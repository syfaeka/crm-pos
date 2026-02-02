import { Plus, Package } from 'lucide-react';
import { cn } from '../../../lib/utils';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export default function ProductCard({ product, onAddToCart }) {
    const price = product.variants?.[0]?.selling_price || 0;
    const hasMultipleVariants = (product.variants?.length || 0) > 1;
    const stock = product.variants?.[0]?.stock_qty || 0;
    const isOutOfStock = stock <= 0;

    const getImageUrl = (imagePath) => {
        if (!imagePath) return null;
        if (imagePath.startsWith('http')) return imagePath;
        return `${API_BASE_URL}/writable${imagePath}`;
    };

    const imageUrl = getImageUrl(product.image);

    return (
        <div
            className={cn(
                "bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden cursor-pointer hover:shadow-md hover:border-primary/30 transition-all flex flex-col h-full group",
                isOutOfStock && "opacity-60 grayscale cursor-not-allowed"
            )}
            onClick={() => !isOutOfStock && onAddToCart(product)}
        >
            <div className="aspect-square bg-gray-100 relative overflow-hidden">
                {isOutOfStock && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30 z-10">
                        <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded">Out of Stock</span>
                    </div>
                )}

                {imageUrl ? (
                    <img
                        src={imageUrl}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                            e.target.onerror = null;
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                        }}
                    />
                ) : null}
                <div
                    className={cn(
                        "w-full h-full items-center justify-center text-gray-300 absolute inset-0",
                        imageUrl ? "hidden" : "flex"
                    )}
                >
                    <Package className="w-12 h-12" />
                </div>

                {/* Quick add button */}
                <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="bg-primary text-white p-2 rounded-full shadow-lg">
                        <Plus className="w-4 h-4" />
                    </div>
                </div>
            </div>

            <div className="p-3 flex-1 flex flex-col">
                <h3 className="font-medium text-gray-900 text-sm line-clamp-2 mb-1 leading-snug">
                    {product.name}
                </h3>

                <div className="mt-auto pt-2">
                    <div className="flex items-center justify-between">
                        <span className="font-bold text-primary text-base">
                            Rp {parseInt(price).toLocaleString('id-ID')}
                        </span>
                        {hasMultipleVariants && (
                            <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                                {product.variants.length} var
                            </span>
                        )}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                        Stock: {stock}
                    </div>
                </div>
            </div>
        </div>
    );
}
