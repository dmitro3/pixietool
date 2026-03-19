#!/bin/bash
# PixieCore Setup Script — Run from your pixietool/ root
# Usage: bash setup-pixiecore.sh

set -e

echo "  ✦ Setting up PixieCore..."

# Create directory structure
mkdir -p pixiecore/{bin,src/{db,org,governance,tickets,memory,router,heartbeat}}

echo "  Creating files..."

#───────────── package.json ─────────────
cat > pixiecore/package.json << 'EOF'
{
  "name": "pixiecore",
  "version": "0.1.0",
  "description": "Unified AI agent orchestration — org structure, governance, swarm execution, memory, model routing",
  "bin": { "pixiecore": "./bin/pixiecore.js" },
  "main": "src/index.js",
  "type": "module",
  "scripts": {
    "start": "node bin/pixiecore.js",
    "daemon": "node bin/pixiecore.js daemon start",
    "init": "node bin/pixiecore.js init"
  },
  "dependencies": {
    "better-sqlite3": "^11.0.0",
    "commander": "^12.0.0",
    "chalk": "^5.3.0",
    "ora": "^8.0.0",
    "cron": "^3.1.0"
  },
  "author": "Supreeta & Anuj — Pixiedust",
  "license": "UNLICENSED",
  "private": true
}
EOF

