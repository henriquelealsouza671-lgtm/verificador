import React, { useState, useEffect } from 'react';
import { 
  CreditCard, Globe, List, CheckCircle, 
  XCircle, Trash2, Download, Play, 
  BarChart3, Clock3, ShieldCheck 
} from 'lucide-react';

export default function App() {
  // --- CONFIGURAÇÃO GLOBAL ---
  const API_URL = "https://verificador-m01v.onrender.com";

  // --- ESTADOS E PERSISTÊNCIA ---
  const [activeTab, setActiveTab] = useState('teste');
  const [loading, setLoading] = useState(false);
  
  // Recupera proxies salvas no navegador
  const [proxies, setProxies] = useState(() => {
    const saved = localStorage.getItem('cineverse_proxies');
    return saved ? JSON.parse(saved) : [];
  });
  
  // Recupera histórico de testes
  const [resultados, setResultados] = useState(() => {
    const saved = localStorage.getItem('cineverse_results');
    return saved ? JSON.parse(saved) : [];
  });

  // Sincroniza estados com o LocalStorage
  useEffect(() => {
    localStorage.setItem('cineverse_proxies', JSON.stringify(proxies));
    localStorage.setItem('cineverse_results', JSON.stringify(resultados));
  }, [proxies, resultados]);

  // --- INTEGRAÇÃO COM O BACKEND (RENDER) ---
  const handleRunTest = async (cartaoFull) => {
    if (!cartaoFull.trim()) return;
    setLoading(true);

    try {
      // Seleciona uma proxy aleatória da lista para o teste
      const proxyUsada = proxies.length > 0 
        ? proxies[Math.floor(Math.random() * proxies.length)].url 
        : "";

      const response = await fetch(`${API_URL}/testar-cartao`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cartao: cartaoFull, proxy: proxyUsada })
      });

      const data = await response.json();

      const novoResultado = {
        ...data,
        id: Date.now(),
        cartaoCompleto: cartaoFull,
        data: new Date().toLocaleTimeString()
      };

      setResultados(prev => [novoResultado, ...prev]);
      setActiveTab('resultados'); 
    } catch (error) {
      alert("Erro: O servidor no Render pode estar iniciando. Tente novamente em alguns segundos.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto bg-slate-950 text-slate-200 font-sans overflow-hidden border-x border-slate-800 shadow-2xl relative">
      
      {/* Efeitos de Fundo (Glow) */}
      <div className="absolute top-[-5%] left-[-5%] w-64 h-64 bg-cyan-900/10 blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-[5%] right-[-5%] w-64 h-64 bg-purple-900/10 blur-[100px] pointer-events-none"></div>

      {/* Conteúdo Principal */}
      <div className="flex-1 overflow-y-auto pb-32 p-6 z-10">
        {activeTab === 'teste' && <TelaTeste onTestar={handleRunTest} loading={loading} />}
        {activeTab === 'proxies' && <TelaProxies API_URL={API_URL} proxies={proxies} setProxies={setProxies} />}
        {activeTab === 'resultados' && <TelaResultados resultados={resultados} setResultados={setResultados} />}
      </div>

      {/* Menu de Navegação Inferior */}
      <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[92%] max-w-[380px] bg-slate-900/60 backdrop-blur-2xl border border-slate-700/50 flex justify-around p-3 rounded-3xl shadow-2xl z-50">
        <NavButton icon={<BarChart3 size={22} />} label="Teste" isActive={activeTab === 'teste'} onClick={() => setActiveTab('teste')} />
        <NavButton icon={<Globe size={22} />} label="Proxies" isActive={activeTab === 'proxies'} onClick={() => setActiveTab('proxies')} />
        <NavButton icon={<List size={22} />} label="Logs" isActive={activeTab === 'resultados'} onClick={() => setActiveTab('resultados')} />
      </nav>
    </div>
  );
}

// --- TELAS DO APLICATIVO ---

function TelaTeste({ onTestar, loading }) {
  const [input, setInput] = useState("4563310048475663|10|2029|160");
  
  return (
    <div className="mt-6 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex flex-col items-center">
        <div className="p-4 bg-cyan-500/10 rounded-2xl mb-4 border border-cyan-500/20 shadow-[0_0_20px_rgba(34,211,238,0.1)]">
          <ShieldCheck className="text-cyan-400" size={36} />
        </div>
        <h1 className="text-4xl font-black text-white tracking-tighter uppercase">Cineverse</h1>
        <p className="text-[10px] text-cyan-500 font-bold tracking-[0.4em] uppercase opacity-70">Security Protocol</p>
      </header>

      <div className="bg-slate-900/40 p-6 rounded-[2.5rem] border border-slate-700/50 backdrop-blur-md shadow-2xl">
        <textarea 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="w-full bg-slate-950/40 border border-slate-700 rounded-2xl p-5 text-sm font-mono outline-none focus:ring-2 ring-cyan-500/30 transition-all h-44 text-cyan-50 shadow-inner resize-none"
          placeholder="Número|Mês|Ano|CVV"
        />

        <button 
          onClick={() => onTestar(input)}
          disabled={loading}
          className={`w-full mt-6 py-5 rounded-2xl font-black text-sm tracking-widest uppercase flex items-center justify-center gap-3 transition-all duration-300 ${loading ? 'bg-slate-800 text-slate-500' : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg active:scale-95'}`}
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
          ) : (
            <Play size={18} fill="currentColor" />
          )}
          {loading ? 'Validando...' : 'Iniciar Teste'}
        </button>
      </div>
    </div>
  );
}

