
import React, { useEffect, useState, useMemo } from "react";
import { Sidebar, Header, StageColumns, OpportunityTable, DetailPanel, BreakdownChart, ConfigModal, AutomationsPage, DebugTests } from './components';
import { defaultWeights, defaultThresholds, FIELD_LABELS, computeScore, ensureSopInitPure, priorityBadgeWith } from './utils';
import { initialOps, stagesOrder } from './data';

export default function AppleCRM_OpportunityScoring_Demo() {
  const [ops, setOps] = useState(initialOps);
  const [selectedId, setSelectedId] = useState(initialOps[0].id);
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("");
  const [sortBy, setSortBy] = useState("scoreDesc");
  const [thresholds, setThresholds] = useState(() => {
    try { return JSON.parse(localStorage.getItem("crm_thresholds_v1") || "null") || defaultThresholds; } catch { return defaultThresholds; }
  });
  const [W, setW] = useState(() => {
    try { return JSON.parse(localStorage.getItem("crm_weights_v1") || "null") || defaultWeights; } catch { return defaultWeights; }
  });
  const [configOpen, setConfigOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("opps");
  const [fieldLocale, setFieldLocale] = useState("zh");

  useEffect(() => { localStorage.setItem("crm_thresholds_v1", JSON.stringify(thresholds)); }, [thresholds]);
  useEffect(() => { localStorage.setItem("crm_weights_v1", JSON.stringify(W)); }, [W]);

  const compute = (o) => computeScore(o, W);

  const filtered = useMemo(() => {
    let list = ops.filter((o) => (!stageFilter || o.stage === stageFilter) && (o.name.includes(search) || o.owner.includes(search)));
    list = list.slice().sort((a, b) => {
      if (sortBy === "scoreAsc") return compute(a).total - compute(b).total;
      if (sortBy === "lastFollowUp") return new Date(b.lastFollowUp) - new Date(a.lastFollowUp);
      return compute(b).total - compute(a).total;
    });
    return list;
  }, [ops, search, stageFilter, sortBy, W]);

  const selected = ensureSopInitPure(ops.find((o) => o.id === selectedId) || filtered[0] || ops[0]);
  const updateSelected = (next) => setOps((prev) => prev.map((o) => (o.id === next.id ? ensureSopInitPure(next) : o)));

  const scopeOps = filtered;

  const exportCSV = () => {
    const fm = FIELD_LABELS[fieldLocale];
    const header = [fm.id, fm.name, fm.stage, fm.owner, fm.score, fm.last, `${fm.budget}(万元)`, fm.priority].join(",");
    const rows = scopeOps.map((o) => {
      const { total } = compute(o);
      const badge = o.priorityOverride || (total >= thresholds.high ? "高优先级" : total >= thresholds.mid ? "中优先级" : "低优先级");
      return [o.id, o.name, o.stage, o.owner, total, o.lastFollowUp, (o.budget / 10000).toFixed(1), badge].join(",");
    });
    const csv = [header, ...rows].join("
");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `商机列表_${new Date().toISOString().slice(0, 10)}.csv`; a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(1200px_600px_at_80%_-20%,#e2e8f0_10%,transparent),linear-gradient(#ffffff,#ffffff)] text-slate-900">
      <div className="flex">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} fieldLocale={fieldLocale} setFieldLocale={setFieldLocale} />
        <div className="flex-1 min-w-0">
          <Header activeTab={activeTab} search={search} setSearch={setSearch} stageFilter={stageFilter} setStageFilter={setStageFilter} sortBy={sortBy} setSortBy={setSortBy} onOpenConfig={() => setConfigOpen(true)} onExportCSV={exportCSV} fieldLocale={fieldLocale} />
          <main className="p-4 lg:p-6 space-y-4">
            {activeTab === "opps" ? (
              <>
                <KPI ops={scopeOps} compute={compute} thresholds={thresholds} />
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                  <div className="xl:col-span-2 space-y-4">
                    <StageColumns ops={scopeOps} onPick={setSelectedId} onMoveStage={moveStage} compute={compute} thresholds={thresholds} />
                    <OpportunityTable ops={scopeOps} onSelect={setSelectedId} selectedId={selectedId} compute={compute} thresholds={thresholds} fieldLocale={fieldLocale} />
                  </div>
                  <div className="xl:col-span-1">
                    {selected ? (
                      <DetailPanel op={selected} onUpdate={updateSelected} compute={compute} thresholds={thresholds} W={W} />
                    ) : (
                      <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-slate-500 h-full flex items-center justify-center">请选择一个商机查看详情</div>
                    )}
                  </div>
                </div>
                <DebugTests />
              </>
            ) : (
              <AutomationsPage rules={rules} setRules={setRules} applyRules={applyRules} />
            )}
          </main>
        </div>
      </div>
      <ConfigModal open={configOpen} onClose={() => setConfigOpen(false)} W={W} setW={setW} thresholds={thresholds} setThresholds={setThresholds} />
    </div>
  );
}