#───────────── schema.sql ─────────────
cat > pixiecore/src/db/schema.sql << 'EOF'
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS companies (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  name TEXT NOT NULL,
  mission TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS agents (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  company_id TEXT NOT NULL REFERENCES companies(id),
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  title TEXT NOT NULL,
  level INTEGER NOT NULL,
  department TEXT NOT NULL,
  reports_to TEXT REFERENCES agents(id),
  spawn_type TEXT DEFAULT 'coder',
  primary_models TEXT,
  primary_tools TEXT,
  specialization TEXT,
  status TEXT DEFAULT 'active',
  monthly_budget_cents INTEGER DEFAULT 0,
  budget_used_cents INTEGER DEFAULT 0,
  budget_reset_at TEXT,
  heartbeat_interval_minutes INTEGER,
  last_heartbeat_at TEXT,
  tasks_completed INTEGER DEFAULT 0,
  tasks_failed INTEGER DEFAULT 0,
  verification_pass_rate REAL DEFAULT 0.0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_agents_company ON agents(company_id);
CREATE INDEX IF NOT EXISTS idx_agents_level ON agents(level);
CREATE INDEX IF NOT EXISTS idx_agents_department ON agents(department);
CREATE INDEX IF NOT EXISTS idx_agents_reports_to ON agents(reports_to);

CREATE TABLE IF NOT EXISTS goals (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  company_id TEXT NOT NULL REFERENCES companies(id),
  parent_goal_id TEXT REFERENCES goals(id),
  title TEXT NOT NULL,
  description TEXT,
  goal_type TEXT NOT NULL,
  assigned_agent_id TEXT REFERENCES agents(id),
  status TEXT DEFAULT 'active',
  priority TEXT DEFAULT 'medium',
  created_at TEXT DEFAULT (datetime('now')),
  completed_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_goals_parent ON goals(parent_goal_id);
CREATE INDEX IF NOT EXISTS idx_goals_agent ON goals(assigned_agent_id);

CREATE TABLE IF NOT EXISTS tickets (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  company_id TEXT NOT NULL REFERENCES companies(id),
  goal_id TEXT REFERENCES goals(id),
  title TEXT NOT NULL,
  description TEXT,
  assigned_agent_id TEXT REFERENCES agents(id),
  created_by_agent_id TEXT REFERENCES agents(id),
  status TEXT DEFAULT 'open',
  priority TEXT DEFAULT 'medium',
  ticket_type TEXT DEFAULT 'task',
  layer1_status TEXT DEFAULT 'pending',
  layer1_report TEXT,
  layer1_completed_at TEXT,
  layer2_status TEXT DEFAULT 'pending',
  layer2_reviewer_id TEXT REFERENCES agents(id),
  layer2_report TEXT,
  layer2_completed_at TEXT,
  layer3_status TEXT DEFAULT 'pending',
  layer3_approver_id TEXT REFERENCES agents(id),
  layer3_report TEXT,
  layer3_completed_at TEXT,
  requires_board_approval INTEGER DEFAULT 0,
  board_approved INTEGER DEFAULT 0,
  board_approved_by TEXT,
  board_approved_at TEXT,
  resubmission_count INTEGER DEFAULT 0,
  max_resubmissions INTEGER DEFAULT 2,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  completed_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_tickets_agent ON tickets(assigned_agent_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_goal ON tickets(goal_id);

CREATE TABLE IF NOT EXISTS ticket_messages (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  ticket_id TEXT NOT NULL REFERENCES tickets(id),
  agent_id TEXT REFERENCES agents(id),
  sender_name TEXT NOT NULL,
  message_type TEXT NOT NULL,
  content TEXT NOT NULL,
  metadata TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_messages_ticket ON ticket_messages(ticket_id);

CREATE TABLE IF NOT EXISTS governance_gates (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  company_id TEXT NOT NULL REFERENCES companies(id),
  action_type TEXT NOT NULL,
  required_approver_role TEXT NOT NULL,
  gate_type TEXT DEFAULT 'board_approval',
  description TEXT,
  active INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS budget_transactions (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  agent_id TEXT NOT NULL REFERENCES agents(id),
  ticket_id TEXT REFERENCES tickets(id),
  model_used TEXT NOT NULL,
  tokens_input INTEGER DEFAULT 0,
  tokens_output INTEGER DEFAULT 0,
  cost_cents INTEGER NOT NULL,
  task_description TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_budget_agent ON budget_transactions(agent_id);
CREATE INDEX IF NOT EXISTS idx_budget_date ON budget_transactions(created_at);

CREATE TABLE IF NOT EXISTS memory (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  company_id TEXT NOT NULL REFERENCES companies(id),
  namespace TEXT NOT NULL,
  content TEXT NOT NULL,
  metadata TEXT,
  embedding TEXT,
  importance REAL DEFAULT 0.5,
  access_count INTEGER DEFAULT 0,
  last_accessed_at TEXT,
  created_by_agent_id TEXT REFERENCES agents(id),
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_memory_namespace ON memory(namespace);
CREATE INDEX IF NOT EXISTS idx_memory_company ON memory(company_id);
CREATE INDEX IF NOT EXISTS idx_memory_importance ON memory(importance DESC);

CREATE TABLE IF NOT EXISTS heartbeat_log (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  agent_id TEXT NOT NULL REFERENCES agents(id),
  status TEXT NOT NULL,
  actions_taken TEXT,
  duration_ms INTEGER,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_heartbeat_agent ON heartbeat_log(agent_id);

CREATE TABLE IF NOT EXISTS model_config (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  company_id TEXT NOT NULL REFERENCES companies(id),
  complexity TEXT NOT NULL,
  primary_model TEXT NOT NULL,
  fallback_model TEXT,
  max_tokens INTEGER,
  cost_per_1m_input_cents INTEGER,
  cost_per_1m_output_cents INTEGER,
  active INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  company_id TEXT NOT NULL REFERENCES companies(id),
  agent_id TEXT REFERENCES agents(id),
  action TEXT NOT NULL,
  details TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_audit_company ON audit_log(company_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_log(action);
EOF

#───────────── db/init.js ─────────────
cat > pixiecore/src/db/init.js << 'EOF'
import Database from 'better-sqlite3';
import { readFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
const __dirname = dirname(fileURLToPath(import.meta.url));
const SCHEMA_PATH = join(__dirname, 'schema.sql');
export function getDbPath(root = process.cwd()) {
  const dir = join(root, '.pixiecore');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return join(dir, 'core.db');
}
export function initDb(root = process.cwd()) {
  const db = new Database(getDbPath(root));
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.exec(readFileSync(SCHEMA_PATH, 'utf-8'));
  return db;
}
export function getDb(root = process.cwd()) {
  const p = getDbPath(root);
  if (!existsSync(p)) throw new Error('PixieCore not initialized. Run: pixiecore init');
  const db = new Database(p);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  return db;
}
EOF

#───────────── org/hierarchy.js ─────────────
cat > pixiecore/src/org/hierarchy.js << 'EOF'
export class OrgManager {
  constructor(db) { this.db = db; }
  createCompany(name, mission) {
    return this.db.prepare('INSERT INTO companies (name, mission) VALUES (?, ?) RETURNING *').get(name, mission);
  }
  getCompany(id) { return this.db.prepare('SELECT * FROM companies WHERE id = ?').get(id); }
  registerAgent({ companyId, name, role, title, level, department, reportsTo = null, spawnType = 'coder', primaryModels = '', primaryTools = '', specialization = '', monthlyBudgetCents = 0, heartbeatIntervalMinutes = null }) {
    return this.db.prepare(`INSERT INTO agents (company_id,name,role,title,level,department,reports_to,spawn_type,primary_models,primary_tools,specialization,monthly_budget_cents,heartbeat_interval_minutes,budget_reset_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,datetime('now','+1 month')) RETURNING *`).get(companyId,name,role,title,level,department,reportsTo,spawnType,primaryModels,primaryTools,specialization,monthlyBudgetCents,heartbeatIntervalMinutes);
  }
  getAgent(id) { return this.db.prepare('SELECT * FROM agents WHERE id = ?').get(id); }
  getAgentByName(name, cid) { return this.db.prepare('SELECT * FROM agents WHERE name = ? AND company_id = ?').get(name, cid); }
  listAgents(cid, { level, department, status = 'active' } = {}) {
    let q = 'SELECT * FROM agents WHERE company_id = ? AND status = ?'; const p = [cid, status];
    if (level !== undefined) { q += ' AND level = ?'; p.push(level); }
    if (department) { q += ' AND department = ?'; p.push(department); }
    return this.db.prepare(q + ' ORDER BY level ASC, name ASC').all(...p);
  }
  getDirectReports(id) { return this.db.prepare("SELECT * FROM agents WHERE reports_to = ? AND status = 'active' ORDER BY level,name").all(id); }
  getReportingChain(id) {
    const chain = []; let c = this.getAgent(id);
    while (c && c.reports_to) { c = this.getAgent(c.reports_to); if (c) chain.push(c); }
    return chain;
  }
  pauseAgent(id) { this.db.prepare("UPDATE agents SET status='paused',updated_at=datetime('now') WHERE id=?").run(id); }
  resumeAgent(id) { this.db.prepare("UPDATE agents SET status='active',updated_at=datetime('now') WHERE id=?").run(id); }
  retireAgent(id) { this.db.prepare("UPDATE agents SET status='retired',updated_at=datetime('now') WHERE id=?").run(id); }
  getOrgTree(cid) {
    const agents = this.listAgents(cid); const map = new Map();
    agents.forEach(a => map.set(a.id, { ...a, children: [] }));
    const roots = [];
    agents.forEach(a => { if (a.reports_to && map.has(a.reports_to)) map.get(a.reports_to).children.push(map.get(a.id)); else roots.push(map.get(a.id)); });
    return roots;
  }
}
EOF

#───────────── governance/gates.js ─────────────
cat > pixiecore/src/governance/gates.js << 'EOF'
export class GovernanceManager {
  constructor(db) { this.db = db; }
  setupDefaultGates(cid) {
    const gates = [
      { a:'deploy_production', r:'CTO,FOUNDER', t:'board_approval', d:'Production deploys need CTO+Founder' },
      { a:'publish_content', r:'CONTENT_DIRECTOR,CMO,FOUNDER', t:'board_approval', d:'Public content needs review chain' },
      { a:'hire_agent', r:'HR_DIRECTOR,FOUNDER', t:'board_approval', d:'New agents need HR+Founder' },
      { a:'increase_budget', r:'COO,FOUNDER', t:'board_approval', d:'Budget changes need COO+Founder' },
      { a:'new_service', r:'CTO,FOUNDER', t:'board_approval', d:'New services need CTO+Founder' },
      { a:'schema_change', r:'VP_ENGINEERING,CTO', t:'ticket_review', d:'Schema changes need VP Eng+CTO' },
      { a:'emergency_rollback', r:'DEVOPS', t:'auto_approved', d:'Rollbacks auto-approved, post-review 1hr' },
    ];
    const s = this.db.prepare('INSERT OR IGNORE INTO governance_gates (company_id,action_type,required_approver_role,gate_type,description) VALUES (?,?,?,?,?)');
    this.db.transaction(() => { for (const g of gates) s.run(cid,g.a,g.r,g.t,g.d); })();
  }
  checkBudget(agentId) {
    const a = this.db.prepare('SELECT * FROM agents WHERE id=?').get(agentId);
    if (!a || a.monthly_budget_cents <= 0) return { allowed: true, remaining: Infinity };
    const pct = (a.budget_used_cents / a.monthly_budget_cents) * 100;
    return { allowed: a.budget_used_cents < a.monthly_budget_cents, used: a.budget_used_cents, limit: a.monthly_budget_cents, remaining: a.monthly_budget_cents - a.budget_used_cents, percentUsed: Math.round(pct*10)/10, warning: pct>=80&&pct<100, exceeded: pct>=100 };
  }
  recordSpend(agentId, { model, tokensIn, tokensOut, costCents, ticketId=null, description='' }) {
    this.db.prepare('INSERT INTO budget_transactions (agent_id,ticket_id,model_used,tokens_input,tokens_output,cost_cents,task_description) VALUES (?,?,?,?,?,?,?)').run(agentId,ticketId,model,tokensIn,tokensOut,costCents,description);
    this.db.prepare("UPDATE agents SET budget_used_cents=budget_used_cents+?,updated_at=datetime('now') WHERE id=?").run(costCents,agentId);
    const s = this.checkBudget(agentId);
    if (s.exceeded) this.db.prepare("UPDATE agents SET status='paused',updated_at=datetime('now') WHERE id=?").run(agentId);
    return s;
  }
  getBudgetReport(cid) {
    return this.db.prepare("SELECT name,role,level,department,monthly_budget_cents,budget_used_cents,CASE WHEN monthly_budget_cents>0 THEN ROUND((CAST(budget_used_cents AS REAL)/monthly_budget_cents)*100,1) ELSE 0 END as pct_used,status FROM agents WHERE company_id=? ORDER BY level,department,name").all(cid);
  }
}
EOF

#───────────── tickets/manager.js ─────────────
cat > pixiecore/src/tickets/manager.js << 'EOF'
export class TicketManager {
  constructor(db) { this.db = db; }
  create({ companyId, title, description='', assignedAgentId=null, createdByAgentId=null, goalId=null, priority='medium', ticketType='task', requiresBoardApproval=false }) {
    const t = this.db.prepare('INSERT INTO tickets (company_id,title,description,assigned_agent_id,created_by_agent_id,goal_id,priority,ticket_type,requires_board_approval) VALUES (?,?,?,?,?,?,?,?,?) RETURNING *').get(companyId,title,description,assignedAgentId,createdByAgentId,goalId,priority,ticketType,requiresBoardApproval?1:0);
    this.addMessage(t.id,createdByAgentId||'SYSTEM','SYSTEM','status_change','Ticket created: '+title);
    return t;
  }
  get(id) { return this.db.prepare('SELECT * FROM tickets WHERE id=?').get(id); }
  list(cid, { status, assignedTo, priority, limit=50 } = {}) {
    let q='SELECT * FROM tickets WHERE company_id=?'; const p=[cid];
    if(status){q+=' AND status=?';p.push(status);} if(assignedTo){q+=' AND assigned_agent_id=?';p.push(assignedTo);}
    if(priority){q+=' AND priority=?';p.push(priority);}
    q+=' ORDER BY CASE priority WHEN "critical" THEN 0 WHEN "high" THEN 1 WHEN "medium" THEN 2 ELSE 3 END, created_at DESC LIMIT ?'; p.push(limit);
    return this.db.prepare(q).all(...p);
  }
  submitLayer1(id,report) { this.db.prepare("UPDATE tickets SET layer1_status='passed',layer1_report=?,layer1_completed_at=datetime('now'),status='in_review',updated_at=datetime('now') WHERE id=?").run(report,id); }
  submitLayer2(id,reviewerId,report,passed) {
    this.db.prepare("UPDATE tickets SET layer2_status=?,layer2_reviewer_id=?,layer2_report=?,layer2_completed_at=datetime('now'),updated_at=datetime('now') WHERE id=?").run(passed?'passed':'failed',reviewerId,report,id);
    if(!passed){ const t=this.get(id); if(t.resubmission_count>=t.max_resubmissions) this.db.prepare("UPDATE tickets SET status='blocked',ticket_type='escalation',updated_at=datetime('now') WHERE id=?").run(id); else this.db.prepare("UPDATE tickets SET resubmission_count=resubmission_count+1,layer1_status='pending',layer2_status='pending',status='in_progress',updated_at=datetime('now') WHERE id=?").run(id); }
  }
  submitLayer3(id,approverId,approved,report='') { this.db.prepare("UPDATE tickets SET layer3_status=?,layer3_approver_id=?,layer3_report=?,layer3_completed_at=datetime('now'),status=?,updated_at=datetime('now') WHERE id=?").run(approved?'passed':'failed',approverId,report,approved?'approved':'rejected',id); }
  boardApprove(id,founder) { this.db.prepare("UPDATE tickets SET board_approved=1,board_approved_by=?,board_approved_at=datetime('now'),status='done',completed_at=datetime('now'),updated_at=datetime('now') WHERE id=?").run(founder,id); }
  addMessage(ticketId,agentId,sender,type,content,meta=null) { this.db.prepare('INSERT INTO ticket_messages (ticket_id,agent_id,sender_name,message_type,content,metadata) VALUES (?,?,?,?,?,?)').run(ticketId,agentId,sender,type,content,meta?JSON.stringify(meta):null); }
  getMessages(id) { return this.db.prepare('SELECT * FROM ticket_messages WHERE ticket_id=? ORDER BY created_at ASC').all(id); }
  getVerificationStats(cid) { return this.db.prepare("SELECT COUNT(*) as total,SUM(CASE WHEN layer1_status='passed' THEN 1 ELSE 0 END) as l1,SUM(CASE WHEN layer2_status='passed' THEN 1 ELSE 0 END) as l2,SUM(CASE WHEN layer3_status='passed' THEN 1 ELSE 0 END) as l3,SUM(CASE WHEN status='done' THEN 1 ELSE 0 END) as done FROM tickets WHERE company_id=?").get(cid); }
}
EOF

#───────────── memory/store.js ─────────────
cat > pixiecore/src/memory/store.js << 'EOF'
export class MemoryStore {
  constructor(db) { this.db = db; }
  store({ companyId, namespace, content, agentId=null, metadata={}, importance=0.5 }) {
    const emb = this._vec(content);
    return this.db.prepare('INSERT INTO memory (company_id,namespace,content,created_by_agent_id,metadata,embedding,importance) VALUES (?,?,?,?,?,?,?) RETURNING *').get(companyId,namespace,content,agentId,JSON.stringify(metadata),JSON.stringify(emb),importance);
  }
  search(cid, query, { namespace=null, limit=10, minImportance=0.0 }={}) {
    const qv = this._vec(query);
    let sql='SELECT * FROM memory WHERE company_id=? AND importance>=?'; const p=[cid,minImportance];
    if(namespace){sql+=' AND namespace=?';p.push(namespace);}
    sql+=' ORDER BY importance DESC, access_count DESC LIMIT 100';
    const cands = this.db.prepare(sql).all(...p);
    const scored = cands.map(m => ({ ...m, similarity: this._cos(qv, JSON.parse(m.embedding||'{}')) }));
    scored.sort((a,b) => b.similarity - a.similarity);
    const res = scored.slice(0, limit);
    const upd = this.db.prepare("UPDATE memory SET access_count=access_count+1,last_accessed_at=datetime('now') WHERE id=?");
    res.forEach(r => upd.run(r.id));
    return res;
  }
  getByNamespace(cid, ns, limit=50) { return this.db.prepare('SELECT * FROM memory WHERE company_id=? AND namespace=? ORDER BY importance DESC,created_at DESC LIMIT ?').all(cid,ns,limit); }
  getStats(cid) { return this.db.prepare('SELECT namespace,COUNT(*) as count,AVG(importance) as avg_importance,SUM(access_count) as total_accesses FROM memory WHERE company_id=? GROUP BY namespace ORDER BY count DESC').all(cid); }
  _vec(text) {
    const words = text.toLowerCase().replace(/[^a-z0-9\s]/g,'').split(/\s+/).filter(w=>w.length>2);
    const f={}; words.forEach(w=>{f[w]=(f[w]||0)+1;});
    const n=Math.sqrt(Object.values(f).reduce((s,v)=>s+v*v,0))||1;
    const v={}; Object.entries(f).forEach(([k,val])=>{v[k]=val/n;}); return v;
  }
  _cos(a,b) {
    if(!a||!b) return 0; let dot=0,nA=0,nB=0;
    new Set([...Object.keys(a),...Object.keys(b)]).forEach(k=>{const x=a[k]||0,y=b[k]||0;dot+=x*y;nA+=x*x;nB+=y*y;});
    const d=Math.sqrt(nA)*Math.sqrt(nB); return d>0?dot/d:0;
  }
}
EOF

#───────────── router/model-router.js ─────────────
cat > pixiecore/src/router/model-router.js << 'EOF'
const DEFAULTS = [
  { complexity:'simple', primary:'gpt-4o-mini', fallback:'claude-haiku', costIn:15, costOut:60 },
  { complexity:'standard', primary:'gpt-4o', fallback:'claude-sonnet', costIn:250, costOut:1000 },
  { complexity:'complex', primary:'claude-opus', fallback:'gpt-4.5', costIn:1500, costOut:7500 },
  { complexity:'multimodal', primary:'gemini-2.5-pro', fallback:'gpt-4o-vision', costIn:125, costOut:500 },
];
export class ModelRouter {
  constructor(db) { this.db = db; }
  setupDefaults(cid) {
    const s = this.db.prepare('INSERT OR IGNORE INTO model_config (company_id,complexity,primary_model,fallback_model,cost_per_1m_input_cents,cost_per_1m_output_cents) VALUES (?,?,?,?,?,?)');
    this.db.transaction(() => { for (const m of DEFAULTS) s.run(cid,m.complexity,m.primary,m.fallback,m.costIn,m.costOut); })();
  }
  route(cid, complexity='standard') {
    const c = this.db.prepare('SELECT * FROM model_config WHERE company_id=? AND complexity=? AND active=1').get(cid,complexity);
    if(!c){ const d=DEFAULTS.find(m=>m.complexity===complexity)||DEFAULTS[1]; return{model:d.primary,fallback:d.fallback,costIn:d.costIn,costOut:d.costOut}; }
    return { model:c.primary_model, fallback:c.fallback_model, costIn:c.cost_per_1m_input_cents, costOut:c.cost_per_1m_output_cents };
  }
  classifyComplexity(task) {
    const l=task.toLowerCase();
    if(/image|visual|photo|video|thumbnail/i.test(l)) return 'multimodal';
    if(/architect|strategy|refactor|migration|security|long.?form|analysis|playbook/i.test(l)) return 'complex';
    if(/hashtag|format|classify|label|tag|slug|trim|sort|filter|validate/i.test(l)) return 'simple';
    return 'standard';
  }
  routeForTask(cid, task) { const cx=this.classifyComplexity(task); return { complexity:cx, ...this.route(cid,cx) }; }
}
EOF

#───────────── heartbeat/scheduler.js ─────────────
cat > pixiecore/src/heartbeat/scheduler.js << 'EOF'
export class HeartbeatScheduler {
  constructor(db) { this.db = db; this.running = false; this.interval = null; }
  start(ms = 60000) { if(this.running) return; this.running=true; this.interval=setInterval(()=>this.tick(),ms); this.tick(); }
  stop() { this.running=false; if(this.interval) clearInterval(this.interval); }
  tick() { for (const a of this.getDueAgents()) this.trigger(a); }
  getDueAgents() {
    return this.db.prepare("SELECT * FROM agents WHERE status='active' AND heartbeat_interval_minutes IS NOT NULL AND (last_heartbeat_at IS NULL OR datetime(last_heartbeat_at,'+'||heartbeat_interval_minutes||' minutes')<=datetime('now')) ORDER BY level").all();
  }
  trigger(agent) {
    const t=Date.now();
    const lid = this.db.prepare("INSERT INTO heartbeat_log (agent_id,status) VALUES (?,'triggered') RETURNING id").get(agent.id).id;
    this.db.prepare("UPDATE agents SET last_heartbeat_at=datetime('now') WHERE id=?").run(agent.id);
    this.db.prepare("UPDATE heartbeat_log SET status='completed',duration_ms=?,actions_taken=? WHERE id=?").run(Date.now()-t,JSON.stringify({agent:agent.name,role:agent.role}),lid);
    return { agentName:agent.name, logId:lid };
  }
  getSchedule(cid) {
    return this.db.prepare("SELECT name,role,department,heartbeat_interval_minutes,last_heartbeat_at,CASE WHEN last_heartbeat_at IS NULL THEN 'never' ELSE datetime(last_heartbeat_at,'+'||heartbeat_interval_minutes||' minutes') END as next_due FROM agents WHERE company_id=? AND heartbeat_interval_minutes IS NOT NULL AND status='active' ORDER BY heartbeat_interval_minutes").all(cid);
  }
}
EOF

#───────────── seed.js ─────────────
cat > pixiecore/src/seed.js << 'EOF'
export function seedPixiedust(org, governance, router) {
  const company = org.createCompany('Pixiedust', 'Build the #1 AI social media platform to $5M ARR');
  const cid = company.id;
  governance.setupDefaultGates(cid);
  router.setupDefaults(cid);
  const B = { L1:6000, L2:4000, L3:3000, L4:2000, L5:1000 };
  function r(n,ro,ti,l,d,rt,sp,to,b,hb=null){ return org.registerAgent({companyId:cid,name:n,role:ro,title:ti,level:l,department:d,reportsTo:rt,spawnType:sp,primaryTools:to,monthlyBudgetCents:b,heartbeatIntervalMinutes:hb}); }
  // L1
  const ATLAS=r('ATLAS','CTO','Chief Technology Officer',1,'Engineering',null,'coordinator','claude-opus,gpt-4o',B.L1);
  const NOVA=r('NOVA','CPO','Chief Product Officer',1,'Product',null,'coordinator','claude-opus,gpt-4o',B.L1);
  const PRISM=r('PRISM','CDO','Chief Design Officer',1,'Design',null,'coordinator','claude-sonnet,gemini-2.5-pro',B.L1);
  const ECHO=r('ECHO','CMO','Chief Marketing Officer',1,'Content & Marketing',null,'coordinator','claude-sonnet,gpt-4o',B.L1);
  const MERIDIAN=r('MERIDIAN','COO','Chief Operating Officer',1,'Operations',null,'coordinator','claude-opus',B.L1);
  // L2
  const FORGE=r('FORGE','VP Engineering','VP Engineering',2,'Engineering',ATLAS.id,'coordinator','claude-opus,github',B.L2);
  const SENTINEL=r('SENTINEL','QA Director','QA Director',2,'Quality Assurance',ATLAS.id,'reviewer','playwright,jest',B.L2);
  const ORACLE=r('ORACLE','VP Data & AI','VP Data & AI',2,'Data Science',ATLAS.id,'researcher','claude-opus,huggingface',B.L2);
  const CANVAS=r('CANVAS','VP Design','VP Design',2,'Design',PRISM.id,'coordinator','figma,claude-sonnet',B.L2);
  const CUT=r('CUT','Video Lead','Video Production Lead',2,'Video & Animation',PRISM.id,'coordinator','ffmpeg,remotion',B.L2);
  const INK=r('INK','Content Director','Content Director',2,'Content & Marketing',ECHO.id,'coordinator','claude-opus,notion',B.L2);
  const ROSTER=r('ROSTER','HR Director','HR Director',2,'Operations',MERIDIAN.id,'coordinator','custom-dashboard',B.L2);
  // L3 Engineering
  r('BOLT','Sr. Frontend','Sr. Frontend Engineer',3,'Engineering',FORGE.id,'coder','nextjs,react,tailwind',B.L3);
  r('CIRCUIT','Sr. Backend','Sr. Backend Engineer',3,'Engineering',FORGE.id,'coder','trpc,supabase,bullmq',B.L3);
  r('RELAY','Sr. Full-Stack','Sr. Full-Stack Engineer',3,'Engineering',FORGE.id,'coder','nextjs,trpc,supabase',B.L3);
  r('NEXUS','Platform Integrations','Platform Integration Engineer',3,'Engineering',FORGE.id,'coder','oauth,platform-apis',B.L3);
  r('FLUX','DevOps','DevOps Engineer',3,'Engineering',FORGE.id,'coder','github-actions,docker,vercel',B.L3);
  // L3 QA
  r('PROBE','Sr. QA','Sr. QA Engineer',3,'Quality Assurance',SENTINEL.id,'reviewer','playwright,cypress,jest',B.L3);
  // L3 Data
  r('TENSOR','ML Training','ML Training Engineer',3,'Data Science',ORACLE.id,'coder','pytorch,huggingface,wandb',B.L3);
  r('HARVEST','Data Procurement','Data Procurement Lead',3,'Data Science',ORACLE.id,'researcher','github-api,hf-hub',B.L3);
  // L3 Design
  r('PIXEL','Sr. UI Designer','Sr. UI Designer',3,'Design',CANVAS.id,'coder','figma,tailwind,shadcn',B.L3);
  r('FRAME','UX Designer','UX Designer',3,'Design',CANVAS.id,'researcher','figma,whimsical',B.L3);
  r('RENDER','3D Designer','3D Designer',3,'Design',CANVAS.id,'coder','blender,threejs',B.L3);
  r('MOTION','Motion Designer','Motion Designer',3,'Design',CANVAS.id,'coder','lottie,rive,framer-motion',B.L3);
  // L3 Video
  r('CLIP','Sr. Video Editor','Sr. Video Editor',3,'Video & Animation',CUT.id,'coder','ffmpeg,remotion',B.L3);
  r('ANIMATE','Animation Lead','Animation Lead',3,'Video & Animation',CUT.id,'coder','remotion,lottie',B.L3);
  // L3 Content
  r('QUILL','Sr. Copywriter','Sr. Copywriter',3,'Content & Marketing',INK.id,'coder','claude-sonnet,gpt-4o',B.L3);
  r('HOOK','Social Strategist','Social Media Strategist',3,'Content & Marketing',INK.id,'researcher','gpt-4o,buzzsumo',B.L3,720);
  r('PRESS','PR Specialist','PR Specialist',3,'Content & Marketing',INK.id,'coder','claude-sonnet',B.L3);
  // L3 Ops
  r('ROUTE','Task Router','Task Router',3,'Operations',MERIDIAN.id,'coordinator','langgraph',B.L3);
  r('BUDGET','Finance Analyst','Finance Analyst',3,'Operations',MERIDIAN.id,'researcher','stripe,openai-dash',B.L3,720);
  // L4
  r('PULSE','Backend Eng','Backend Engineer',4,'Engineering',FORGE.id,'coder','drizzle,bullmq',B.L4);
  r('SPARK','Frontend Eng','Frontend Engineer',4,'Engineering',FORGE.id,'coder','react,storybook',B.L4);
  r('VECTOR','ML/AI Eng','ML/AI Engineer',4,'Engineering',FORGE.id,'coder','langchain,openai',B.L4);
  r('REFINE','Data Eng','Data Engineer',4,'Data Science',ORACLE.id,'coder','pandas,dbt',B.L4);
  r('BENCHMARK','Model Eval','Model Eval Specialist',4,'Data Science',ORACLE.id,'reviewer','eval-harness',B.L4);
  r('SCAN','QA Eng','QA Engineer',4,'Quality Assurance',SENTINEL.id,'reviewer','jest,vitest',B.L4);
  r('AUDIT','Security QA','Security QA Specialist',4,'Quality Assurance',SENTINEL.id,'reviewer','owasp,burp-suite',B.L4);
  r('SHADE','Visual Designer','Visual Designer',4,'Design',CANVAS.id,'coder','midjourney,dall-e',B.L4);
  r('TYPE','Brand Designer','Brand Designer',4,'Design',CANVAS.id,'coder','figma,illustrator',B.L4);
  r('REEL','Video Editor','Video Editor',4,'Video & Animation',CUT.id,'coder','ffmpeg,davinci',B.L4);
  r('WAVE','Audio Eng','Audio Engineer',4,'Video & Animation',CUT.id,'coder','elevenlabs,whisper',B.L4);
  r('MORPH','VFX Specialist','VFX Specialist',4,'Video & Animation',CUT.id,'coder','after-effects,blender',B.L4);
  r('HASH','Social Manager','Social Media Manager',4,'Content & Marketing',INK.id,'coder','buffer-api',B.L4,240);
  r('STORY','Copywriter','Copywriter',4,'Content & Marketing',INK.id,'coder','gpt-4o,claude-haiku',B.L4);
  r('TREND','Research Analyst','Research Analyst',4,'Content & Marketing',INK.id,'researcher','gpt-4o,similarweb',B.L4,480);
  r('SEO','SEO Specialist','SEO Specialist',4,'Content & Marketing',INK.id,'researcher','ahrefs,screaming-frog',B.L4);
  r('SYNC','Coordinator','Cross-Dept Coordinator',4,'Operations',MERIDIAN.id,'coordinator','slack,linear',B.L4);
  r('LOG','Docs Specialist','Documentation Specialist',4,'Operations',MERIDIAN.id,'coder','claude-sonnet,notion',B.L4);
  // L5
  r('TRACE','Jr. Engineer','Jr. Engineer',5,'Engineering',FORGE.id,'coder','gpt-4o-mini',B.L5);
  r('SCRAPE','Data Collector','Data Collection Agent',5,'Data Science',ORACLE.id,'coder','playwright,bs4',B.L5);
  r('LABEL','Annotator','Data Annotation Agent',5,'Data Science',ORACLE.id,'coder','label-studio',B.L5);
  r('LINT','Jr. QA','Jr. QA',5,'Quality Assurance',SENTINEL.id,'reviewer','axe,lighthouse',B.L5);
  r('SUBTITLE','Captions','Caption Specialist',5,'Video & Animation',CUT.id,'coder','whisper,ffmpeg',B.L5);
  r('WATCH','Monitor','System Monitor',5,'Operations',MERIDIAN.id,'coder','sentry,uptimerobot',B.L5,15);
  return company;
}
EOF

#───────────── index.js ─────────────
cat > pixiecore/src/index.js << 'EOF'
export { initDb, getDb } from './db/init.js';
export { OrgManager } from './org/hierarchy.js';
export { GovernanceManager } from './governance/gates.js';
export { TicketManager } from './tickets/manager.js';
export { MemoryStore } from './memory/store.js';
export { ModelRouter } from './router/model-router.js';
export { HeartbeatScheduler } from './heartbeat/scheduler.js';
export { seedPixiedust } from './seed.js';
EOF

#───────────── bin/pixiecore.js (CLI) ─────────────
cat > pixiecore/bin/pixiecore.js << 'CLIEOF'
#!/usr/bin/env node
import { Command } from 'commander';
import { initDb, getDb } from '../src/db/init.js';
import { OrgManager } from '../src/org/hierarchy.js';
import { GovernanceManager } from '../src/governance/gates.js';
import { TicketManager } from '../src/tickets/manager.js';
import { MemoryStore } from '../src/memory/store.js';
import { ModelRouter } from '../src/router/model-router.js';
import { HeartbeatScheduler } from '../src/heartbeat/scheduler.js';
import { seedPixiedust } from '../src/seed.js';
const program = new Command();
program.name('pixiecore').description('PixieCore — Unified AI Agent Orchestration').version('0.1.0');

program.command('init').description('Initialize PixieCore with Pixiedust org').action(()=>{
  const db=initDb(); const org=new OrgManager(db); const gov=new GovernanceManager(db); const rtr=new ModelRouter(db);
  const company=seedPixiedust(org,gov,rtr); const agents=org.listAgents(company.id);
  console.log('\n  ✦ PixieCore initialized\n');
  console.log('  Company: '+company.name);
  console.log('  Mission: '+company.mission);
  console.log('  Agents:  '+agents.length+' registered');
  console.log('  DB:      .pixiecore/core.db\n');
  [1,2,3,4,5].forEach(l=>{const c=agents.filter(a=>a.level===l).length;if(c)console.log('    L'+l+': '+c+' agents');});
  console.log('\n  Try: node bin/pixiecore.js agents list');
  console.log('       node bin/pixiecore.js org tree');
  console.log('       node bin/pixiecore.js status\n');
  db.close();
});

const ag=program.command('agents').description('Manage agents');
ag.command('list').description('List all agents').option('-l, --level <n>','Level').option('-d, --dept <d>','Department').action((o)=>{
  const db=getDb();const org=new OrgManager(db);const co=db.prepare('SELECT * FROM companies LIMIT 1').get();
  const list=org.listAgents(co.id,{level:o.level!==undefined?parseInt(o.level):undefined,department:o.dept});
  console.log('\n  Agents ('+list.length+'):\n');
  for(const a of list){const p=a.monthly_budget_cents>0?Math.round(a.budget_used_cents/a.monthly_budget_cents*100):0;
    console.log('  [L'+a.level+'] '+a.name.padEnd(10)+' '+a.role.padEnd(30)+' '+a.department.padEnd(20)+' '+a.status.padEnd(8)+' $'+(a.budget_used_cents/100).toFixed(0)+'/$'+(a.monthly_budget_cents/100).toFixed(0)+' ('+p+'%)');}
  console.log('');db.close();
});
ag.command('info <name>').description('Agent details').action((name)=>{
  const db=getDb();const org=new OrgManager(db);const co=db.prepare('SELECT * FROM companies LIMIT 1').get();
  const a=org.getAgentByName(name.toUpperCase(),co.id);if(!a){console.error('  Not found: '+name);process.exit(1);}
  const reps=org.getDirectReports(a.id);const chain=org.getReportingChain(a.id);
  console.log('\n  === '+a.name+' ===');console.log('  Role:       '+a.role);console.log('  Level:      L'+a.level);
  console.log('  Dept:       '+a.department);console.log('  Status:     '+a.status);console.log('  Tools:      '+a.primary_tools);
  console.log('  Budget:     $'+(a.budget_used_cents/100).toFixed(2)+' / $'+(a.monthly_budget_cents/100).toFixed(2));
  if(chain.length)console.log('  Reports to: '+chain.map(c=>c.name).join(' → '));
  if(reps.length)console.log('  Manages:    '+reps.map(r=>r.name).join(', '));console.log('');db.close();
});
ag.command('pause <name>').description('Pause agent').action((n)=>{const db=getDb();const org=new OrgManager(db);const co=db.prepare('SELECT * FROM companies LIMIT 1').get();const a=org.getAgentByName(n.toUpperCase(),co.id);if(!a){console.error('Not found');process.exit(1);}org.pauseAgent(a.id);console.log('  Paused: '+a.name);db.close();});
ag.command('resume <name>').description('Resume agent').action((n)=>{const db=getDb();const org=new OrgManager(db);const co=db.prepare('SELECT * FROM companies LIMIT 1').get();const a=org.getAgentByName(n.toUpperCase(),co.id);if(!a){console.error('Not found');process.exit(1);}org.resumeAgent(a.id);console.log('  Resumed: '+a.name);db.close();});

program.command('org').description('Org tree').action(()=>{
  const db=getDb();const org=new OrgManager(db);const co=db.prepare('SELECT * FROM companies LIMIT 1').get();
  const tree=org.getOrgTree(co.id);console.log('\n  === '+co.name+' ===');console.log('  "'+co.mission+'"\n');
  function pr(n,pfx='  '){console.log(pfx+n.name+' — '+n.role+' [L'+n.level+']');n.children.forEach((c,i)=>pr(c,pfx+(i===n.children.length-1?'  └─ ':'  ├─ ')));}
  tree.forEach(r=>pr(r));console.log('');db.close();
});

program.command('status').description('System status').action(()=>{
  const db=getDb();const co=db.prepare('SELECT * FROM companies LIMIT 1').get();
  if(!co){console.error('  Not initialized');process.exit(1);}
  const ac=db.prepare("SELECT level,COUNT(*) as c,SUM(CASE WHEN status='active' THEN 1 ELSE 0 END) as a FROM agents WHERE company_id=? GROUP BY level ORDER BY level").all(co.id);
  const tb=db.prepare('SELECT SUM(monthly_budget_cents) as t,SUM(budget_used_cents) as u FROM agents WHERE company_id=?').get(co.id);
  const mc=db.prepare('SELECT COUNT(*) as c FROM memory WHERE company_id=?').get(co.id);
  console.log('\n  === PixieCore Status ===\n');console.log('  Company: '+co.name);console.log('  Mission: '+co.mission+'\n');
  const lvl=['L0','L1 C-Suite','L2 VP/Dir','L3 Senior','L4 Agent','L5 Junior'];
  ac.forEach(a=>console.log('  '+lvl[a.level].padEnd(14)+a.a+'/'+a.c+' active'));
  console.log('\n  Memory:  '+mc.c+' entries');console.log('  Budget:  $'+((tb.u||0)/100).toFixed(2)+' / $'+((tb.t||0)/100).toFixed(2));console.log('');db.close();
});

program.command('budget').description('Budget report').action(()=>{
  const db=getDb();const gov=new GovernanceManager(db);const co=db.prepare('SELECT * FROM companies LIMIT 1').get();
  const rpt=gov.getBudgetReport(co.id);let tb=0,tu=0;console.log('\n  Budget Report:\n');
  for(const r of rpt){tb+=r.monthly_budget_cents;tu+=r.budget_used_cents;const pct=r.pct_used||0;
    const bar='█'.repeat(Math.round(pct/5))+'░'.repeat(20-Math.round(pct/5));
    console.log('  '+r.name.padEnd(10)+' '+r.role.padEnd(28)+' '+bar+' '+pct+'%');}
  console.log('\n  Total: $'+(tu/100).toFixed(2)+' / $'+(tb/100).toFixed(2)+'\n');db.close();
});

const mem=program.command('memory').description('Agent memory');
mem.command('store <content>').option('-n,--namespace <ns>','Namespace','general').option('-i,--importance <n>','Importance','0.5').action((content,o)=>{
  const db=getDb();const m=new MemoryStore(db);const co=db.prepare('SELECT * FROM companies LIMIT 1').get();
  const r=m.store({companyId:co.id,namespace:o.namespace,content,importance:parseFloat(o.importance)});
  console.log('\n  ✦ Stored: '+r.id+' ['+o.namespace+']\n');db.close();
});
mem.command('search <query>').option('-n,--namespace <ns>').option('-l,--limit <n>','Limit','5').action((query,o)=>{
  const db=getDb();const m=new MemoryStore(db);const co=db.prepare('SELECT * FROM companies LIMIT 1').get();
  const res=m.search(co.id,query,{namespace:o.namespace,limit:parseInt(o.limit)});
  console.log('\n  Search: "'+query+'" ('+res.length+' results)\n');
  for(const r of res) console.log('  ['+r.namespace+'] ('+(r.similarity*100).toFixed(0)+'%) '+r.content.slice(0,100));
  console.log('');db.close();
});

program.command('route <task>').description('Get model recommendation').action((task)=>{
  const db=getDb();const rtr=new ModelRouter(db);const co=db.prepare('SELECT * FROM companies LIMIT 1').get();
  const r=rtr.routeForTask(co.id,task);console.log('\n  Task:       "'+task+'"');
  console.log('  Complexity: '+r.complexity);console.log('  Model:      '+r.model);console.log('  Fallback:   '+r.fallback+'\n');db.close();
});

program.command('heartbeat').description('Heartbeat schedule').action(()=>{
  const db=getDb();const hb=new HeartbeatScheduler(db);const co=db.prepare('SELECT * FROM companies LIMIT 1').get();
  const s=hb.getSchedule(co.id);console.log('\n  Heartbeat Schedule:\n');
  for(const x of s){const iv=x.heartbeat_interval_minutes>=60?x.heartbeat_interval_minutes/60+'h':x.heartbeat_interval_minutes+'m';
    console.log('  '+x.name.padEnd(10)+' '+x.role.padEnd(25)+' every '+iv.padEnd(6)+' last: '+(x.last_heartbeat_at||'never'));}
  console.log('');db.close();
});

program.command('daemon').description('Start daemon').action(()=>{
  const db=getDb();const hb=new HeartbeatScheduler(db);
  console.log('\n  ✦ PixieCore daemon running (Ctrl+C to stop)\n');
  hb.start(60000);process.on('SIGINT',()=>{hb.stop();db.close();console.log('\n  Stopped.');process.exit(0);});
});

program.parse();
CLIEOF

chmod +x pixiecore/bin/pixiecore.js

echo ""
echo "  ✦ PixieCore files created successfully"
echo ""
echo "  Next steps:"
echo "    cd pixiecore"
echo "    npm install"
echo "    node bin/pixiecore.js init"
echo ""
