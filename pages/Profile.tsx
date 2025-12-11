
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../App';
import { db } from '../services/db';
import { UserRole } from '../types';
import { User as UserIcon, Camera, Save, Lock, Mail, Briefcase, Building2, Crown } from 'lucide-react';

const DEPARTMENTS = [
  "Engineering",
  "Product",
  "Sales",
  "Marketing",
  "Customer Support",
  "Finance",
  "HR",
  "Operations",
  "Legal",
  "IT",
  "Executive",
  "Design"
];

const Profile: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [title, setTitle] = useState(user?.title || '');
  const [role, setRole] = useState<UserRole>(user?.role || 'employee');
  const [department, setDepartment] = useState(user?.department || 'Engineering');
  const [newPassword, setNewPassword] = useState('');
  const [avatar, setAvatar] = useState(user?.avatar || '');
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  // Sync state with user context if it changes
  useEffect(() => {
      if (user) {
          setName(user.name);
          setEmail(user.email);
          setTitle(user.title || '');
          setRole(user.role);
          setDepartment(user.department || 'Engineering');
          setAvatar(user.avatar || '');
      }
  }, [user]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 500000) { 
        setMessage({ type: 'error', text: 'Image is too large. Please use an image under 500KB.' });
        return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
        setAvatar(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);

    try {
        await db.updateUser({
            name,
            email,
            title,
            avatar,
            role,
            department: department || undefined,
            password: newPassword || undefined
        });
        
        await refreshUser();
        setMessage({ type: 'success', text: 'Profile updated successfully!' });
        setNewPassword(''); 
    } catch (error: any) {
        setMessage({ type: 'error', text: `Failed to update profile: ${error.message || error}` });
        console.error(error);
    } finally {
        setIsSaving(false);
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-20">
        <h1 className="text-2xl font-bold text-gray-800">My Profile</h1>
        {message && (
            <div className={`p-4 rounded-lg text-sm font-medium ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{message.text}</div>
        )}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="h-32 bg-gradient-to-r from-blue-500 to-indigo-600"></div>
            <div className="px-8 pb-8">
                <div className="relative -mt-16 mb-6 flex justify-between items-end">
                    <div className="relative group">
                        <div className="w-32 h-32 rounded-full border-4 border-white bg-gray-100 flex items-center justify-center overflow-hidden shadow-md">
                            {avatar ? <img src={avatar} alt="Profile" className="w-full h-full object-cover" /> : <span className="text-4xl font-bold text-gray-400">{name.charAt(0)}</span>}
                        </div>
                        <button type="button" onClick={() => fileInputRef.current?.click()} className="absolute bottom-1 right-1 bg-white p-2 rounded-full shadow-md text-gray-600 hover:text-primary transition-colors border border-gray-200"><Camera size={18} /></button>
                        <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
                    </div>
                </div>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                            <div className="relative"><UserIcon className="absolute left-3 top-2.5 text-gray-400" size={18} /><input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-primary outline-none" /></div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Job Title</label>
                            <div className="relative"><Briefcase className="absolute left-3 top-2.5 text-gray-400" size={18} /><input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Product Manager" className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-primary outline-none" /></div>
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                            <div className="relative"><Mail className="absolute left-3 top-2.5 text-gray-400" size={18} /><input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-primary outline-none" /></div>
                        </div>

                        {/* Role & Dept Section */}
                        <div className="md:col-span-2 pt-4 border-t border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-6">
                             <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                                <div className="relative">
                                    <Crown className="absolute left-3 top-2.5 text-gray-400" size={18} />
                                    <select 
                                        value={role} 
                                        onChange={e => setRole(e.target.value as UserRole)}
                                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-primary outline-none bg-white"
                                    >
                                        <option value="employee">Employee</option>
                                        <option value="department_head">Department Head</option>
                                    </select>
                                </div>
                                <p className="text-[10px] text-gray-400 mt-1">Set to Dept. Head to manage team KPIs.</p>
                             </div>
                             <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                                <div className="relative">
                                    <Building2 className="absolute left-3 top-2.5 text-gray-400" size={18} />
                                    <select
                                        value={department}
                                        onChange={e => setDepartment(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-primary outline-none bg-white"
                                    >
                                        <option value="" disabled>Select Department</option>
                                        {DEPARTMENTS.map(dept => (
                                            <option key={dept} value={dept}>{dept}</option>
                                        ))}
                                    </select>
                                </div>
                             </div>
                        </div>

                        <div className="md:col-span-2 pt-4 border-t border-gray-100">
                             <h3 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2"><Lock size={16} /> Security</h3>
                             <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                                <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Leave blank to keep current" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-primary outline-none" />
                             </div>
                        </div>
                    </div>
                    <div className="flex justify-end pt-4">
                        <button type="submit" disabled={isSaving} className="bg-primary text-white px-6 py-2.5 rounded-lg font-medium hover:bg-blue-600 transition-colors shadow-sm flex items-center gap-2 disabled:opacity-70">
                            <Save size={18} /> {isSaving ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </div>
  );
};

export default Profile;
