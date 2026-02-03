import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import api from '../../lib/api';
import { Loader2, Eye, EyeOff, Coffee } from 'lucide-react'; 

export default function LoginPage() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({ username: '', password: '' });
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');

    const loginMutation = useMutation({
        mutationFn: async (data) => {
            const response = await api.post('/auth/login', data);
            return response.data;
        },
        onSuccess: (data) => {
            localStorage.setItem('token', data.data.access_token);
            localStorage.setItem('user', JSON.stringify(data.data.user));
            
            const roles = data.data.user.roles || [];
            if (roles.includes('cashier')) {
                navigate('/pos');
            } else {
                navigate('/dashboard');
            }
        },
        onError: (err) => {
            setError(err.response?.data?.message || 'Login failed');
        }
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        loginMutation.mutate(formData);
    };

    return (
        <div 
            className="min-h-screen flex items-center justify-center bg-cover bg-center bg-no-repeat relative"
            style={{ 
                backgroundImage: "url('https://plus.unsplash.com/premium_photo-1675237625862-d982e7f44696?q=80&w=1170&auto=format&fit=crop')" 
            }} >
            <div className="absolute inset-0 bg-black/20" />
            <div className="w-full max-w-md p-8 relative z-10">
                <div className="text-center mb-8">
                    <div className="flex justify-center mb-4">
                    <Coffee className="w-10 h-10 text-[#ffcdb2]" />
                    </div>
                    <h1 className="text-3xl font-normal text-white">Kopi Kuy</h1>
                </div>

                {error && (
                    <div className="bg-red-500/80 backdrop-blur-sm text-white p-3 rounded-md text-sm mb-6 text-center">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    
                    {/* Username Input */}
                    <div>
                        <input
                            type="text"
                            placeholder="Username"
                            required
                            className="w-full px-5 py-3 bg-gray-600/40 backdrop-blur-md border border-gray-500/30 rounded-full text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-[#ffcdb2] transition-all"
                            value={formData.username}
                            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                        />
                    </div>

                    {/* Password Input */}
                    <div className="relative">
                        <input
                            type={showPassword ? "text" : "password"}
                            placeholder="Password"
                            required
                            className="w-full px-5 py-3 bg-gray-600/40 backdrop-blur-md border border-gray-500/30 rounded-full text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-[#ffcdb2] transition-all"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 hover:text-white"
                        >
                            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                    </div>

                    {/* Sign In Button */}
                    <button
                        type="submit"
                        disabled={loginMutation.isPending}
                        className="w-full bg-[#ffcdb2] hover:bg-[#ffb48a] text-gray-900 font-bold py-3 rounded-full uppercase tracking-wider transition-colors shadow-lg flex items-center justify-center mt-6"
                    >
                        {loginMutation.isPending ? (
                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        ) : null}
                        SIGN IN
                    </button>

                    {/* Footer Options */}
                    <div className="flex items-center justify-between text-white text-sm px-1">
                        <a href="#" className="hover:underline">Forgot Password</a>
                    </div>
                </form>
            </div> 
        </div>
    );
}