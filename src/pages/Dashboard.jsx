import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { 
  DollarSign, 
  TrendingUp, 
  ShoppingBag, 
  AlertTriangle,
  Award,
  Calendar
} from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function Dashboard() {
  const [periodo, setPeriodo] = useState('hoje'); // hoje, mes
  const [stats, setStats] = useState({
    faturamento: 0,
    totalVendas: 0,
    ticketMedio: 0,
    lucro: 0,
    estoqueBaixo: 0,
    topProdutos: []
  });
  const [chartData, setChartData] = useState({
    labels: [],
    datasets: []
  });

  const loadData = async () => {
    try {
      const dashboardStats = await api.sales.getDashboardStats(periodo);
      setStats(dashboardStats);

      const chartStats = await api.sales.getGraficoVendas();
      setChartData({
        labels: chartStats.labels,
        datasets: [
          {
            fill: true,
            label: 'Faturamento (R$)',
            data: chartStats.data,
            borderColor: '#6366F1',
            backgroundColor: 'rgba(99, 102, 241, 0.15)',
            borderWidth: 3,
            tension: 0.4,
            pointBackgroundColor: '#6366F1',
            pointHoverRadius: 7,
          }
        ]
      });
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadData();
  }, [periodo]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: '#121216',
        titleFont: { family: 'Outfit', size: 12 },
        bodyFont: { family: 'Outfit', size: 12 },
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        padding: 12,
        boxPadding: 4
      }
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(255, 255, 255, 0.05)'
        },
        ticks: {
          color: '#9CA3AF',
          font: { family: 'Outfit', size: 11 }
        }
      },
      y: {
        grid: {
          color: 'rgba(255, 255, 255, 0.05)'
        },
        ticks: {
          color: '#9CA3AF',
          font: { family: 'Outfit', size: 11 }
        }
      }
    }
  };

  return (
    <div className="space-y-8 select-none">
      
      {/* Welcome header and Period filter */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-extrabold text-white leading-tight">Painel Executivo</h2>
          <p className="text-sm text-gray-500 font-semibold mt-1">Acompanhe as vendas e saúde financeira da sua loja</p>
        </div>

        {/* Period Selector */}
        <div className="flex bg-brand-card p-1 rounded-xl border border-brand-border">
          <button
            onClick={() => setPeriodo('hoje')}
            className={`px-4 py-2 rounded-lg font-bold text-xs uppercase transition-all duration-150 ${
              periodo === 'hoje'
                ? 'bg-brand-accent text-white shadow-md shadow-indigo-500/10'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Hoje
          </button>
          <button
            onClick={() => setPeriodo('mes')}
            className={`px-4 py-2 rounded-lg font-bold text-xs uppercase transition-all duration-150 ${
              periodo === 'mes'
                ? 'bg-brand-accent text-white shadow-md shadow-indigo-500/10'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Este Mês
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-4 gap-6">
        
        {/* Faturamento */}
        <div className="glass-panel rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between h-36">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] text-gray-500 font-extrabold uppercase tracking-widest leading-none">Faturamento</span>
              <h3 className="text-2xl font-black text-white mt-2">R$ {stats.faturamento.toFixed(2)}</h3>
            </div>
            <div className="h-10 w-10 bg-brand-accent/15 border border-brand-accent/25 rounded-xl flex items-center justify-center text-brand-accent">
              <DollarSign size={20} />
            </div>
          </div>
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wide">
            Total bruto do período
          </p>
        </div>

        {/* Vendas */}
        <div className="glass-panel rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between h-36">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] text-gray-500 font-extrabold uppercase tracking-widest leading-none">Vendas Realizadas</span>
              <h3 className="text-2xl font-black text-white mt-2">{stats.totalVendas} Transações</h3>
            </div>
            <div className="h-10 w-10 bg-emerald-500/15 border border-emerald-500/25 rounded-xl flex items-center justify-center text-brand-success">
              <ShoppingBag size={20} />
            </div>
          </div>
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wide">
            Ticket Médio: <span className="text-white">R$ {stats.ticketMedio.toFixed(2)}</span>
          </p>
        </div>

        {/* Lucratividade */}
        <div className="glass-panel rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between h-36">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] text-gray-500 font-extrabold uppercase tracking-widest leading-none">Lucro Líquido</span>
              <h3 className="text-2xl font-black text-white mt-2">R$ {stats.lucro.toFixed(2)}</h3>
            </div>
            <div className="h-10 w-10 bg-purple-500/15 border border-purple-500/25 rounded-xl flex items-center justify-center text-purple-400">
              <TrendingUp size={20} />
            </div>
          </div>
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wide">
            Rentabilidade estimada
          </p>
        </div>

        {/* Alerta Estoque */}
        <div className="glass-panel rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between h-36">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] text-gray-500 font-extrabold uppercase tracking-widest leading-none">Estoque Crítico</span>
              <h3 className="text-2xl font-black text-white mt-2">{stats.estoqueBaixo} Itens</h3>
            </div>
            <div className={`h-10 w-10 rounded-xl flex items-center justify-center border ${
              stats.estoqueBaixo > 0 
                ? 'bg-brand-danger/15 border-brand-danger/25 text-brand-danger animate-pulse' 
                : 'bg-brand-border border-brand-border/40 text-gray-500'
            }`}>
              <AlertTriangle size={20} />
            </div>
          </div>
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wide">
            Produtos abaixo do estoque mínimo
          </p>
        </div>

      </div>

      {/* Main Charts & Rankings Row */}
      <div className="grid grid-cols-3 gap-6">
        
        {/* Sales Chart Panel */}
        <div className="col-span-2 glass-panel rounded-3xl p-6 border border-white/5 flex flex-col justify-between min-h-[380px]">
          <div className="flex items-center space-x-2.5 mb-6">
            <Calendar size={18} className="text-brand-accent" />
            <h3 className="font-extrabold text-sm uppercase tracking-widest text-white">Evolução Faturamento (Últimos 7 dias)</h3>
          </div>
          <div className="flex-1 h-64 relative">
            {chartData.labels.length > 0 ? (
              <Line data={chartData} options={chartOptions} />
            ) : (
              <div className="h-full w-full flex items-center justify-center text-xs text-gray-500 font-semibold">
                Buscando histórico...
              </div>
            )}
          </div>
        </div>

        {/* Ranking List panel */}
        <div className="glass-panel rounded-3xl p-6 border border-white/5 flex flex-col justify-between min-h-[380px]">
          <div>
            <div className="flex items-center space-x-2.5 mb-6">
              <Award size={18} className="text-brand-warning" />
              <h3 className="font-extrabold text-sm uppercase tracking-widest text-white">Campeões de Venda</h3>
            </div>
            
            <div className="space-y-3.5">
              {stats.topProdutos.length > 0 ? (
                stats.topProdutos.map((p, idx) => (
                  <div key={idx} className="flex justify-between items-center bg-brand-dark/30 border border-brand-border/30 rounded-xl p-3">
                    <div className="flex items-center space-x-3 truncate">
                      <span className="h-6 w-6 rounded-lg bg-brand-border flex items-center justify-center font-bold text-xs text-brand-warning">
                        {idx + 1}
                      </span>
                      <p className="text-xs font-bold text-white truncate max-w-[150px]">{p.nome}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-black text-brand-success">{p.quantidade} un</p>
                      <span className="text-[10px] text-gray-500 font-medium">R$ {p.total.toFixed(2)}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-xs text-gray-500 font-semibold py-12">
                  Nenhuma venda computada para o período.
                </div>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-brand-border/40 text-center text-[10px] text-gray-500 font-bold uppercase tracking-wider">
            Atualizado em tempo real
          </div>
        </div>

      </div>

    </div>
  );
}
