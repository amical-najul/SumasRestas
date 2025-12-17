
import React, { useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { getAllUsers, saveUser, deleteUser, getStorageUsage, getAllScores, getUserDetailedAnalytics } from '../services/storageService';
import {
  ArrowLeft, Users, Shield, Activity, Database, Search,
  Edit, Trash2, UserX, UserCheck, Plus, X, Key, Check, BarChart2, Calendar, Target, Trophy, Clock, Zap
} from 'lucide-react';

interface Props {
  onBack: () => void;
}

// --- SIMPLE SVG LINE CHART COMPONENT ---
const SimpleLineChart = ({ data }: { data: { score: number; date: string }[] }) => {
  if (!data || data.length < 2) return <div className="text-gray-500 text-xs text-center py-10">Insuficientes datos para graficar</div>;

  const height = 150;
  const width = 400;
  const padding = 20;

  const maxScore = 100; // Always 100%
  const minScore = 0;

  const points = data.map((d, i) => {
    const x = padding + (i / (data.length - 1)) * (width - padding * 2);
    const y = height - padding - (d.score / maxScore) * (height - padding * 2);
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto min-w-[400px]">
        {/* Background Lines */}
        <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="#334155" strokeDasharray="4" />
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#334155" />
        <text x={padding - 5} y={padding + 5} fill="#64748b" fontSize="10" textAnchor="end">100</text>
        <text x={padding - 5} y={height - padding} fill="#64748b" fontSize="10" textAnchor="end">0</text>

        {/* The Line */}
        <polyline fill="none" stroke="#60a5fa" strokeWidth="2" points={points} />

        {/* Dots */}
        {data.map((d, i) => {
          const x = padding + (i / (data.length - 1)) * (width - padding * 2);
          const y = height - padding - (d.score / maxScore) * (height - padding * 2);
          return (
            <g key={i} className="group">
              <circle cx={x} cy={y} r="3" fill="#3b82f6" className="group-hover:r-5 transition-all" />
              <title>{`${d.date}: ${d.score}pts`}</title>
            </g>
          )
        })}
      </svg>
      <p className="text-center text-xs text-gray-500 mt-1">Evolución de Puntuación (Últimas Partidas)</p>
    </div>
  );
};

const AdminPanel: React.FC<Props> = ({ onBack }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [filter, setFilter] = useState('');

  // Modals State
  const [showUserModal, setShowUserModal] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);

  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [statsUser, setStatsUser] = useState<User | null>(null);
  const [userStatsData, setUserStatsData] = useState<any>(null);
  const [statsTab, setStatsTab] = useState<'category' | 'difficulty'>('category');

  // Global Stats
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalGamesPlayed: 0,
    storage: '0 KB'
  });

  // User Form State
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    role: 'USER' as UserRole,
    status: 'ACTIVE' as 'ACTIVE' | 'BANNED'
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const allUsers = await getAllUsers();
    const allScores = await getAllScores();

    setUsers(allUsers);

    // Calculate Global Stats
    setStats({
      totalUsers: allUsers.length,
      activeUsers: allUsers.filter(u => u.status === 'ACTIVE').length,
      totalGamesPlayed: allScores.length,
      storage: getStorageUsage()
    });
  };

  const handleCreate = () => {
    setEditingUser(null);
    setFormData({ username: '', email: '', password: '', role: 'USER', status: 'ACTIVE' });
    setShowUserModal(true);
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      email: user.email,
      password: user.password,
      role: user.role,
      status: user.status
    });
    setShowUserModal(true);
  };

  const handleViewStats = async (user: User) => {
    setStatsUser(user);
    const data = await getUserDetailedAnalytics(user.username);
    setUserStatsData(data);
    setShowStatsModal(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('¿Estás seguro de eliminar este usuario permanentemente?')) {
      await deleteUser(id);
      loadData();
    }
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return; // Should not happen as Create is removed

    const newUser: User = {
      ...editingUser,
      ...formData,
      // Ensure we don't save password to DB if it's empty or legacy
      password: formData.password || editingUser.password
    };
    await saveUser(newUser);
    setShowUserModal(false);
    loadData();
  };

  const toggleStatus = async (user: User) => {
    const newStatus = user.status === 'ACTIVE' ? 'BANNED' : 'ACTIVE';
    await saveUser({ ...user, status: newStatus });
    loadData();
  };

  const filteredUsers = users.filter(u =>
    u.username.toLowerCase().includes(filter.toLowerCase()) ||
    u.email.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="w-full max-w-6xl h-[90vh] flex flex-col animate-fade-in relative">

      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-white/10 rounded-full transition-colors bg-white/5 border border-white/10"
          >
            <ArrowLeft className="text-white" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Shield className="text-red-500" /> Panel de Administración
            </h1>
            <p className="text-gray-400 text-sm">Gestión avanzada del sistema</p>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-black/30 border border-white/10 p-4 rounded-xl flex items-center justify-between">
          <div><p className="text-gray-400 text-xs uppercase">Usuarios</p><p className="text-2xl font-bold text-white">{stats.totalUsers}</p></div>
          <Users className="text-blue-400 opacity-50" />
        </div>
        <div className="bg-black/30 border border-white/10 p-4 rounded-xl flex items-center justify-between">
          <div><p className="text-gray-400 text-xs uppercase">Partidas</p><p className="text-2xl font-bold text-green-400">{stats.totalGamesPlayed}</p></div>
          <Activity className="text-green-400 opacity-50" />
        </div>
        <div className="bg-black/30 border border-white/10 p-4 rounded-xl flex items-center justify-between">
          <div><p className="text-gray-400 text-xs uppercase">Activos</p><p className="text-2xl font-bold text-yellow-400">{stats.activeUsers}</p></div>
          <UserCheck className="text-yellow-400 opacity-50" />
        </div>
        <div className="bg-black/30 border border-white/10 p-4 rounded-xl flex items-center justify-between">
          <div><p className="text-gray-400 text-xs uppercase">Storage DB</p><p className="text-2xl font-bold text-purple-400">{stats.storage}</p></div>
          <Database className="text-purple-400 opacity-50" />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col">

        {/* Toolbar */}
        <div className="p-4 border-b border-white/10 flex flex-col md:flex-row justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
            <input
              type="text"
              placeholder="Buscar por nombre o email..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-full bg-black/20 border border-white/10 rounded-lg py-2 pl-10 pr-4 text-white focus:outline-none focus:border-blue-500"
            />
          </div>
          {/* Create User removed: Manual creation does not sync with Firebase Auth */}
        </div>

        {/* User Table */}
        <div className="flex-1 overflow-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead className="bg-black/20 text-gray-400 text-xs uppercase sticky top-0 backdrop-blur-md">
              <tr>
                <th className="p-4">Usuario</th>
                <th className="p-4 hidden sm:table-cell">Detalles</th>
                <th className="p-4">Estado</th>
                <th className="p-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredUsers.map(user => (
                <tr key={user.id} className="hover:bg-white/5 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center overflow-hidden border border-white/10 shrink-0">
                        {user.avatar ? <img src={user.avatar} className="w-full h-full object-cover" /> : <span className="font-bold text-gray-400">{user.username[0]}</span>}
                      </div>
                      <div>
                        <div className="font-bold text-white">{user.username}</div>
                        <div className="text-xs text-gray-500 hidden sm:block">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 hidden sm:table-cell">
                    <div className="flex flex-col">
                      <span className={`text-xs font-bold ${user.role === 'ADMIN' ? 'text-red-400' : 'text-blue-400'}`}>{user.role}</span>
                      <span className="text-xs text-gray-500">Reg: {new Date(user.createdAt).toLocaleDateString()}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${user.status === 'ACTIVE' ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>
                      {user.status === 'ACTIVE' ? 'Activo' : 'Baneado'}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => handleViewStats(user)} className="p-2 rounded-lg bg-purple-500/20 hover:bg-purple-500/40 text-purple-300" title="Ver Estadísticas">
                        <BarChart2 size={16} />
                      </button>
                      <button onClick={() => toggleStatus(user)} className="p-2 rounded-lg bg-white/5 hover:bg-white/20 text-gray-300" title={user.status === 'ACTIVE' ? 'Desactivar' : 'Activar'}>
                        {user.status === 'ACTIVE' ? <UserX size={16} /> : <UserCheck size={16} className="text-green-400" />}
                      </button>
                      <button onClick={() => handleEdit(user)} className="p-2 rounded-lg bg-blue-500/20 hover:bg-blue-500/40 text-blue-300" title="Editar">
                        <Edit size={16} />
                      </button>
                      <button onClick={() => handleDelete(user.id)} className="p-2 rounded-lg bg-red-500/20 hover:bg-red-500/40 text-red-300" title="Eliminar">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredUsers.length === 0 && (
            <div className="p-8 text-center text-gray-500">No se encontraron usuarios.</div>
          )}
        </div>
      </div>

      {/* MODAL 1: Create/Edit User */}
      {showUserModal && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in p-4">
          <div className="bg-[#1e293b] border border-white/10 p-6 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white">{editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}</h3>
              <button onClick={() => setShowUserModal(false)} className="text-gray-400 hover:text-white"><X size={24} /></button>
            </div>

            <form onSubmit={handleSaveUser} className="space-y-4">
              <div>
                <label className="text-xs text-gray-400 uppercase font-bold">Nombre</label>
                <input required value={formData.username} onChange={e => setFormData({ ...formData, username: e.target.value })} className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-white focus:border-blue-500 outline-none" />
              </div>
              <div>
                <label className="text-xs text-gray-400 uppercase font-bold">Email</label>
                <input required type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-white focus:border-blue-500 outline-none" />
              </div>
              {/* Password field removed: Admins cannot change user passwords directly (handled by Firebase) */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-400 uppercase font-bold">Rol</label>
                  <select value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value as UserRole })} className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-white focus:border-blue-500 outline-none">
                    <option value="USER">Usuario</option>
                    <option value="ADMIN">Administrador</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-400 uppercase font-bold">Estado</label>
                  <select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value as any })} className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-white focus:border-blue-500 outline-none">
                    <option value="ACTIVE">Activo</option>
                    <option value="BANNED">Baneado</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setShowUserModal(false)} className="px-4 py-2 rounded-lg text-gray-400 hover:text-white">Cancelar</button>
                <button type="submit" className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold flex items-center gap-2">
                  <Check size={18} /> Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: User Statistics (ENHANCED) */}
      {showStatsModal && statsUser && userStatsData && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in p-4">
          <div className="bg-[#1e293b] border border-white/10 p-0 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="bg-white/5 p-6 flex items-center gap-4 border-b border-white/10">
              <div className="w-16 h-16 rounded-full bg-slate-700 flex items-center justify-center overflow-hidden border-2 border-white/20">
                {statsUser.avatar ? <img src={statsUser.avatar} className="w-full h-full object-cover" /> : <span className="text-2xl font-bold text-gray-400">{statsUser.username[0]}</span>}
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-bold text-white">{statsUser.username}</h3>
                <p className="text-gray-400 text-sm">{statsUser.email}</p>
                <div className="flex gap-4 mt-1 text-xs">
                  <span className="text-blue-400">Nivel Desbloqueado: {(statsUser.unlockedLevel ?? 0) + 1}</span>
                </div>
              </div>
              <button onClick={() => setShowStatsModal(false)} className="text-gray-400 hover:text-white self-start"><X size={24} /></button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-6">

              {/* Performance Chart */}
              <div className="mb-8 bg-black/20 p-4 rounded-xl border border-white/5">
                <h4 className="text-sm font-bold text-gray-400 uppercase mb-4 flex items-center gap-2">
                  <Activity size={16} /> Desempeño General
                </h4>
                <SimpleLineChart data={userStatsData.history} />
              </div>

              {/* Stats Tabs */}
              <div className="flex space-x-4 border-b border-white/10 mb-4">
                <button
                  onClick={() => setStatsTab('category')}
                  className={`pb-2 text-sm font-bold transition-colors ${statsTab === 'category' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-500 hover:text-gray-300'}`}
                >
                  Por Categoría
                </button>
                <button
                  onClick={() => setStatsTab('difficulty')}
                  className={`pb-2 text-sm font-bold transition-colors ${statsTab === 'difficulty' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-500 hover:text-gray-300'}`}
                >
                  Por Nivel/Dificultad
                </button>
              </div>

              {/* Stats Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="text-xs text-gray-400 uppercase bg-white/5">
                    <tr>
                      <th className="p-3">{statsTab === 'category' ? 'Categoría' : 'Dificultad'}</th>
                      <th className="p-3 text-center">Partidas</th>
                      <th className="p-3 text-center">Promedio</th>
                      <th className="p-3 text-center">Precisión</th>
                      <th className="p-3 text-center flex items-center justify-center gap-1"><Clock size={12} /> T. Pregunta</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {(statsTab === 'category' ? userStatsData.byCategory : userStatsData.byDifficulty).map((item: any) => (
                      <tr key={item.key} className="hover:bg-white/5">
                        <td className="p-3 font-medium text-white capitalize">
                          {item.key === 'mixed_add_sub' ? 'Suma/Resta' :
                            item.key === 'mixed_mult_add' ? 'Mult/Op' :
                              item.key === 'all_mixed' ? 'Experto' :
                                item.key === 'easy' ? 'Nivel 1' :
                                  item.key === 'easy_medium' ? 'Nivel 2' :
                                    item.key === 'medium' ? 'Nivel 3' :
                                      item.key === 'medium_hard' ? 'Nivel 4' :
                                        item.key === 'hard' ? 'Nivel 5' :
                                          item.key}
                        </td>
                        <td className="p-3 text-center text-gray-300">{item.games}</td>
                        <td className="p-3 text-center font-bold text-white">{item.avgScore}%</td>
                        <td className="p-3 text-center">
                          <div className="flex flex-col items-center">
                            <span className={`${item.accuracy >= 80 ? 'text-green-400' : item.accuracy >= 60 ? 'text-yellow-400' : 'text-red-400'} font-bold`}>
                              {item.accuracy}%
                            </span>
                            <span className="text-[10px] text-gray-500">
                              {item.errors} err
                            </span>
                          </div>
                        </td>
                        <td className="p-3 text-center text-blue-300 font-mono">
                          {item.avgTimePerQuestion}s
                        </td>
                      </tr>
                    ))}
                    {(statsTab === 'category' ? userStatsData.byCategory : userStatsData.byDifficulty).length === 0 && (
                      <tr><td colSpan={5} className="p-4 text-center text-gray-500">Sin datos disponibles.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminPanel;
