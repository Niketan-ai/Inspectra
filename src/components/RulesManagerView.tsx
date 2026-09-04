import React, { useState } from 'react';
import { ScrollText, Search, CheckCircle2, Shield, Scale, Info, ToggleLeft, ToggleRight } from 'lucide-react';
import { ComplianceRule } from '../types.js';

interface RulesManagerViewProps {
  rules: ComplianceRule[];
  onToggleRule: (ruleId: string, enabled: boolean) => Promise<void>;
}

export const RulesManagerView: React.FC<RulesManagerViewProps> = ({ rules, onToggleRule }) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  const categories = ['ALL', 'MANDATORY_DECLARATIONS', 'MRP', 'NET_QUANTITY', 'DATES', 'CONSUMER_CARE', 'PHYSICAL_STANDARD'];

  const filteredRules = rules.filter(r => {
    const matchesSearch =
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.legalReference.toLowerCase().includes(search.toLowerCase()) ||
      r.description.toLowerCase().includes(search.toLowerCase());

    const matchesCat = selectedCategory === 'ALL' || r.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="space-y-6 pb-16 animate-in fade-in duration-200">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-widest px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
              Statutory Rule Registry
            </span>
            <span className="text-xs text-zinc-500">PCR 2011 Codified Engine</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-zinc-100 mt-1">
            Legal Metrology (Packaged Commodities) Rules
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Deterministic rule definitions evaluated against extracted package text. Rules do not guess or classify unprinted commodities.
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search by rule name, rule number (e.g. Rule 6(1)), or statutory text..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedCategory === cat
                  ? 'bg-zinc-800 text-emerald-400 border border-zinc-700'
                  : 'text-zinc-400 hover:text-zinc-200 bg-zinc-900/60 border border-zinc-800'
              }`}
            >
              {cat.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Rules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredRules.map(rule => (
          <div
            key={rule.id}
            className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-colors space-y-3 flex flex-col justify-between"
          >
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      {rule.legalReference}
                    </span>
                    <span className="text-[10px] uppercase font-bold text-zinc-500 font-mono">
                      {rule.category}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-zinc-100 mt-1.5">{rule.name}</h3>
                </div>

                {/* Toggle Button */}
                <button
                  onClick={() => onToggleRule(rule.id, !rule.enabled)}
                  className={`p-1 rounded-lg transition-colors ${
                    rule.enabled ? 'text-emerald-400 hover:text-emerald-300' : 'text-zinc-600 hover:text-zinc-500'
                  }`}
                  title={rule.enabled ? 'Disable Rule' : 'Enable Rule'}
                >
                  {rule.enabled ? (
                    <ToggleRight className="w-7 h-7" />
                  ) : (
                    <ToggleLeft className="w-7 h-7" />
                  )}
                </button>
              </div>

              <p className="text-xs text-zinc-400 leading-relaxed">{rule.description}</p>
            </div>

            <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between text-[11px] font-mono">
              <span className="text-zinc-500">
                Severity:{' '}
                <strong className={rule.severity === 'CRITICAL' ? 'text-rose-400' : 'text-amber-400'}>
                  {rule.severity}
                </strong>
              </span>
              <span className={rule.enabled ? 'text-emerald-400' : 'text-zinc-500'}>
                {rule.enabled ? 'Active in Engine' : 'Rule Inactive'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