function TelaProxies({ API_URL, proxies, setProxies }) {
  const [input, setInput] = useState("");

  const sincronizarComServidor = async (novaLista) => {
    const texto = novaLista.map(p => p.url).join('\n');
    try {
      await fetch(`${API_URL}/salvar-proxies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lista: texto })
      });
    } catch (e) {
      console.error("Erro na sincronização do arquivo TXT");
    }
  };

  const handleAdd = async () => {
    if (!input.trim()) return;
    const novas = input.split('\n')
      .filter(l => l.trim())
      .map(url => ({ id: Math.random(), url: url.trim() }));
    
    const atualizada = [...novas, ...proxies];
    setProxies(atualizada);
    await sincronizarComServidor(atualizada);
    setInput("");
  };

  const handleRemove = async (id) => {
    const filtrada = proxies.filter(p => p.id !== id);
    setProxies(filtrada);
    await sincronizarComServidor(filtrada);
  };

  return (
    <div className="mt-4 animate-in fade-in slide-in-from-right-4 duration-300">
      <h2 className="text-xl font-bold mb-6 flex items-center gap-3 text-cyan-400">
        <Globe size={22}/> Gerenciar Proxies
      </h2>

      <div className="bg-slate-900/50 p-5 rounded-3xl border border-slate-700/50 mb-6">
        <textarea 
          placeholder="ip:porta:user:pass" 
          value={input} 
          onChange={e => setInput(e.target.value)} 
          className="w-full bg-slate-950/40 border border-slate-700 rounded-xl p-4 text-xs font-mono outline-none mb-4 h-28 text-slate-300" 
        />
        <button onClick={handleAdd} className="w-full bg-purple-600 hover:bg-purple-500 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-purple-900/20">
          Importar e Sincronizar no Render
        </button>
      </div>

      <div className="space-y-2">
        {proxies.map(p => (
          <div key={p.id} className="bg-slate-900/30 p-4 rounded-2xl border border-slate-800 flex justify-between items-center group hover:border-slate-600">
            <span className="text-[10px] font-mono text-slate-400 truncate pr-4">{p.url}</span>
            <button onClick={() => handleRemove(p.id)} className="text-slate-600 hover:text-red-500 p-1 transition-colors">
              <Trash2 size={16}/>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function TelaResultados({ resultados, setResultados }) {
  const [filtro, setFiltro] = useState('Aprovado');
  const items = resultados.filter(r => r.status === filtro);

  return (
    <div className="mt-4 animate-in fade-in slide-in-from-left-4 duration-300">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-xl font-bold text-cyan-400">Logs de Validação</h2>
        <button 
          onClick={() => { if(window.confirm("Limpar logs?")) setResultados([]) }}
          className="p-2 text-red-400 hover:bg-red-500/10 rounded-xl transition-all"
        >
          <Trash2 size={20} />
        </button>
      </div>

      <div className="flex p-1.5 bg-slate-900/50 rounded-2xl mb-8 border border-slate-700/50">
        <button 
          onClick={() => setFiltro('Aprovado')} 
          className={`flex-1 py-3 rounded-xl text-[10px] font-black tracking-widest transition-all ${filtro === 'Aprovado' ? 'bg-green-600 text-white shadow-lg' : 'text-slate-500'}`}
        >
          APROVADOS ({resultados.filter(x => x.status === 'Aprovado').length})
        </button>
        <button 
          onClick={() => setFiltro('Recusado')} 
          className={`flex-1 py-3 rounded-xl text-[10px] font-black tracking-widest transition-all ${filtro === 'Recusado' ? 'bg-red-600 text-white shadow-lg' : 'text-slate-500'}`}
        >
          RECUSADOS ({resultados.filter(x => x.status === 'Recusado').length})
        </button>
      </div>

      <div className="space-y-4">
        {items.map(r => (
          <div key={r.id} className={`p-5 rounded-3xl border animate-in zoom-in-95 duration-300 ${r.tipo === 'sucesso' ? 'bg-green-500/5 border-green-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
            <div className="flex justify-between items-start mb-4">
              <p className="text-[11px] font-mono text-slate-100 break-all leading-relaxed pr-4">{r.cartaoCompleto}</p>
              <span className="text-[9px] font-mono text-slate-500 shrink-0">{r.data}</span>
            </div>
            <div className="flex items-center gap-3 bg-slate-950/40 p-3 rounded-xl border border-slate-800/50 shadow-inner">
              {r.tipo === 'sucesso' ? <CheckCircle size={16} className="text-green-500" /> : <XCircle size={16} className="text-red-500" />}
              <div className="overflow-hidden">
                <p className={`text-[10px] font-black uppercase ${r.tipo === 'sucesso' ? 'text-green-500' : 'text-red-500'}`}>{r.status}</p>
                <p className="text-[10px] text-slate-400 font-medium truncate">{r.msg}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function NavButton({ icon, label, isActive, onClick }) {
  return (
    <button onClick={onClick} className={`flex flex-col items-center w-20 transition-all duration-300 group relative ${isActive ? 'text-cyan-400' : 'text-slate-500 hover:text-slate-300'}`}>
      <div className={`p-2.5 rounded-xl transition-all ${isActive ? 'bg-cyan-500/10 shadow-inner' : ''}`}>
        {icon}
      </div>
      <span className={`text-[9px] mt-1 font-bold uppercase tracking-tighter ${isActive ? 'opacity-100' : 'opacity-40'}`}>{label}</span>
      {isActive && (
        <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-cyan-400 rounded-full shadow-[0_0_8px_cyan]"></div>
      )}
    </button>
  );
}