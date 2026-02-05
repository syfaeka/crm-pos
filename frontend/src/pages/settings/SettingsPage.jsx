import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Save, Loader2, Store, Palette, Bell, Shield, Moon, Sun, Check, X, Lock, Ticket, Trash2, Plus, Calendar } from 'lucide-react';
import api from '../../lib/api';

// HELPER FUNCTIONS 
const getTheme = () => localStorage.getItem('theme') || 'light';
const setTheme = (theme) => {
    localStorage.setItem('theme', theme);
    if (theme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
};

const getNotificationSettings = () => {
    try {
        return JSON.parse(localStorage.getItem('notifications') || '{"lowStock":true,"dailyReport":false}');
    } catch {
        return { lowStock: true, dailyReport: false };
    }
};

export default function SettingsPage() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    const isOwner = user.roles?.includes('owner') || user.role === 'owner' || user.level === 'owner';

    const [activeTab, setActiveTab] = useState('store');
    const [saving, setSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState('');
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [isDarkMode, setIsDarkMode] = useState(getTheme() === 'dark');
    const [notifications, setNotifications] = useState(getNotificationSettings());

    const [storeSettings, setStoreSettings] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem('storeSettings') || 'null') || {
                name: 'Kopi Kuy Coffee Shop',
                address: 'Jl. Sudirman No. 123, Jakarta',
                phone: '021-5551234',
                email: 'hq@kopikuy.com',
                tax_rate: 11,
                currency: 'IDR',
            };
        } catch {
            return { name: 'Kopi Kuy', address: '', phone: '', email: '', tax_rate: 11, currency: 'IDR' };
        }
    });

    useEffect(() => { setTheme(isDarkMode ? 'dark' : 'light'); }, []);

    const handleDarkModeToggle = () => {
        const newMode = !isDarkMode;
        setIsDarkMode(newMode);
        setTheme(newMode ? 'dark' : 'light');
    };

    const handleNotificationToggle = (key) => {
        const newSettings = { ...notifications, [key]: !notifications[key] };
        setNotifications(newSettings);
        localStorage.setItem('notifications', JSON.stringify(newSettings));
    };

    const handleSave = async () => {
        setSaving(true);
        setSaveMessage('');
        try {
            localStorage.setItem('storeSettings', JSON.stringify(storeSettings));
            setSaveMessage('Settings saved successfully!');
            setTimeout(() => setSaveMessage(''), 3000);
        } catch (err) {
            setSaveMessage('Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    // DEFINISI TABS 
    const allTabs = [
        { id: 'store', label: 'Store Info', icon: Store, roles: ['all'] },
        { id: 'appearance', label: 'Appearance', icon: Palette, roles: ['all'] },
        { id: 'vouchers', label: 'Vouchers', icon: Ticket, roles: ['owner'] }, 
        { id: 'notifications', label: 'Notifications', icon: Bell, roles: ['all'] },
        { id: 'security', label: 'Security', icon: Shield, roles: ['all'] },
    ];

    const tabs = allTabs.filter(tab => 
        tab.roles.includes('all') || (isOwner && tab.roles.includes('owner'))
    );

    const Toggle = ({ enabled, onToggle }) => (
        <button
            onClick={onToggle}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${enabled ? 'bg-primary' : 'bg-gray-300'}`}
        >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
    );

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
                <p className="text-gray-500 dark:text-gray-400">Manage your store configuration</p>
            </div>

            <div className="flex flex-col lg:flex-row gap-6">
                {/* Sidebar Tabs */}
                <div className="lg:w-64 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 p-2 h-fit">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`w-full flex items-center px-4 py-3 text-left rounded-lg transition-colors ${activeTab === tab.id
                                    ? 'bg-primary/10 text-primary'
                                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                                }`}
                        >
                            <tab.icon className="w-5 h-5 mr-3" />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Content Area */}
                <div className="flex-1 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 p-6 min-h-[500px]">
                    
                    {}
                    {activeTab === 'store' && (
                        <div className="space-y-6">
                            <h2 className="text-lg font-bold border-b border-gray-100 dark:border-gray-700 pb-2 text-gray-900 dark:text-white">Store Information</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Store Name</label>
                                    <input
                                        type="text"
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-primary focus:border-primary bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        value={storeSettings.name}
                                        onChange={(e) => setStoreSettings({ ...storeSettings, name: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                                    <input
                                        type="email"
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-primary focus:border-primary bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        value={storeSettings.email}
                                        onChange={(e) => setStoreSettings({ ...storeSettings, email: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone</label>
                                    <input
                                        type="text"
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-primary focus:border-primary bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        value={storeSettings.phone}
                                        onChange={(e) => setStoreSettings({ ...storeSettings, phone: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Currency</label>
                                    <select
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-primary focus:border-primary bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        value={storeSettings.currency}
                                        onChange={(e) => setStoreSettings({ ...storeSettings, currency: e.target.value })}
                                    >
                                        <option value="IDR">IDR - Indonesian Rupiah</option>
                                        <option value="USD">USD - US Dollar</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Address</label>
                                <textarea
                                    rows={2}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-primary focus:border-primary bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    value={storeSettings.address}
                                    onChange={(e) => setStoreSettings({ ...storeSettings, address: e.target.value })}
                                />
                            </div>
                            <div className="w-48">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tax Rate (%)</label>
                                <input
                                    type="number"
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-primary focus:border-primary bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    value={storeSettings.tax_rate}
                                    onChange={(e) => setStoreSettings({ ...storeSettings, tax_rate: e.target.value })}
                                />
                            </div>

                            <div className="mt-8 pt-4 border-t border-gray-100 dark:border-gray-700 flex items-center gap-4">
                                <button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="flex items-center px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
                                >
                                    {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                                    Save Changes
                                </button>
                                {saveMessage && (
                                    <span className={`text-sm flex items-center ${saveMessage.includes('Failed') ? 'text-red-600' : 'text-green-600'}`}>
                                        {!saveMessage.includes('Failed') && <Check className="w-4 h-4 mr-1" />}
                                        {saveMessage}
                                    </span>
                                )}
                            </div>
                        </div>
                    )}

                    {}
                    {activeTab === 'vouchers' && isOwner && (
                        <VoucherManager />
                    )}

                    {}
                    {activeTab === 'appearance' && (
                        <div className="space-y-6">
                            <h2 className="text-lg font-bold border-b border-gray-100 dark:border-gray-700 pb-2 text-gray-900 dark:text-white">Appearance</h2>
                            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                <div className="flex items-center">
                                    {isDarkMode ? <Moon className="w-5 h-5 mr-3 text-indigo-500" /> : <Sun className="w-5 h-5 mr-3 text-yellow-500" />}
                                    <div>
                                        <p className="font-medium text-gray-900 dark:text-white">Dark Mode</p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">{isDarkMode ? 'Currently using dark theme' : 'Switch to dark theme'}</p>
                                    </div>
                                </div>
                                <Toggle enabled={isDarkMode} onToggle={handleDarkModeToggle} />
                            </div>
                        </div>
                    )}

                    {}
                    {activeTab === 'notifications' && (
                        <div className="space-y-6">
                            <h2 className="text-lg font-bold border-b border-gray-100 dark:border-gray-700 pb-2 text-gray-900 dark:text-white">Notifications</h2>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                    <div>
                                        <p className="font-medium text-gray-900 dark:text-white">Low Stock Alerts</p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">Get notified when stock is low</p>
                                    </div>
                                    <Toggle enabled={notifications.lowStock} onToggle={() => handleNotificationToggle('lowStock')} />
                                </div>
                            </div>
                        </div>
                    )}

                    {}
                    {activeTab === 'security' && (
                        <div className="space-y-6">
                            <h2 className="text-lg font-bold border-b border-gray-100 dark:border-gray-700 pb-2 text-gray-900 dark:text-white">Security</h2>
                            <div className="space-y-4">
                                <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                    <p className="font-medium mb-3 text-gray-900 dark:text-white">Current Session</p>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-gray-500 dark:text-gray-400">Username</span>
                                            <span className="font-medium text-gray-900 dark:text-white">{user.username}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-500 dark:text-gray-400">Role</span>
                                            <span className="font-medium text-gray-900 dark:text-white capitalize">{user.roles?.join(', ')}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <button 
                                        onClick={() => setIsPasswordModalOpen(true)}
                                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2"
                                    >
                                        <Lock className="w-4 h-4" />
                                        Change Password
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                </div>
            </div>

            {isPasswordModalOpen && <ChangePasswordModal onClose={() => setIsPasswordModalOpen(false)} />}
        </div>
    );
}

// KOMPONEN VOUCHER MANAGER 
function VoucherManager() {
    const [vouchers, setVouchers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isAddOpen, setIsAddOpen] = useState(false);
    
    const [newVoucher, setNewVoucher] = useState({
        code: '',
        type: 'fixed', 
        value: '', 
        min_order: 0, 
        usage_limit: 100, 
        valid_until: '' 
    });

    const fetchVouchers = async () => {
        setLoading(true);
        try {
            const res = await api.get('/vouchers');
            setVouchers(res.data.data || []);
        } catch (err) {
            console.error('Fetch voucher error:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchVouchers(); }, []);

    const handleDelete = async (id) => {
        if (!confirm('Delete this voucher?')) return;
        try {
            await api.delete(`/vouchers/${id}`);
            fetchVouchers();
        } catch (err) {
            alert('Failed to delete');
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            await api.post('/vouchers', newVoucher);
            setIsAddOpen(false);
            setNewVoucher({ 
                code: '', 
                type: 'fixed', 
                value: '', 
                min_order: 0, 
                usage_limit: 100, 
                valid_until: '' 
            });
            fetchVouchers();
        } catch (err) {
            alert('Failed to create voucher: ' + (err.response?.data?.message || err.message));
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center border-b border-gray-100 dark:border-gray-700 pb-2">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Vouchers / Promo Codes</h2>
                <button 
                    onClick={() => setIsAddOpen(true)}
                    className="flex items-center px-3 py-2 bg-primary text-white text-sm rounded-lg hover:bg-primary/90"
                >
                    <Plus className="w-4 h-4 mr-1" /> Add Voucher
                </button>
            </div>

            {loading ? (
                <div className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-400" /></div>
            ) : (
                <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Discount</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Min Spend</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Limit</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expiry</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Action</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {vouchers.length === 0 && (
                                <tr><td colSpan="6" className="px-4 py-4 text-center text-sm text-gray-500">No vouchers found</td></tr>
                            )}
                            {vouchers.map((v) => (
                                <tr key={v.id}>
                                    <td className="px-4 py-3 text-sm font-bold text-gray-900 dark:text-white">{v.code}</td>
                                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                                        {}
                                        {v.type === 'fixed' 
                                            ? `Rp ${parseInt(v.value).toLocaleString('id-ID')}` 
                                            : `${v.value}%`}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                                        {parseInt(v.min_order) > 0 ? `Rp ${parseInt(v.min_order).toLocaleString('id-ID')}` : '-'}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                                        {v.usage_count} / {v.usage_limit || '∞'}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                                        {v.valid_until ? new Date(v.valid_until).toLocaleDateString() : 'Forever'}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <button onClick={() => handleDelete(v.id)} className="text-red-500 hover:text-red-700">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Modal Tambah Voucher */}
            {isAddOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md p-6">
                        <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">Add New Voucher</h3>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1 dark:text-gray-300">Code</label>
                                <input 
                                    className="w-full border rounded px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white uppercase" 
                                    value={newVoucher.code}
                                    onChange={e => setNewVoucher({...newVoucher, code: e.target.value.toUpperCase()})}
                                    placeholder="SUMMER2026"
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1 dark:text-gray-300">Type</label>
                                    <select 
                                        className="w-full border rounded px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                        value={newVoucher.type}
                                        onChange={e => setNewVoucher({...newVoucher, type: e.target.value})}
                                    >
                                        <option value="fixed">Fixed (Rp)</option>
                                        <option value="percentage">Percentage (%)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1 dark:text-gray-300">Value</label>
                                    <input 
                                        type="number"
                                        className="w-full border rounded px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white" 
                                        value={newVoucher.value}
                                        onChange={e => setNewVoucher({...newVoucher, value: e.target.value})}
                                        placeholder={newVoucher.type === 'fixed' ? '10000' : '10'}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1 dark:text-gray-300">Min Spend</label>
                                    <input 
                                        type="number"
                                        className="w-full border rounded px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white" 
                                        value={newVoucher.min_order}
                                        onChange={e => setNewVoucher({...newVoucher, min_order: e.target.value})}
                                        placeholder="0"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1 dark:text-gray-300">Limit (Quota)</label>
                                    <input 
                                        type="number"
                                        className="w-full border rounded px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white" 
                                        value={newVoucher.usage_limit}
                                        onChange={e => setNewVoucher({...newVoucher, usage_limit: e.target.value})}
                                        placeholder="100"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1 dark:text-gray-300">Valid Until</label>
                                <input 
                                    type="date"
                                    className="w-full border rounded px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white" 
                                    value={newVoucher.valid_until}
                                    onChange={e => setNewVoucher({...newVoucher, valid_until: e.target.value})}
                                />
                            </div>
                            <div className="flex justify-end gap-2 mt-4">
                                <button type="button" onClick={() => setIsAddOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 rounded">Cancel</button>
                                <button type="submit" className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90">Create</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

function ChangePasswordModal({ onClose }) {
    const [formData, setFormData] = useState({
        current_password: '',
        new_password: '',
        confirm_password: ''
    });
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage({ type: '', text: '' });

        if (formData.new_password !== formData.confirm_password) {
            setMessage({ type: 'error', text: 'New passwords do not match' });
            return;
        }

        if (formData.new_password.length < 8) {
            setMessage({ type: 'error', text: 'Password must be at least 8 characters' });
            return;
        }

        setLoading(true);
        try {
            await api.post('/auth/change-password', formData);
            setMessage({ type: 'success', text: 'Password changed successfully!' });
            
            setTimeout(() => {
                onClose();
            }, 1500);
        } catch (err) {
            setMessage({ 
                type: 'error', 
                text: err.response?.data?.message || 'Failed to change password' 
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md">
                <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-gray-700">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Change Password</h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {message.text && (
                        <div className={`p-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                            {message.text}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Current Password</label>
                        <input 
                            type="password"
                            required
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-primary focus:border-primary bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            value={formData.current_password}
                            onChange={(e) => setFormData({...formData, current_password: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">New Password</label>
                        <input 
                            type="password"
                            required
                            minLength={8}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-primary focus:border-primary bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            value={formData.new_password}
                            onChange={(e) => setFormData({...formData, new_password: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Confirm New Password</label>
                        <input 
                            type="password"
                            required
                            minLength={8}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-primary focus:border-primary bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            value={formData.confirm_password}
                            onChange={(e) => setFormData({...formData, confirm_password: e.target.value})}
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <button 
                            type="button" 
                            onClick={onClose}
                            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit" 
                            disabled={loading}
                            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 flex items-center"
                        >
                            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Update Password
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}