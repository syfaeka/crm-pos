import { useState, useEffect } from 'react';
import { X, Printer, Download, CheckCircle, Receipt, Coins } from 'lucide-react';
import { cn } from '../../../lib/utils';
import api from '../../../lib/api';
import { dataTagSymbol } from '@tanstack/react-query';

export default function PaymentModal({ open, onClose, totals, cart, onSuccess }) {
    if (!open) return null;

    const [paymentMethod, setPaymentMethod] = useState('cash');
    const [cashGiven, setCashGiven] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [saleResult, setSaleResult] = useState(null);

    //  POINTS REDEMPTION STATE 
    const [usePoints, setUsePoints] = useState(false);

    // Reset points toggle when modal opens/closes
    useEffect(() => {
        if (open) {
            setUsePoints(false);
            setPaymentMethod('cash');
            setCashGiven('');
        }
    }, [open]);

    //  POINTS LOGIC 
    const customer = totals.customer;
    const availablePoints = customer?.total_points || 0;
    const pointsValue = availablePoints * 100; 

    // Calculate final totals
    const initialTotal = totals.total;

    // Determine max deductible amount (cannot exceed total)
    let redeemAmount = 0;
    let redeemedPointsCount = 0;

    if (usePoints && pointsValue > 0) {
        if (pointsValue >= initialTotal) {
            redeemAmount = initialTotal;
            redeemedPointsCount = Math.ceil(initialTotal / 100);
        } else {
            redeemAmount = pointsValue;
            redeemedPointsCount = availablePoints;
        }
    }

    const finalTotal = Math.max(0, initialTotal - redeemAmount);

    const change = Math.max(0, (parseInt(cashGiven) || 0) - finalTotal);
    const canPay = paymentMethod === 'cash' ? (parseInt(cashGiven) || 0) >= finalTotal : true;

    const quickAmounts = [
        finalTotal,
        Math.ceil(finalTotal / 10000) * 10000,
        Math.ceil(finalTotal / 50000) * 50000,
        Math.ceil(finalTotal / 100000) * 100000,
    ].filter((v, i, a) => a.indexOf(v) === i && v >= finalTotal);

    const processPayment = async () => {
        if (!canPay) return;
        setIsProcessing(true);

        try {
            const user = JSON.parse(localStorage.getItem('user') || '{}');

            const payload = {
                branch_id: user.branch_id || 1,

                customer_id: totals.customer ? totals.customer.id : null,

                // Kirim data diskon/voucher
                discount_value: totals.discount || 0, 
                discount_type: totals.discountType || 'fixed', 
                voucher_code: totals.voucherCode || null,                      
                tax_amount: totals.tax || 0,
                notes: '',

                items: cart.map(item => ({
                    variant_id: item.variant_id || item.id, 
                    quantity: item.quantity,
                    discount: 0
                })),

                //  NEW: POINTS REDEMPTION 
                use_points: usePoints,
                points_amount: usePoints ? redeemedPointsCount : 0,

                payments: [
                    {
                        method: paymentMethod,
                        amount: paymentMethod === 'cash' ? parseInt(cashGiven) : finalTotal,
                        reference: paymentMethod !== 'cash' ? 'REF-' + Date.now() : null
                    }
                ]
            };

            const { data } = await api.post('/sales', payload);

            setSaleResult({
                ...data.data, 
                cart: cart,
                paymentMethod: paymentMethod,
                cashGiven: parseInt(cashGiven) || finalTotal,
                change: change
            });
            
            if (onSuccess) onSuccess();
        } catch (error) {
            console.error('Payment failed', error);
            alert('Payment failed: ' + (error.response?.data?.message || error.message));
        } finally {
            setIsProcessing(false);
        }
    };

    const handlePrint = () => {
        const printWindow = window.open('', '_blank', 'width=400,height=600');
        const customerName = saleResult?.customer?.name || totals.customer?.name || 'Guest';

        // Receipt formatting logic
        printWindow.document.write(`
            <html>
            <head>
                <title>Receipt - ${saleResult?.invoice_number}</title>
                <style>
                    body { font-family: 'Courier New', monospace; font-size: 12px; width: 280px; margin: 0 auto; padding: 10px; }
                    .center { text-align: center; }
                    .bold { font-weight: bold; }
                    .line { border-top: 1px dashed #000; margin: 8px 0; }
                    .row { display: flex; justify-content: space-between; }
                    .items { margin: 8px 0; }
                    .item { margin-bottom: 4px; }
                    .total-row { font-weight: bold; font-size: 14px; }
                </style>
            </head>
            <body>
                <div class="center bold" style="font-size: 16px;">KOPI KUY</div>
                <div class="center" style="font-size: 10px;">Jl. Sudirman No. 123, Jakarta</div>
                <div class="line"></div>
                <div class="row"><span>Invoice:</span><span>${saleResult?.invoice_number}</span></div>
                <div class="row"><span>Date:</span><span>${new Date(saleResult?.transaction_date).toLocaleString('id-ID')}</span></div>
                <div class="row"><span>Customer:</span><span>${customerName}</span></div>
                <div class="row"><span>Cashier:</span><span>${JSON.parse(localStorage.getItem('user') || '{}').full_name || 'Staff'}</span></div>
                <div class="line"></div>
                <div class="items">
                    ${saleResult?.cart?.map(item => `
                        <div class="item">
                            <div>${item.name}</div>
                            <div class="row"><span>${item.quantity} x Rp ${parseInt(item.price).toLocaleString('id-ID')}</span><span>Rp ${(item.quantity * item.price).toLocaleString('id-ID')}</span></div>
                        </div>
                    `).join('')}
                </div>
                <div class="line"></div>
                <div class="row"><span>Subtotal:</span><span>Rp ${parseInt(saleResult?.subtotal || 0).toLocaleString('id-ID')}</span></div>
                
                ${/*DISKON VOUCHER, MEMBER, & POIN --- */ ''}
                
                ${saleResult?.tier_discount_amount > 0 ? `<div class="row"><span>Member Disc (${saleResult.tier_name}):</span><span>-Rp ${parseInt(saleResult.tier_discount_amount).toLocaleString('id-ID')}</span></div>` : ''}
                
               ${saleResult?.voucher_amount > 0 ? 
                    `<div class="row">
                        <span>${saleResult.voucher_code ? `Voucher (${saleResult.voucher_code})` : 'Discount'}:</span>
                        <span>-Rp ${parseInt(saleResult.voucher_amount).toLocaleString('id-ID')}</span>
                    </div>` 
                    : ''
                }
                
                ${saleResult?.points_redeemed > 0 ? `<div class="row"><span>Points (${saleResult.points_redeemed}):</span><span>-Rp ${parseInt(saleResult.points_redeemed * 100).toLocaleString('id-ID')}</span></div>` : ''}

                <div class="row"><span>Tax:</span><span>Rp ${parseInt(saleResult?.tax_amount || 0).toLocaleString('id-ID')}</span></div>
                <div class="line"></div>
                <div class="row total-row"><span>TOTAL:</span><span>Rp ${parseInt(saleResult?.total_amount || 0).toLocaleString('id-ID')}</span></div>
                <div class="line"></div>
                <div class="row"><span>${saleResult?.paymentMethod?.toUpperCase()}:</span><span>Rp ${parseInt(saleResult?.paid_amount || 0).toLocaleString('id-ID')}</span></div>
                <div class="row"><span>Change:</span><span>Rp ${parseInt(saleResult?.change_amount || 0).toLocaleString('id-ID')}</span></div>
                <div class="line"></div>
                ${totals.customer ? `<div class="center" style="margin-top: 8px;">Points Earned: +${Math.floor(saleResult?.total_amount / 10000)}</div>` : ''}
                ${saleResult?.points_redeemed > 0 ? `<div class="center">Points Used: -${saleResult.points_redeemed}</div>` : ''}
                <div class="center" style="margin-top: 16px;">Thank you for your purchase!</div>
                <div class="center" style="font-size: 10px; margin-top: 8px;">www.kopikuy.com</div>
            </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 250);
    };

    const handleDownloadPDF = () => {
        handlePrint();
    };

    if (saleResult) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                <div className="bg-white rounded-lg shadow-2xl w-full max-w-md overflow-hidden">
                    <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-6 text-center text-white">
                        <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
                            <CheckCircle className="w-10 h-10" />
                        </div>
                        <h2 className="text-2xl font-bold">Payment Successful!</h2>
                        <p className="text-green-100 mt-1">Transaction completed</p>
                    </div>

                    <div className="p-6">
                        <div className="bg-gray-50 rounded-lg p-4 mb-4">
                            <div className="flex justify-between items-center mb-3">
                                <span className="text-gray-500 text-sm">Invoice Number</span>
                                <span className="font-mono font-bold text-gray-900">{saleResult.invoice_number}</span>
                            </div>

                            {totals.customer && (
                                <div className="flex justify-between items-center mb-3 border-b border-gray-200 pb-2">
                                    <span className="text-gray-500 text-sm">Customer</span>
                                    <span className="font-bold text-gray-900">{totals.customer.name}</span>
                                </div>
                            )}

                            <div className="border-t border-gray-200 pt-3 space-y-2">
                                {saleResult.cart?.slice(0, 3).map((item, idx) => (
                                    <div key={idx} className="flex justify-between text-sm">
                                        <span className="text-gray-600">{item.quantity}x {item.name}</span>
                                        <span className="text-gray-900">Rp {(item.quantity * item.price).toLocaleString('id-ID')}</span>
                                    </div>
                                ))}
                                {saleResult.cart?.length > 3 && (
                                    <div className="text-sm text-gray-400">...and {saleResult.cart.length - 3} more items</div>
                                )}
                            </div>

                            {/*PEVIEW DISKON DI LAYAR*/}
                            {(saleResult.points_redeemed > 0 || saleResult.tier_discount_amount > 0 || saleResult.voucher_amount > 0) && (
                                <div className="border-t border-gray-200 mt-3 pt-2 text-xs text-green-600 space-y-1">
                                    {saleResult.tier_discount_amount > 0 && (
                                        <div className="flex justify-between">
                                            <span>Member Disc ({saleResult.tier_name})</span>
                                            <span>-Rp {parseInt(saleResult.tier_discount_amount).toLocaleString('id-ID')}</span>
                                        </div>
                                    )}
                                    {saleResult.voucher_amount > 0 && (
                                        <div className="flex justify-between">
                                            <span>{saleResult.voucher_code ? `Voucher (${saleResult.voucher_code})` : 'Discount'}</span>
                                            <span>-Rp {parseInt(saleResult.voucher_amount).toLocaleString('id-ID')}</span>
                                        </div>
                                    )}
                                    {saleResult.points_redeemed > 0 && (
                                        <div className="flex justify-between font-medium">
                                            <span>Points Used ({saleResult.points_redeemed})</span>
                                            <span>-Rp {parseInt(saleResult.points_redeemed * 100).toLocaleString('id-ID')}</span>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="border-t border-gray-200 mt-3 pt-3">
                                <div className="flex justify-between font-bold text-lg">
                                    <span>Total</span>
                                    <span className="text-primary">Rp {parseInt(saleResult.total_amount || 0).toLocaleString('id-ID')}</span>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mb-4">
                            <div className="bg-blue-50 rounded-lg p-3 text-center">
                                <p className="text-xs text-blue-600 uppercase font-medium">Payment</p>
                                <p className="text-lg font-bold text-blue-900 capitalize">{saleResult.paymentMethod}</p>
                            </div>
                            <div className="bg-green-50 rounded-lg p-3 text-center">
                                <p className="text-xs text-green-600 uppercase font-medium">Change</p>
                                <p className="text-lg font-bold text-green-900">Rp {parseInt(saleResult.change_amount || 0).toLocaleString('id-ID')}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mb-3">
                            <button
                                onClick={handlePrint}
                                className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                            >
                                <Printer className="w-4 h-4 mr-2" />
                                Print
                            </button>
                            <button
                                onClick={handleDownloadPDF}
                                className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                            >
                                <Download className="w-4 h-4 mr-2" />
                                Download
                            </button>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-full px-4 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 font-bold transition-colors"
                        >
                            New Order
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Payment Form
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                    <h2 className="text-lg font-bold">Payment</h2>
                    <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto">
                    <div className="text-center mb-6">
                        <span className="text-gray-500 text-sm">Total Amount Due</span>
                        <div className="text-4xl font-bold text-primary mt-1">
                            Rp {finalTotal.toLocaleString('id-ID')}
                        </div>
                        {redeemAmount > 0 && (
                            <p className="text-xs text-black/40 line-through mt-1">
                                Rp {initialTotal.toLocaleString('id-ID')}
                            </p>
                        )}
                    </div>

                    {/* Customer Info & Points Redemption */}
                    {customer && (
                        <div className="mb-6 space-y-3">
                            <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 flex justify-between items-center">
                                <span className="text-sm text-blue-700">Customer: <b>{customer.name}</b></span>
                                <span className="text-xs bg-blue-200 text-blue-800 px-2 py-1 rounded-full">
                                    {customer.total_points || 0} pts
                                </span>
                            </div>

                            {/* Points Toggle */}
                            {availablePoints > 0 && (
                                <div className="bg-white border border-gray-200 rounded-lg p-3 flex justify-between items-center shadow-sm">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center">
                                            <Coins className="w-4 h-4 text-yellow-600" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-gray-800">Redeem Points</p>
                                            <p className="text-xs text-gray-500">
                                                Available: {availablePoints} (Worth Rp {pointsValue.toLocaleString('id-ID')})
                                            </p>
                                        </div>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            checked={usePoints}
                                            onChange={(e) => setUsePoints(e.target.checked)}
                                        />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                    </label>
                                </div>
                            )}

                            {/* Transparent Math Breakdown */}
                            {usePoints && redeemAmount > 0 && (
                                <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1 border border-dashed border-gray-300">
                                    <div className="flex justify-between text-gray-500">
                                        <span>Subtotal</span>
                                        <span>Rp {initialTotal.toLocaleString('id-ID')}</span>
                                    </div>
                                    <div className="flex justify-between text-green-600 font-medium">
                                        <span>Points Used ({redeemedPointsCount})</span>
                                        <span>- Rp {redeemAmount.toLocaleString('id-ID')}</span>
                                    </div>
                                    <div className="flex justify-between border-t border-gray-200 pt-1 font-bold text-gray-800">
                                        <span>Final Payment</span>
                                        <span>Rp {finalTotal.toLocaleString('id-ID')}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
                        <div className="grid grid-cols-3 gap-3">
                            {['cash', 'qris', 'card'].map((method) => (
                                <button
                                    key={method}
                                    onClick={() => setPaymentMethod(method)}
                                    className={cn(
                                        "py-3 px-4 rounded-lg border text-sm font-medium capitalize transition-all",
                                        paymentMethod === method
                                            ? "border-primary bg-primary/5 text-primary ring-1 ring-primary"
                                            : "border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                                    )}
                                >
                                    {method}
                                </button>
                            ))}
                        </div>
                    </div>

                    {paymentMethod === 'cash' && (
                        <div className="mb-6 animate-in slide-in-from-top-2 duration-200">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Cash Received</label>
                            <input
                                type="number"
                                autoFocus
                                className="w-full px-4 py-3 text-lg border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                                placeholder="Enter amount"
                                value={cashGiven}
                                onChange={(e) => setCashGiven(e.target.value)}
                            />
                            <div className="mt-3 flex flex-wrap gap-2">
                                {quickAmounts.map((amount) => (
                                    <button
                                        key={amount}
                                        onClick={() => setCashGiven(amount.toString())}
                                        className="px-3 py-1.5 text-xs font-medium bg-gray-100 hover:bg-gray-200 rounded-full text-gray-700 transition-colors"
                                    >
                                        {amount.toLocaleString('id-ID')}
                                    </button>
                                ))}
                            </div>
                            <div className="mt-4 p-3 bg-gray-50 rounded-lg flex justify-between items-center">
                                <span className="text-sm font-medium">Change Due:</span>
                                <span className={cn("font-bold text-lg", change < 0 ? "text-red-500" : "text-green-600")}>
                                    Rp {change.toLocaleString('id-ID')}
                                </span>
                            </div>
                        </div>
                    )}
                </div>

                <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end">
                    <button
                        onClick={processPayment}
                        disabled={!canPay || isProcessing}
                        className="w-full bg-primary text-white py-3 rounded-lg font-bold shadow-sm hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                        {isProcessing ? 'Processing...' : `Confirm Payment`}
                    </button>
                </div>
            </div>
        </div>
    );
} 