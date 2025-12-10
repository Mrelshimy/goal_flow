
import React from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Target, 
  Award, 
  FileText, 
  UserCircle, 
  LogOut, 
  Menu,
  X,
  ListTodo
} from 'lucide-react';
import { useAuth } from '../App';

const Layout: React.FC = () => {
  const { user, logout } = useAuth();
  const [isMobileOpen, setIsMobileOpen] = React.useState(false);
  const navigate = useNavigate();

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Goals', path: '/goals', icon: Target },
    { name: 'Tasks', path: '/tasks', icon: ListTodo },
    { name: 'Achievements', path: '/achievements', icon: Award },
    { name: 'Reports', path: '/reports', icon: FileText },
    { name: 'Personal', path: '/personal', icon: UserCircle },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-[#F7F9FC] overflow-hidden">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-gray-200">
        <div className="p-6 flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white font-bold">G</div>
          <span className="text-xl font-bold text-gray-800">GoalFlow</span>
        </div>
        
        <nav className="flex-1 px-4 py-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  isActive 
                    ? 'bg-blue-50 text-primary' 
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`
              }
            >
              <item.icon size={20} />
              {item.name}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center gap-3 px-4 py-3 text-gray-700">
            <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-xs font-bold">
              {user?.name.charAt(0)}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-medium truncate">{user?.name}</p>
              <p className="text-xs text-gray-500 truncate">{user?.email}</p>
            </div>
            <button onClick={handleLogout} className="text-gray-400 hover:text-red-500">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Layout */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Mobile Header */}
        <header className="md:hidden h-16 bg-white border-b border-gray-200 px-4 flex justify-between items-center z-50 relative">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white font-bold">G</div>
            <span className="text-lg font-bold text-gray-800">GoalFlow</span>
          </div>
          <button 
            onClick={() => setIsMobileOpen(!isMobileOpen)}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors focus:outline-none"
          >
            {isMobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </header>

        {/* Mobile Navigation Menu Overlay */}
        {isMobileOpen && (
          <div className="md:hidden fixed inset-0 z-40 bg-gray-800/50 backdrop-blur-sm top-16" onClick={() => setIsMobileOpen(false)}>
            <div 
              className="bg-white w-64 h-full shadow-xl overflow-y-auto border-r border-gray-200 flex flex-col" 
              onClick={e => e.stopPropagation()}
            >
              <div className="p-4 space-y-1 flex-1">
                {navItems.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsMobileOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                        isActive ? 'bg-blue-50 text-primary' : 'text-gray-700 hover:bg-gray-50'
                      }`
                    }
                  >
                    <item.icon size={20} />
                    {item.name}
                  </NavLink>
                ))}
              </div>
              
              <div className="border-t border-gray-200 p-4 bg-gray-50">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-sm font-bold text-gray-600">
                    {user?.name.charAt(0)}
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-sm font-medium text-gray-900 truncate">{user?.name}</p>
                    <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                  </div>
                </div>
                <button 
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-red-600 bg-white border border-gray-200 hover:bg-red-50 transition-colors"
                >
                  <LogOut size={18} />
                  Logout
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-[#F7F9FC]">
           <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
