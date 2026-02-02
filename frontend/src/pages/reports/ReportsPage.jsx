import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BadgeDollarSign, ShoppingBag, TrendingUp, Calendar, Download, Loader2, Package } from 'lucide-react';
import api from '../../lib/api';

export default function ReportsPage() {
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

    const { data: dailySales, isLoading: loadingSales } = useQuery({
        queryKey: ['daily-sales', date],
        queryFn: async () => {
            const res = await api.get('/reports/daily-sales', { params: { date } });
            return res.data.data;
        }
    });

    const { data: bestSellers, isLoading: loadingBestSellers } = useQuery({
        queryKey: ['best-sellers', date],
        queryFn: async () => {
            const res = await api.get('/reports/best-sellers', { params: { date_from: date, limit: 3 } });
            return res.data.data || [];
        }
    });

    const { data: salesHistory, isLoading: loadingHistory } = useQuery({
        queryKey: ['sales-history', date],
        queryFn: async () => {
            const res = await api.get('/reports/sales-history', { params: { date } });
            return res.data.data || [];
        }
    });

    const exportCSV = (data, filename) => {
        if (!data || data.length === 0) return;
        
        const headers = Object.keys(data[0]);
        const csvContent = [
            headers.join(','),
            ...data.map(row => headers.map(h => JSON.stringify(row[h] ?? '')).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${filename}_${date}.csv`;
        link.click();
    };

    const totalItemsSold = salesHistory?.reduce((acc, item) => acc + parseInt(item.quantity), 0) || 0;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
                    <p className="text-gray-500">Business insights and performance metrics</p>
                </div>
                <div className="flex items-center space-x-2 bg-white px-3 py-2 rounded-lg border border-gray-200">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="border-none focus:outline-none text-sm"
                    />
                </div>
            </div>

            {}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="Total Revenue"
                    value={`Rp ${(dailySales?.total_revenue || 0).toLocaleString('id-ID')}`}
                    icon={BadgeDollarSign}
                    color="green"
                    loading={loadingSales}
                />
                <StatCard
                    title="Transactions"
                    value={dailySales?.total_transactions || 0}
                    icon={ShoppingBag}
                    color="blue"
                    loading={loadingSales}
                />
                <StatCard
                    title="Net Revenue"
                    value={`Rp ${(dailySales?.net_revenue || 0).toLocaleString('id-ID')}`}
                    icon={TrendingUp}
                    color="purple"
                    loading={loadingSales}
                />
                {}
                <StatCard
                    title="Items Sold Today"
                    value={totalItemsSold}
                    icon={Package}
                    color="orange"
                    loading={loadingHistory}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {}
                <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
                    <h3 className="font-bold text-gray-900 mb-4">Payment Methods</h3>
                    {loadingSales ? (
                        <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
                    ) : (
                        <div className="space-y-4">
                            {Object.entries(dailySales?.payment_breakdown || {}).map(([method, amount]) => (
                                <div key={method} className="flex items-center justify-between">
                                    <span className="capitalize text-gray-600">{method}</span>
                                    <div className="flex-1 mx-4 h-2 bg-gray-100 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-primary"
                                            style={{ width: `${Math.min(100, (amount / (dailySales?.total_revenue || 1)) * 100)}%` }}
                                        />
                                    </div>
                                    <span className="font-medium">Rp {parseInt(amount).toLocaleString('id-ID')}</span>
                                </div>
                            ))}
                            {(!dailySales?.payment_breakdown || Object.keys(dailySales?.payment_breakdown).length === 0) && (
                                <p className="text-gray-400 text-center py-4">No payments recorded</p>
                            )}
                        </div>
                    )}
                </div>

                {}
                <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-gray-900">Best Sellers</h3>
                        <button
                            onClick={() => exportCSV(bestSellers, 'best_sellers')}
                            className="text-sm text-primary hover:underline flex items-center"
                        >
                            <Download className="w-4 h-4 mr-1" />
                            Export
                        </button>
                    </div>
                    {loadingBestSellers ? (
                        <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
                    ) : bestSellers && bestSellers.length > 0 ? (
                        <div className="space-y-3">
                            {bestSellers.map((item, idx) => (
                                <div key={idx} className="flex justify-between items-center py-3 border-b border-gray-50 last:border-0">
                                    <div className="flex items-center">
                                        {}
                                        <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mr-3 
                                            ${idx === 0 ? 'bg-yellow-100 text-yellow-700' : 
                                              idx === 1 ? 'bg-gray-100 text-gray-700' : 
                                              'bg-orange-50 text-orange-700'}`}>
                                            {idx + 1}
                                        </span>
                                        <div>
                                            <p className="font-medium text-gray-900">{item.product_name}</p>
                                            <p className="text-xs text-gray-500">Rp {parseInt(item.total_revenue).toLocaleString('id-ID')}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className="block font-bold text-gray-900">{item.total_qty} sold</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-gray-400 text-center py-4">No sales data</p>
                    )}
                </div>
            </div>

            {}
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-gray-900">Sales History (Items)</h3>
                    <button
                        onClick={() => exportCSV(salesHistory, 'sales_history')}
                        className="text-sm text-primary hover:underline flex items-center"
                    >
                        <Download className="w-4 h-4 mr-1" />
                        Export CSV
                    </button>
                </div>
                
                {loadingHistory ? (
                    <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Qty</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Price</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {salesHistory && salesHistory.length > 0 ? (
                                    salesHistory.map((item, idx) => (
                                        <tr key={idx} className="hover:bg-gray-50">
                                            <td className="px-4 py-2 text-sm text-gray-500">
                                                {}
                                                {new Date(item.transaction_date).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                            </td>
                                            <td className="px-4 py-2 text-sm font-medium text-gray-900">
                                                {item.product_name}
                                            </td>
                                            <td className="px-4 py-2 text-sm text-center">
                                                {item.quantity}
                                            </td>
                                            <td className="px-4 py-2 text-sm text-right text-gray-500">
                                                Rp {parseInt(item.unit_price).toLocaleString('id-ID')}
                                            </td>
                                            <td className="px-4 py-2 text-sm text-right font-medium text-gray-900">
                                                Rp {parseInt(item.subtotal).toLocaleString('id-ID')}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="5" className="px-4 py-8 text-center text-gray-400">
                                            No items sold on this date.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

// Component Kartu Statistik (Tidak Berubah)
function StatCard({ title, value, icon: Icon, color, loading }) {
    const colorClasses = {
        blue: 'bg-blue-50 text-blue-600',
        green: 'bg-green-50 text-green-600',
        orange: 'bg-orange-50 text-orange-600',
        purple: 'bg-purple-50 text-purple-600',
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-full ${colorClasses[color]}`}>
                    <Icon className="w-6 h-6" />
                </div>
            </div>
            <div>
                <p className="text-sm font-medium text-gray-500">{title}</p>
                {loading ? (
                    <div className="h-8 flex items-center"><Loader2 className="w-5 h-5 animate-spin text-gray-300" /></div>
                ) : (
                    <h3 className="text-2xl font-bold text-gray-900 mt-1">{value}</h3>
                )}
            </div>
        </div>
    );
}