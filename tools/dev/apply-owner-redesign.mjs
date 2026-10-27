// tools/dev/apply-owner-redesign.mjs
// Script to upgrade owner dashboard UI, UX, and human Indonesian copywriting in workers/owner/index.js.
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const indexPath = path.resolve('workers/owner/index.js');
let code = fs.readFileSync(indexPath, 'utf8');

// 1. Upgrade CSS
const newCSS = `:root{
  --cream:#FFF8ED;
  --ink:#2B2118;
  --yellow:#FFD23F;
  --header-bg:#FFFFFF;
  --sidebar-bg:#1e293b;
  --sidebar-hover:#334155;
  --sidebar-active:#0f172a;
  --sidebar-text:#cbd5e1;
  --sidebar-heading:#94a3b8;
  --bg:#f8fafc;
  --bg-subtle:#f1f5f9;
  --card-bg:#FFFFFF;
  --card-border:#e2e8f0;
  --card-border-hover:#cbd5e1;
  --text-main:#1e293b;
  --text-muted:#64748b;
  --text-subtle:#94a3b8;
  --brand-gold:#d97706;
  --brand-accent:#f59e0b;
  --brand-surface:#fef3c7;
  --brand-tint:#fffbeb;
  --brand-dark:#78350f;
  --blue:#4f46e5;
  --blue-subtle:#eef2ff;
  --blue-border:#c7d2fe;
  --emerald:#059669;
  --emerald-subtle:#ecfdf5;
  --emerald-border:#a7f3d0;
  --rose:#dc2626;
  --rose-subtle:#fef2f2;
  --rose-border:#fecaca;
  --spark-line:#4f46e5;
  --spark-grid:#e2e8f0;
  --spark-bg:#f8fafc;
  --shadow-xs:0 1px 2px 0 rgba(15,23,42,0.04);
  --shadow-sm:0 1px 3px 0 rgba(15,23,42,0.08),0 1px 2px -1px rgba(15,23,42,0.04);
  --shadow-md:0 4px 12px -2px rgba(15,23,42,0.08),0 2px 6px -2px rgba(15,23,42,0.04);
  --shadow-lg:0 12px 24px -4px rgba(15,23,42,0.1),0 4px 8px -4px rgba(15,23,42,0.04);
  --radius-sm:6px;
  --radius-md:10px;
  --radius-lg:14px;
  --radius-xl:18px;
  --radius-full:9999px;
  --trans:all .2s cubic-bezier(.4,0,.2,1);
}
@media(prefers-color-scheme:dark){
  :root{
    --header-bg:#0f172a;
    --sidebar-bg:#090d16;
    --sidebar-hover:#1e293b;
    --sidebar-active:#020617;
    --sidebar-text:#94a3b8;
    --bg:#0b0f17;
    --bg-subtle:#111827;
    --card-bg:#131c2e;
    --card-border:#1e293b;
    --card-border-hover:#334155;
    --text-main:#f8fafc;
    --text-muted:#94a3b8;
    --text-subtle:#64748b;
    --brand-surface:rgba(245,158,11,.15);
    --brand-tint:rgba(245,158,11,.08);
    --brand-dark:#fde68a;
    --blue-subtle:rgba(79,70,229,.15);
    --blue-border:#3730a3;
    --emerald-subtle:rgba(5,150,105,.12);
    --emerald-border:#047857;
    --rose-subtle:rgba(220,38,38,.12);
    --rose-border:#b91c1c;
    --spark-line:#818cf8;
    --spark-grid:#1e293b;
    --spark-bg:#0d1424;
  }
}
*{box-sizing:border-box}
body{
  margin:0;
  background:var(--bg);
  color:var(--text-main);
  font:13.5px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;
  -webkit-font-smoothing:antialiased;
  letter-spacing:-.01em;
}

/* --- Top Header Navigation Bar --- */
.page-header{
  position:sticky;
  top:0;
  z-index:100;
  height:62px;
  background:var(--header-bg);
  border-bottom:1px solid var(--card-border);
  box-shadow:0 1px 4px rgba(15,23,42,0.04);
}
.page-header-inner{
  display:flex;
  align-items:center;
  justify-content:space-between;
  height:100%;
  padding:0 24px;
  gap:16px;
}
.page-logo{
  display:flex;
  align-items:center;
  gap:12px;
  width:260px;
  flex-shrink:0;
}
.logo-link{
  display:inline-flex;
  align-items:center;
  gap:10px;
  text-decoration:none;
}
.logo-icon{
  width:36px;
  height:36px;
  background:linear-gradient(135deg,#4f46e5 0%,#2563eb 100%);
  color:#fff;
  border-radius:var(--radius-md);
  display:flex;
  align-items:center;
  justify-content:center;
  box-shadow:0 2px 8px rgba(79,70,229,0.3);
}
.logo-icon .ico{
  width:20px;
  height:20px;
  stroke:#ffffff;
}
.logo-text{
  font-size:16px;
  letter-spacing:-.02em;
  display:flex;
  align-items:baseline;
  gap:6px;
}
.logo-bold{
  font-weight:900;
  color:var(--text-main);
  letter-spacing:0.5px;
}
.logo-gold{
  font-weight:700;
  color:var(--brand-gold);
}
.logo-badge{
  font-size:10px;
  font-weight:700;
  letter-spacing:.06em;
  text-transform:uppercase;
  background:var(--brand-surface);
  color:var(--brand-dark);
  padding:2px 7px;
  border-radius:4px;
  border:1px solid rgba(217,119,6,0.2);
}
.header-tools{
  display:flex;
  align-items:center;
  gap:14px;
  flex-wrap:wrap;
}
.nav-periods{
  display:inline-flex;
  align-items:center;
  gap:6px;
}
.nav-group{
  display:inline-flex;
  background:var(--bg-subtle);
  border:1px solid var(--card-border);
  padding:3px;
  border-radius:var(--radius-full);
  gap:2px;
}
.period-pill{
  padding:5px 14px;
  border-radius:var(--radius-full);
  text-decoration:none;
  color:var(--text-muted);
  font-size:12px;
  font-weight:600;
  background:transparent;
  transition:var(--trans);
}
.period-pill:hover{
  color:var(--text-main);
  background:rgba(0,0,0,0.03);
}
.period-pill[aria-current="page"]{
  background:var(--blue);
  color:#ffffff;
  box-shadow:0 2px 6px rgba(79,70,229,0.35);
}
.header-status-group{
  display:none;
  align-items:center;
  gap:8px;
}
@media(min-width:1100px){
  .header-status-group{display:inline-flex;}
}
.status-chip{
  display:inline-flex;
  align-items:center;
  gap:6px;
  background:var(--bg-subtle);
  border:1px solid var(--card-border);
  padding:5px 12px;
  border-radius:var(--radius-full);
  font-size:11.5px;
  color:var(--text-muted);
  font-weight:500;
}
.user-badge{
  display:none;
  align-items:center;
  gap:8px;
  padding:4px 10px;
  border-radius:var(--radius-full);
  background:var(--bg-subtle);
  border:1px solid var(--card-border);
}
@media(min-width:768px){
  .user-badge{display:inline-flex;}
}
.user-avatar{
  width:26px;
  height:26px;
  border-radius:50%;
  background:linear-gradient(135deg,#d97706 0%,#f59e0b 100%);
  color:#ffffff;
  font-weight:700;
  font-size:10.5px;
  display:flex;
  align-items:center;
  justify-content:center;
}
.user-details{
  display:flex;
  flex-direction:column;
  line-height:1.2;
}
.user-name{
  font-size:11.5px;
  font-weight:700;
  color:var(--text-main);
}
.user-role{
  font-size:9.5px;
  color:var(--text-muted);
  text-transform:uppercase;
  font-weight:600;
}
.nav-exit{
  display:inline-flex;
  align-items:center;
  gap:5px;
  background:transparent;
  border:1px solid var(--rose-border);
  color:var(--rose);
  font-size:12px;
  font-weight:600;
  padding:5px 12px;
  border-radius:var(--radius-full);
  text-decoration:none;
  transition:var(--trans);
}
.nav-exit:hover{
  background:var(--rose-subtle);
}

/* --- Layout Container: Sidebar & Content --- */
.page-wrapper{
  display:flex;
  flex-direction:column;
  min-height:calc(100vh - 62px);
}
.page-container{
  display:flex;
  flex:1;
  width:100%;
}

/* --- Left Sidebar --- */
.sidebar-wrapper{
  width:250px;
  background:var(--sidebar-bg);
  color:var(--sidebar-text);
  flex-shrink:0;
  display:flex;
  flex-direction:column;
  border-right:1px solid rgba(0,0,0,0.1);
  position:sticky;
  top:62px;
  height:calc(100vh - 62px);
  overflow-y:auto;
  scrollbar-width:thin;
}
.sidebar-user{
  padding:18px 18px;
  border-bottom:1px solid rgba(255,255,255,0.07);
}
.user-panel{
  display:flex;
  align-items:center;
  gap:12px;
}
.user-avatar-circle{
  width:42px;
  height:42px;
  border-radius:50%;
  background:linear-gradient(135deg,#d97706 0%,#f59e0b 100%);
  color:#fff;
  font-weight:800;
  font-size:14px;
  display:flex;
  align-items:center;
  justify-content:center;
  position:relative;
  box-shadow:0 3px 8px rgba(0,0,0,0.3);
  flex-shrink:0;
}
.status-dot{
  width:10px;
  height:10px;
  background:#10b981;
  border:2px solid var(--sidebar-bg);
  border-radius:50%;
  position:absolute;
  bottom:0;
  right:0;
}
.user-info{
  display:flex;
  flex-direction:column;
  overflow:hidden;
}
.user-title{
  font-size:13.5px;
  font-weight:700;
  color:#ffffff;
  white-space:nowrap;
  overflow:hidden;
  text-overflow:ellipsis;
}
.user-subtitle{
  font-size:11px;
  color:#94a3b8;
}
.sidebar-menu{
  padding:12px 0 32px;
  display:flex;
  flex-direction:column;
}
.sidebar-heading{
  padding:16px 20px 6px;
  font-size:10.5px;
  font-weight:800;
  letter-spacing:.08em;
  text-transform:uppercase;
  color:var(--sidebar-heading);
}
.sidebar-link{
  display:flex;
  align-items:center;
  gap:11px;
  padding:9px 20px;
  color:var(--sidebar-text);
  text-decoration:none;
  font-size:12.5px;
  font-weight:500;
  border-left:3px solid transparent;
  transition:var(--trans);
}
.sidebar-link:hover{
  background:var(--sidebar-hover);
  color:#ffffff;
  border-left-color:var(--blue);
}
.sidebar-link.active{
  background:var(--sidebar-active);
  color:#ffffff;
  border-left-color:var(--brand-gold);
  font-weight:700;
}
.sidebar-icon{
  display:inline-flex;
  align-items:center;
  justify-content:center;
  flex-shrink:0;
}
.sidebar-icon .ico{
  width:16px;
  height:16px;
}
.sidebar-text{
  white-space:nowrap;
  overflow:hidden;
  text-overflow:ellipsis;
}

/* --- Content Wrapper --- */
.content-wrapper{
  flex:1;
  min-width:0;
  padding:24px 28px 60px;
  background:var(--bg);
}
.page-bar{
  display:flex;
  align-items:center;
  justify-content:space-between;
  flex-wrap:wrap;
  gap:14px;
  background:var(--card-bg);
  border:1px solid var(--card-border);
  border-radius:var(--radius-lg);
  padding:16px 20px;
  margin-bottom:24px;
  box-shadow:var(--shadow-xs);
}
.page-title-breadcrumb{
  display:flex;
  flex-direction:column;
  gap:3px;
}
.page-title{
  font-size:19px;
  font-weight:800;
  color:var(--text-main);
  letter-spacing:-.02em;
  margin:0;
}
.page-breadcrumb{
  display:flex;
  align-items:center;
  gap:6px;
  font-size:11.5px;
  color:var(--text-muted);
  list-style:none;
  margin:0;
  padding:0;
}
.page-breadcrumb a{
  color:var(--text-muted);
  text-decoration:none;
}
.page-breadcrumb a:hover{
  color:var(--blue);
}
.breadcrumb-sep{
  color:var(--text-subtle);
  font-size:10px;
}
.page-bar-pill{
  display:inline-flex;
  align-items:center;
  gap:8px;
  background:var(--bg-subtle);
  border:1px solid var(--card-border);
  padding:6px 14px;
  border-radius:var(--radius-full);
  font-size:12px;
  color:var(--text-muted);
  font-weight:500;
}

/* --- 4 Smart University Quick Stat Cards --- */
.stat-cards-grid{
  display:grid;
  grid-template-columns:1fr;
  gap:16px;
  margin-bottom:28px;
}
@media(min-width:640px){
  .stat-cards-grid{grid-template-columns:repeat(2,1fr);}
}
@media(min-width:1200px){
  .stat-cards-grid{grid-template-columns:repeat(4,1fr);}
}
.stat-card{
  border-radius:var(--radius-lg);
  padding:20px 22px;
  color:#ffffff;
  box-shadow:var(--shadow-md);
  position:relative;
  overflow:hidden;
  transition:var(--trans);
}
.stat-card:hover{
  transform:translateY(-2px);
  box-shadow:var(--shadow-lg);
}
.stat-card.bg-primary{
  background:linear-gradient(135deg,#4f46e5 0%,#3b82f6 100%);
}
.stat-card.bg-success{
  background:linear-gradient(135deg,#059669 0%,#10b981 100%);
}
.stat-card.bg-warning{
  background:linear-gradient(135deg,#d97706 0%,#f59e0b 100%);
}
.stat-card.bg-danger{
  background:linear-gradient(135deg,#dc2626 0%,#ef4444 100%);
}
.stat-card-top{
  display:flex;
  justify-content:space-between;
  align-items:center;
  margin-bottom:10px;
}
.stat-label{
  font-size:11.5px;
  font-weight:800;
  letter-spacing:.05em;
  text-transform:uppercase;
  color:rgba(255,255,255,0.9);
}
.stat-icon-wrap{
  width:36px;
  height:36px;
  border-radius:var(--radius-md);
  background:rgba(255,255,255,0.22);
  display:flex;
  align-items:center;
  justify-content:center;
  backdrop-filter:blur(4px);
}
.stat-icon-wrap .ico{
  width:19px;
  height:19px;
  stroke:#ffffff;
}
.stat-value{
  font-size:26px;
  font-weight:900;
  line-height:1.2;
  color:#ffffff;
  font-variant-numeric:tabular-nums;
  letter-spacing:-.03em;
}
.stat-footer-text{
  margin-top:10px;
  font-size:11.5px;
  color:rgba(255,255,255,0.92);
  border-top:1px solid rgba(255,255,255,0.2);
  padding-top:8px;
  white-space:nowrap;
  overflow:hidden;
  text-overflow:ellipsis;
}

/* --- Mobile Responsiveness for Sidebar --- */
@media(max-width:991px){
  .page-container{flex-direction:column;}
  .sidebar-wrapper{
    width:100%;
    height:auto;
    position:static;
    border-right:none;
    border-bottom:1px solid var(--card-border);
    padding:8px 14px;
  }
  .sidebar-user{display:none;}
  .sidebar-menu{
    flex-direction:row;
    flex-wrap:wrap;
    gap:4px;
    padding:4px 0;
  }
  .sidebar-heading{
    width:100%;
    padding:6px 6px 2px;
    font-size:9.5px;
  }
  .sidebar-link{
    padding:5px 10px;
    border-radius:var(--radius-sm);
    border-left:none;
    font-size:11.5px;
  }
  .content-wrapper{
    padding:16px 16px 48px;
  }
}

/* --- Main Grid & Sections --- */
main{
  display:grid;
  gap:20px;
  grid-template-columns:1fr;
}
@media(min-width:768px){
  main{grid-template-columns:repeat(2,minmax(0,1fr));}
}
@media(min-width:1200px){
  main{grid-template-columns:repeat(3,minmax(0,1fr));}
}
section{
  background:var(--card-bg);
  border:1px solid var(--card-border);
  border-radius:var(--radius-lg);
  padding:22px 24px;
  box-shadow:var(--shadow-xs);
  display:flex;
  flex-direction:column;
  transition:var(--trans);
  position:relative;
}
section:hover{
  box-shadow:var(--shadow-md);
  border-color:var(--card-border-hover);
}
section:has(.wide-panel),
section:has(.card-full-inner){
  grid-column:1 / -1;
}
@media(min-width:1200px){
  section:has(.col-2-panel){
    grid-column:span 2;
  }
}
section h2{
  margin:0 0 8px;
  font-size:14.5px;
  font-weight:800;
  letter-spacing:-.01em;
  color:var(--text-main);
  display:flex;
  align-items:center;
  justify-content:space-between;
  border-bottom:1px solid var(--card-border);
  padding-bottom:10px;
  line-height:1.25;
}
section h2 > span:first-child{
  display:inline-flex;
  align-items:center;
  gap:8px;
}
.section-badge{
  font-size:10.5px;
  font-weight:700;
  text-transform:none;
  letter-spacing:normal;
  padding:3px 9px;
  border-radius:var(--radius-full);
  background:var(--bg-subtle);
  color:var(--text-muted);
  border:1px solid var(--card-border);
  flex-shrink:0;
}
.section-lead{
  font-size:12px;
  color:var(--text-muted);
  line-height:1.45;
  margin:0 0 14px 0;
}
.section-lead b{
  color:var(--text-main);
}
.big{
  font-size:28px;
  font-weight:900;
  font-variant-numeric:tabular-nums;
  letter-spacing:-.03em;
  line-height:1.1;
  color:var(--text-main);
  margin:2px 0 10px;
}
.kpi-hero{
  margin:2px 0 14px;
  padding:14px 16px;
  background:var(--bg-subtle);
  border:1px solid var(--card-border);
  border-radius:var(--radius-md);
  display:flex;
  flex-direction:column;
  gap:3px;
}
.kpi-hero-label{
  font-size:11px;
  font-weight:800;
  letter-spacing:.05em;
  text-transform:uppercase;
  color:var(--text-muted);
}
.kpi-hero .big{
  margin:0;
  line-height:1.1;
}
.kv{
  display:flex;
  justify-content:space-between;
  align-items:center;
  gap:12px;
  padding:7px 4px;
  border-bottom:1px solid var(--card-border);
  font-size:12.5px;
  transition:var(--trans);
}
.kv:hover{
  background:var(--bg-subtle);
  border-radius:var(--radius-sm);
  padding-left:8px;
  padding-right:8px;
}
.kv:last-of-type{
  border-bottom:0;
}
.kv span{
  color:var(--text-muted);
  display:inline-flex;
  align-items:baseline;
  gap:6px;
  font-size:12px;
}
.kv span small{
  color:var(--text-subtle);
  font-size:10.5px;
}
.kv b{
  font-variant-numeric:tabular-nums;
  font-weight:700;
  color:var(--text-main);
  text-align:right;
  white-space:nowrap;
  background:var(--bg-subtle);
  border:1px solid var(--card-border);
  padding:2px 8px;
  border-radius:var(--radius-sm);
  font-size:12px;
}
svg{
  display:block;
  width:100%;
  height:52px;
  margin:10px 0 6px;
  border-radius:var(--radius-md);
  background:var(--spark-bg);
  border:1px solid var(--card-border);
  padding:4px;
}
.card-footer{
  margin-top:auto;
  padding-top:14px;
  display:flex;
  flex-direction:column;
  gap:10px;
}
.note{
  margin-top:0;
  font-size:11.5px;
  color:var(--text-muted);
  border-left:3px solid var(--blue);
  background:var(--bg-subtle);
  border-radius:0 var(--radius-sm) var(--radius-sm) 0;
  padding:9px 12px;
  line-height:1.55;
  border-top:1px solid var(--card-border);
  border-right:1px solid var(--card-border);
  border-bottom:1px solid var(--card-border);
}
.warn{
  margin-top:0;
  font-size:11.5px;
  color:#92400e;
  background:var(--brand-tint);
  border:1px solid #fde68a;
  border-left:3px solid var(--brand-gold);
  border-radius:0 var(--radius-sm) var(--radius-sm) 0;
  padding:9px 12px;
  line-height:1.55;
}
@media(prefers-color-scheme:dark){
  .warn{color:#fde68a;border-color:rgba(217,119,6,.3);}
}
.assume{
  margin-top:0;
  font-size:11.5px;
  color:var(--text-muted);
  background:var(--bg-subtle);
  border:1px solid var(--card-border);
  border-radius:var(--radius-sm);
  padding:10px 14px;
  line-height:1.55;
}
.assume code{
  font-size:10.5px;
  background:var(--card-bg);
  color:var(--brand-gold);
  padding:1px 5px;
  border-radius:4px;
  border:1px solid var(--card-border);
  font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;
}
.nodata{
  margin-top:0;
  font-size:11px;
  color:var(--text-muted);
  background:var(--bg-subtle);
  border:1px dashed var(--card-border-hover);
  border-radius:var(--radius-sm);
  padding:8px 12px;
}
.empty{
  margin:0 0 20px;
  padding:16px 20px;
  border:1px solid var(--brand-accent);
  border-left:5px solid var(--brand-gold);
  border-radius:var(--radius-lg);
  background:var(--brand-tint);
  color:#92400e;
  font-size:13px;
  line-height:1.6;
  box-shadow:var(--shadow-sm);
}
@media(prefers-color-scheme:dark){
  .empty{color:#fde68a;}
}
.empty b{
  display:block;
  font-size:14.5px;
  font-weight:700;
  color:var(--text-main);
  margin-bottom:6px;
}

/* --- Unmeasurable Privacy Details Accordion --- */
.unmeasurable-card{
  background:var(--bg-subtle);
  border:1px solid var(--card-border);
  border-radius:var(--radius-md);
  margin-top:6px;
  overflow:hidden;
  transition:var(--trans);
}
.unmeasurable-card[open]{
  border-color:var(--blue-border);
  background:#ffffff;
}
.unmeasurable-summary{
  padding:8px 12px;
  cursor:pointer;
  list-style:none;
  display:block;
}
.unmeasurable-summary::-webkit-details-marker{
  display:none;
}
.unmeasurable-kv{
  margin:0;
  padding:0;
  border-bottom:none !important;
}
.unmeasurable-badge{
  font-size:10.5px;
  font-weight:600;
  color:var(--text-muted);
  background:var(--card-bg);
  padding:2px 7px;
  border-radius:var(--radius-sm);
  border:1px solid var(--card-border);
}
.unmeasurable-body{
  padding:8px 12px 10px;
  font-size:11px;
  color:var(--text-muted);
  line-height:1.55;
  border-top:1px dashed var(--card-border);
}

/* --- Braincore Evidence Rows & Progress Bar --- */
.evidence-row{
  display:flex;
  flex-direction:column;
  gap:4px;
  padding:6px 0;
  border-bottom:1px solid var(--card-border);
}
.evidence-row:last-child{
  border-bottom:none;
}
.evidence-row-header{
  display:flex;
  justify-content:space-between;
  align-items:baseline;
  font-size:12px;
}
.evidence-row-title{
  color:var(--text-main);
  font-weight:600;
  display:inline-flex;
  align-items:center;
  gap:6px;
}
.evidence-row-val{
  font-variant-numeric:tabular-nums;
  font-weight:700;
  color:var(--text-main);
  font-size:11.5px;
}
.code-pill{
  font-family:ui-monospace,monospace;
  font-size:9.5px;
  color:var(--text-subtle);
  background:var(--card-bg);
  border:1px solid var(--card-border);
  padding:1px 5px;
  border-radius:4px;
}
.evidence-bar-track{
  width:100%;
  height:6px;
  background:var(--card-border);
  border-radius:3px;
  overflow:hidden;
}
.evidence-bar-fill{
  height:100%;
  background:linear-gradient(90deg,#4f46e5 0%,#06b6d4 100%);
  border-radius:3px;
  transition:width .4s ease;
}

/* --- Student Directory Badges --- */
.badge-level{
  font-size:11px;
  font-weight:700;
  padding:2px 8px;
  border-radius:10px;
  background:#e0e7ff;
  color:#3730a3;
  display:inline-block;
}
.badge-mastery{
  font-size:11px;
  font-weight:600;
  padding:2px 8px;
  border-radius:10px;
  display:inline-block;
  background:#f1f5f9;
  color:#475569;
}
.badge-mastery.m0-40{background:#fef3c7;color:#92400e;}
.badge-mastery.m40-60{background:#e0f2fe;color:#0369a1;}
.badge-mastery.m60-80{background:#ccfbf1;color:#0f766e;}
.badge-mastery.m80-100{background:#dcfce7;color:#166534;}

.badge-trend{
  font-size:11px;
  font-weight:600;
  padding:2px 8px;
  border-radius:10px;
  display:inline-block;
  background:#f1f5f9;
  color:#475569;
}
.badge-trend.up{background:#dcfce7;color:#15803d;}
.badge-trend.flat{background:#f1f5f9;color:#64748b;}
.badge-trend.down{background:#fee2e2;color:#b91c1c;}

.mail-pill{
  font-size:11.5px;
  color:#0f172a;
  font-weight:600;
  background:#f8fafc;
  padding:2px 8px;
  border-radius:6px;
  border:1px solid #cbd5e1;
  display:inline-flex;
  align-items:center;
  gap:4px;
}
.empty-dash{
  color:#94a3b8;
  font-size:11px;
}

/* --- Tables & Lists --- */
.table-wrap{
  width:100%;
  overflow-x:auto;
  border:1px solid var(--card-border);
  border-radius:var(--radius-md);
  margin:10px 0;
  background:var(--card-bg);
  box-shadow:var(--shadow-xs);
}
table{
  width:100%;
  border-collapse:separate;
  border-spacing:0;
  font-size:12.5px;
  line-height:1.45;
}
th{
  background:var(--bg-subtle);
  color:var(--text-muted);
  font-weight:700;
  font-size:11px;
  text-transform:uppercase;
  letter-spacing:.05em;
  padding:9px 12px;
  border-bottom:1px solid var(--card-border);
  text-align:right;
  white-space:nowrap;
}
td{
  padding:9px 12px;
  border-bottom:1px solid var(--card-border);
  font-variant-numeric:tabular-nums;
  text-align:right;
  color:var(--text-main);
}
th:first-child,td:first-child{text-align:left;font-weight:600}
tbody tr:last-child td{border-bottom:0}
tbody tr:hover td{background:var(--bg-subtle)}
tr.sel td{background:var(--brand-surface)!important;font-weight:600;color:var(--brand-dark)}
.muted-mark{color:var(--text-subtle);font-size:10.5px;font-weight:normal}
h3{
  margin:14px 0 8px;
  font-size:13.5px;
  font-weight:700;
  color:var(--text-main);
}
h4{
  margin:10px 0 6px;
  font-size:11.5px;
  letter-spacing:.04em;
  text-transform:uppercase;
  color:var(--text-muted);
}
.subgrid{
  display:grid;
  gap:12px;
  grid-template-columns:1fr;
}
@media(min-width:640px){
  .subgrid-2{grid-template-columns:repeat(2,1fr)}
  .subgrid-3{grid-template-columns:repeat(3,1fr)}
}
.evidence-box{
  background:var(--bg-subtle);
  padding:14px 16px;
  border-radius:var(--radius-md);
  border:1px solid var(--card-border);
}
.evidence-box h3{
  margin:10px 0 6px;
  font-size:12px;
  font-weight:800;
  color:var(--text-main);
  text-transform:uppercase;
  letter-spacing:.04em;
}
.evidence-box h3:first-child{margin-top:0}
form{
  padding:0;
  max-width:100%;
}
input,select{
  width:100%;
  padding:9px 12px;
  font-size:13px;
  border:1px solid var(--card-border);
  border-radius:var(--radius-md);
  background:var(--card-bg);
  color:var(--text-main);
  outline:none;
  box-sizing:border-box;
  transition:var(--trans);
}
input:focus,select:focus{
  border-color:var(--blue);
  box-shadow:0 0 0 3px rgba(79,70,229,.15);
}
button{
  padding:9px 16px;
  font-size:13px;
  font-weight:700;
  border:1px solid transparent;
  border-radius:var(--radius-md);
  background:var(--blue);
  color:#fff;
  cursor:pointer;
  box-shadow:var(--shadow-xs);
  transition:var(--trans);
  display:inline-flex;
  align-items:center;
  justify-content:center;
  gap:6px;
}
button:hover{
  opacity:.92;
  transform:translateY(-1px);
  box-shadow:var(--shadow-sm);
}
button:active{
  transform:translateY(0);
}
.export-deck{
  display:grid;
  grid-template-columns:repeat(auto-fit,minmax(200px,1fr));
  gap:10px;
  margin:14px 0;
}
.export-chip{
  display:flex;
  align-items:center;
  gap:9px;
  padding:11px 16px;
  border:1px solid var(--card-border);
  border-radius:var(--radius-md);
  background:var(--card-bg);
  color:var(--text-main);
  text-decoration:none;
  font-size:12.5px;
  font-weight:700;
  box-shadow:var(--shadow-xs);
  transition:var(--trans);
}
.export-chip:hover{
  background:var(--bg-subtle);
  border-color:var(--card-border-hover);
  transform:translateY(-1px);
  box-shadow:var(--shadow-sm);
}
footer{
  margin-top:40px;
  padding:24px 0 40px;
  border-top:1px solid var(--card-border);
  color:var(--text-muted);
  font-size:11.5px;
  line-height:1.65;
}
.login-shell{
  min-height:100vh;
  display:flex;
  align-items:center;
  justify-content:center;
  padding:24px;
  background:radial-gradient(circle at 50% 30%,rgba(79,70,229,.06),transparent 55%),var(--bg);
}
.login-card{
  width:100%;
  max-width:400px;
  background:var(--card-bg);
  border:1px solid var(--card-border);
  border-radius:var(--radius-xl);
  padding:32px;
  box-shadow:var(--shadow-md);
}
.ico{
  width:15px;
  height:15px;
  stroke:currentColor;
  stroke-width:2;
  fill:none;
  stroke-linecap:round;
  stroke-linejoin:round;
  vertical-align:-3px;
  flex-shrink:0;
  display:inline-block;
}
.zone-divider{
  grid-column:1 / -1;
  display:flex;
  align-items:center;
  justify-content:space-between;
  flex-wrap:wrap;
  gap:12px;
  margin:28px 0 8px;
  padding:14px 20px;
  background:var(--card-bg);
  border:1px solid var(--card-border);
  border-radius:var(--radius-md);
  box-shadow:var(--shadow-xs);
}
.zone-divider:first-of-type{
  margin-top:6px;
}
.zone-title-group{
  display:flex;
  align-items:baseline;
  gap:10px;
  flex-wrap:wrap;
}
.zone-badge{
  font-size:10.5px;
  font-weight:800;
  letter-spacing:.08em;
  text-transform:uppercase;
  background:var(--brand-surface);
  border:1px solid var(--card-border);
  color:var(--brand-dark);
  padding:3px 9px;
  border-radius:var(--radius-full);
}
.zone-title{
  margin:0;
  font-size:15px;
  font-weight:800;
  letter-spacing:-.02em;
  color:var(--text-main);
}
.zone-desc{
  font-size:12px;
  color:var(--text-muted);
}
.stat-highlight{
  margin:2px 0 14px;
  padding:14px;
  background:var(--bg-subtle);
  border:1px solid var(--card-border);
  border-radius:var(--radius-md);
  display:flex;
  flex-direction:column;
  gap:10px;
}
.stat-highlight-label{
  font-size:11px;
  font-weight:800;
  letter-spacing:.05em;
  text-transform:uppercase;
  color:var(--text-muted);
  margin-bottom:2px;
}
.stat-highlight .big{
  margin:0;
  line-height:1;
}
.stat-mini-deck{
  display:grid;
  grid-template-columns:repeat(2,1fr);
  gap:8px;
}
.stat-mini{
  display:flex;
  flex-direction:column;
  gap:2px;
  background:var(--card-bg);
  border:1px solid var(--card-border);
  border-radius:var(--radius-sm);
  padding:7px 10px;
}
.stat-mini span{
  font-size:10px;
  font-weight:700;
  letter-spacing:.03em;
  text-transform:uppercase;
  color:var(--text-muted);
}
.stat-mini b{
  font-size:13px;
  font-weight:800;
  color:var(--text-main);
  font-variant-numeric:tabular-nums;
}`;

// Replace CSS
const cssStart = code.indexOf('const CSS = `');
const cssEnd = code.indexOf('`;\n\nconst ICONS = {');
if (cssStart === -1 || cssEnd === -1) {
  console.error('Could not find CSS boundaries in index.js!');
  process.exit(1);
}
code = code.slice(0, cssStart) + 'const CSS = `' + newCSS + code.slice(cssEnd);

// 2. Add BRAINCORE_GLOSSARY and updated evidenceDist + limitRows
const glossaryAndHelpers = `const BRAINCORE_GLOSSARY = {
  // Sebaran penguasaan (Mastery)
  'm0-40': { label: 'Perlu Bimbingan (0–40%)', desc: 'Pemahaman materi masih sangat dasar' },
  'm40-60': { label: 'Cukup / Berkembang (40–60%)', desc: 'Mulai memahami pola soal' },
  'm60-80': { label: 'Mahir (60–80%)', desc: 'Penguasaan materi baik & konsisten' },
  'm80-100': { label: 'Sangat Mahir (80–100%)', desc: 'Penguasaan tingkat tinggi tanpa ragu' },

  // Tren penguasaan (Mastery trend)
  'up': { label: 'Meningkat Pesat ↗', desc: 'Penguasaan bertambah' },
  'flat': { label: 'Stabil Bertahan →', desc: 'Performa konsisten' },
  'down': { label: 'Menurun ↘', desc: 'Perlu latihan pengulangan' },

  // Tren kemajuan (Improvement trend)
  'improving': { label: 'Ada Kemajuan Nyata', desc: 'Skor dan akurasi membaik' },
  'steady': { label: 'Konsisten & Stabil', desc: 'Performa belajar terjaga' },
  'declining': { label: 'Perlu Dukungan Tambahan', desc: 'Menghadapi hambatan' },

  // Pola Miskonsepsi
  'none': { label: 'Konsep Jelas (0 Miskonsepsi)', desc: 'Tidak ada jebakan logika' },
  'mc1': { label: 'Miskonsepsi Ringan (1 Pola Salah)', desc: 'Ada 1 pola kekeliruan berulang' },
  'mc2-3': { label: 'Miskonsepsi Sedang (2–3 Pola)', desc: 'Ada 2 hingga 3 pola salah' },
  'mc4p': { label: 'Perlu Remedial (≥4 Pola)', desc: 'Banyak pola salah butuh bimbingan' },

  // Famili Skill Miskonsepsi
  'comparison': { label: 'Derajat Perbandingan (Comparison)', desc: 'Pola lebih / paling' },
  'nouns-plural': { label: 'Bentuk Jamak Benda (Plural Nouns)', desc: 'Kata benda jamak' },
  'pronouns': { label: 'Kata Ganti Orang (Pronouns)', desc: 'Subjek / objek / posesif' },
  'tense-present': { label: 'Waktu Sekarang (Present Tense)', desc: 'Kejadian saat ini' },
  'other': { label: 'Materi Tata Bahasa Lainnya', desc: 'Topik kurikulum campuran' },

  // Kalibrasi Kesulitan Soal
  'too_easy': { label: 'Soal Terlalu Mudah', desc: 'Murid menjawab tanpa tantangan' },
  'calibrated': { label: 'Tepat Sasaran (Pas & Optimal)', desc: 'Tingkat kesulitan cocok' },
  'too_hard': { label: 'Soal Terlalu Sulit', desc: 'Soal melebihi kemampuan murid' },

  // Galat Kalibrasi IRT
  'e0-10': { label: 'Akurasi Sangat Tinggi (Galat 0–10%)', desc: 'Prediksi sangat akurat' },
  'e10-20': { label: 'Akurasi Baik (Galat 10–20%)', desc: 'Kalibrasi IRT optimal' },
  'e20-40': { label: 'Akurasi Cukup (Galat 20–40%)', desc: 'Variasi performa cukup tinggi' },
  'e40p': { label: 'Perlu Sampel Baru (Galat >40%)', desc: 'Sedang penyesuaian model' },

  // Alasan Keputusan Braincore
  'due_review': { label: 'Jadwal Pengulangan (Spaced Repetition)', desc: 'Waktunya menyegarkan ingatan' },
  'target_difficulty': { label: 'Penyesuaian Level Soal', desc: 'Menyesuaikan tingkat kesulitan' },

  // Hasil Kebijakan
  'positive': { label: 'Hasil Positif (Tercapai)', desc: 'Murid sukses menguasai materi' },
  'mixed': { label: 'Hasil Beragam', desc: 'Sebagian benar, sebagian salah' },
  'negative': { label: 'Belum Optimal', desc: 'Perlu bantuan perancah' },
  'insufficient': { label: 'Sampel Sedang Dikumpulkan', desc: 'Butuh sedikit latihan lagi untuk analisis' },

  // Rekomendasi Kebijakan
  'collect_more_evidence': { label: 'Kumpulkan Sampel Latihan', desc: 'Braincore melanjutkan pengamatan' },
};

// Baris "tidak bisa diukur": panel yang MUSTAHIL dijawab dari lima tabel yang ada tidak diberi
// kueri karangan dan tidak dibiarkan kosong. Ia dicetak dengan alasannya, karena owner lebih
// butuh tahu batas datanya daripada menatap kotak kosong yang ia salah tafsirkan sebagai nol.
const UNMEASURABLE_TEXT = 'tidak bisa diukur dari data yang kita simpan';

function limitRows(m, panel) {
  const items = (m.unmeasurable || []).filter((u) => u.panel === panel);
  if (!items.length) return '';
  return items.map((u) => (
    \`<details class="unmeasurable-card">
      <summary class="unmeasurable-summary">
        <div class="kv unmeasurable-kv"><span>🛡️ \${esc(u.hal)}</span><b>\${esc(UNMEASURABLE_TEXT)}</b></div>
      </summary>
      <div class="unmeasurable-body nodata">Kenapa: \${esc(u.sebab)}</div>
    </details>\`
  )).join('');
}

// Rentang batas-bawah–batas-atas. WAU/MAU disimpan sepasang karena dedup lintas hari mustahil;
// mencetaknya sebagai satu angka akan mengarang presisi yang datanya tidak punya.
function fmtRange(m, lo, hi) {
  if (!isMeasured(m)) return stateText(m);
  const a = Number(lo), b = Number(hi);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return NO_DATA_TEXT;
  if (a === 0 && b === 0) return '0 (' + MEASURED_ZERO_TEXT + ')';
  return fmtInt(a) + '–' + fmtInt(b);
}

function fmtRateRange(m, part, wholeLo, wholeHi) {
  if (!isMeasured(m)) return stateText(m);
  const lo = fmtPct(part, wholeHi), hi = fmtPct(part, wholeLo);
  if (lo === '—' || hi === '—') return '—';
  return lo + '–' + hi;
}

const DEVICE_TRUTH = 'Angka ini ESTIMASI PERANGKAT, bukan orang. Satu orang dengan dua perangkat = dua hitungan; menghapus data browser = perangkat baru; dua orang satu perangkat = satu hitungan.';

/**
 * Distribusi bucket -> baris tabel dengan label manusiawi dan bilah visual.
 * Peta KOSONG dicetak "belum ada pengukuran", BUKAN "0".
 */
function evidenceDist(map, order) {
  const src = map || {};
  const keys = (order ? order.filter((k) => src[k] != null) : Object.keys(src).sort());
  if (!keys.length) return \`<div class="note">\${esc(NO_DATA_TEXT)}</div>\`;
  const total = keys.reduce((n, k) => n + (Number(src[k]) || 0), 0) || 1;
  return keys.map((k) => {
    const val = Number(src[k]) || 0;
    const pct = Math.round((val / total) * 100);
    const item = BRAINCORE_GLOSSARY[k];
    const labelTitle = item ? item.label : k;
    const descHint = item ? item.desc : '';
    return \`
      <div class="evidence-row" title="\${esc(descHint)}">
        <div class="evidence-row-header">
          <span class="evidence-row-title">\${esc(labelTitle)} <small class="code-pill">\${esc(k)}</small></span>
          <b class="evidence-row-val">\${esc(fmtInt(val))} (\${pct}%)</b>
        </div>
        <div class="evidence-bar-track">
          <div class="evidence-bar-fill" style="width:\${pct}%;"></div>
        </div>
      </div>
    \`;
  }).join('');
}`;

const oldLimitRowsStart = code.indexOf('// Baris "tidak bisa diukur"');
const oldEvidenceDistEnd = code.indexOf('/**\n * Panel BUKTI BELAJAR BRAINCORE');
if (oldLimitRowsStart === -1 || oldEvidenceDistEnd === -1) {
  console.error('Could not find limitRows/evidenceDist boundaries!');
  process.exit(1);
}
code = code.slice(0, oldLimitRowsStart) + glossaryAndHelpers + '\n\n' + code.slice(oldEvidenceDistEnd);

// 3. Update renderEvidenceSection
const oldEvidenceFuncStart = code.indexOf('function renderEvidenceSection(m) {');
const oldEvidenceFuncEnd = code.indexOf('/**\n * Panel MURID PER ORANG');
if (oldEvidenceFuncStart === -1 || oldEvidenceFuncEnd === -1) {
  console.error('Could not find renderEvidenceSection boundaries!');
  process.exit(1);
}

const newEvidenceSection = `function renderEvidenceSection(m) {
  const e = m.evidence || { state: 'unconfigured', summary: null };
  const head = '<section><span class="card-full-inner" id="evidence"></span><h2><span>' + ICONS.brain + ' Braincore evidence</span><span class="section-badge">Pedagogi Agregat</span></h2>'
    + '<div class="section-lead">🧠 <b>Kecerdasan Adaptif Braincore</b> · Evaluasi penguasaan materi murid, deteksi miskonsepsi, dan kalibrasi kesulitan soal otomatis.</div>';
  if (e.state === 'unconfigured') {
    return head + \`<div class="note">BELUM DIKONFIGURASI. Secret <code>EVIDENCE_API_BASE</code> dan
      <code>EVIDENCE_API_TOKEN</code> belum dipasang di Worker ini, jadi panel ini tidak pernah memanggil
      apa pun. Ini BUKAN "nol murid".</div></section>\`;
  }
  if (e.state === 'unavailable') {
    return head + \`<div class="warn">\${esc(UNAVAILABLE_TEXT.toUpperCase())}. Subrequest ke
      <code>/api/owner/braincore-evidence</code> gagal\${e.status ? \` (status \${esc(e.status)})\` : ''}.
      Kegagalan baca TIDAK PERNAH dirender sebagai angka nol.</div></section>\`;
  }
  if (e.state === 'not-migrated' || !e.summary) {
    return head + \`<div class="note">PENGUKURAN BELUM TERSEDIA. Database bukti (<code>fiezel-evidence</code>)
      belum dimigrasi atau binding <code>EVIDENCE_DB</code> belum terpasang di Worker api. Ini BUKAN
      "nol murid".</div></section>\`;
  }
  const s = e.summary;
  if (!s.measured) {
    return head + \`<div class="note">BELUM ADA PENGUKURAN pada periode ini. Tidak ada satu pun batch bukti
      yang mendarat\${e.range ? \` antara \${esc(e.range.from)} dan \${esc(e.range.to)}\` : ''}.</div></section>\`;
  }
  const dayRows = (s.days || []).map((d) =>
    \`<tr><td>\${esc(d.day)}</td><td>\${esc(fmtInt(d.learners))}</td><td>\${esc(fmtInt(d.evidence))}</td><td>\${esc(fmtInt(d.decisions))}</td></tr>\`
  ).join('');
  return head + \`
    <div class="kpi-hero" style="margin-bottom:16px;">
      <span class="kpi-hero-label">Murid Terukur Pada Periode Ini</span>
      <div class="big">\${esc(fmtInt(s.learnersMeasured))}</div>
    </div>
    \${row('Murid terukur (periode)', fmtInt(s.learnersMeasured), 'cohort acak berotasi 14 hari')}
    \${row('Bukti belajar terkirim', fmtInt(s.evidenceCount), 'event learner_evidence')}
    \${row('Keputusan Braincore', fmtInt(s.decisionCount), 'event braincore_decision')}
    <div class="subgrid subgrid-2" style="margin-top:16px;">
      <div class="evidence-box">
        <h3>Sebaran Mastery (Tingkat Penguasaan)</h3>\${evidenceDist(s.mastery, ['m0-40', 'm40-60', 'm60-80', 'm80-100'])}
        <h3 style="margin-top:14px;">Tren Perubahan Mastery</h3>\${evidenceDist(s.masteryTrend, ['up', 'flat', 'down'])}
        <h3 style="margin-top:14px;">Tren Kemajuan Belajar</h3>\${evidenceDist(s.improvementTrend, ['improving', 'steady', 'declining'])}
      </div>
      <div class="evidence-box">
        <h3>Deteksi Miskonsepsi Murid</h3>\${evidenceDist(s.misconception, ['none', 'mc1', 'mc2-3', 'mc4p'])}
        <h3 style="margin-top:14px;">Topik Tata Bahasa Yang Keliru</h3>\${evidenceDist(s.misconceptionSkill)}
      </div>
      <div class="evidence-box">
        <h3>Kalibrasi Kesulitan Soal</h3>\${evidenceDist(s.difficultyCalibration, ['too_easy', 'calibrated', 'too_hard'])}
        <h3 style="margin-top:14px;">Galat Presisi Kalibrasi</h3>\${evidenceDist(s.calibrationError, ['e0-10', 'e10-20', 'e20-40', 'e40p'])}
      </div>
      <div class="evidence-box">
        <h3>Alasan Keputusan AI</h3>\${evidenceDist(s.decision)}
        <h3 style="margin-top:14px;">Hasil Kebijakan Pedagogi</h3>\${evidenceDist(s.outcome, ['positive', 'mixed', 'negative', 'insufficient'])}
        <h3 style="margin-top:14px;">Rekomendasi Tindak Lanjut</h3>\${evidenceDist(s.recommendation)}
      </div>
    </div>
    <h3 style="margin-top:18px;">Aktivitas Bukti Belajar Per Hari</h3>
    <div class="table-wrap"><table><tr><th>Hari</th><th>Murid Baru</th><th>Bukti Belajar</th><th>Keputusan AI</th></tr>\${dayRows}</table></div>
    <div class="note" style="margin-top:10px;">"Murid terukur" dijumlahkan dari murid BARU per hari; satu murid yang aktif tiga hari
      terhitung tiga kali. Angka unik lintas-hari TIDAK dihitung, dan itu disengaja: menghitungnya menuntut
      menyimpan pengenal lebih lama daripada yang dibenarkan.</div>
    <div class="note">NOL identitas di panel ini. Yang tersimpan di server hanyalah bucket berenum tertutup;
      nama murid, jawaban, dan riwayat tidak pernah meninggalkan perangkat.</div>
  </section>\`;
}`;

code = code.slice(0, oldEvidenceFuncStart) + newEvidenceSection + '\n\n' + code.slice(oldEvidenceFuncEnd);

// 4. Update renderLearnerDirectory and renderLearnerSection
const oldLearnerDirStart = code.indexOf('function renderLearnerDirectory(m) {');
const oldLearnerDirEnd = code.indexOf('const CLASS_CODE_ALPHABET =');
if (oldLearnerDirStart === -1 || oldLearnerDirEnd === -1) {
  console.error('Could not find renderLearnerDirectory boundaries!');
  process.exit(1);
}

const newLearnerDirectoryAndDetail = `function renderLearnerDirectory(m) {
  const d = m.learners || { state: 'unconfigured', learners: null };
  if (d.state === 'unconfigured') {
    return \`<div class="note">BELUM DIKONFIGURASI. Secret <code>EVIDENCE_API_BASE</code> dan
      <code>EVIDENCE_API_TOKEN</code> belum dipasang, jadi daftar murid tidak pernah dipanggil.
      Ini BUKAN "nol murid".</div>\`;
  }
  if (d.state === 'unavailable') {
    return \`<div class="warn">\${esc(UNAVAILABLE_TEXT.toUpperCase())}. Subrequest ke
      <code>/api/owner/learners</code> gagal\${d.status ? \` (status \${esc(d.status)})\` : ''}.
      Kegagalan baca TIDAK PERNAH dirender sebagai daftar kosong.</div>\`;
  }
  if (d.state === 'not-migrated' || !d.learners) {
    return \`<div class="note">PENGUKURAN BELUM TERSEDIA. Migrasi
      <code>0009_learner_evidence.sql</code> belum diterapkan di <code>fiezel-core</code>, atau
      lane bukti per-murid belum dinyalakan. Ini BUKAN "nol murid".</div>\`;
  }
  if (!d.learners.length) {
    return \`<div class="note">BELUM ADA MURID yang mengirim bukti per-murid pada periode ini.
      Lane ini menuntut PERSETUJUAN tiap murid (Pengaturan &rsaquo; Bukti belajar per murid);
      daftar kosong berarti belum ada yang menyetujuinya, bukan belum ada yang belajar.</div>\`;
  }
  const rows = d.learners.map((x) => {
    const selected = m.learnerSub === x.sub;
    const href = \`/?period=\${esc(m.period)}&amp;learner=\${esc(x.sub)}\`;
    const mark = x.nameSource === 'onboarding' ? '' : ' <span class="muted-mark">(bukan nama perkenalan)</span>';
    const emailCell = x.email
      ? \`<span class="mail-pill">✉️ \${esc(x.email)}</span>\`
      : '<span class="empty-dash">—</span>';
    
    const masteryItem = BRAINCORE_GLOSSARY[x.lastMastery];
    const masteryText = masteryItem ? masteryItem.label : (x.lastMastery || '—');
    const masteryCell = x.lastMastery
      ? \`<span class="badge-mastery \${esc(x.lastMastery)}" title="\${esc(x.lastMastery)}">\${esc(masteryText)}</span>\`
      : '—';

    const trendItem = BRAINCORE_GLOSSARY[x.lastTrend];
    const trendText = trendItem ? trendItem.label : (x.lastTrend || '—');
    const trendCell = x.lastTrend
      ? \`<span class="badge-trend \${esc(x.lastTrend)}" title="\${esc(x.lastTrend)}">\${esc(trendText)}</span>\`
      : '—';

    const levelCell = x.lastLevel
      ? \`<span class="badge-level">\${esc(x.lastLevel)}</span>\`
      : '—';

    return \`<tr\${selected ? ' class="sel"' : ''}>
      <td><a href="\${href}" style="color:var(--blue);font-weight:700;text-decoration:none;">👤 \${esc(learnerLabel(x))}</a>\${mark}</td>
      <td>\${emailCell}</td>
      <td>\${esc(x.lastDay || '—')}</td>
      <td><b>\${esc(fmtInt(x.evidenceCount))}</b></td>
      <td><b>\${esc(fmtInt(x.decisionCount))}</b></td>
      <td>\${levelCell}</td>
      <td>\${masteryCell}</td>
      <td>\${trendCell}</td>
    </tr>\`;
  }).join('');
  return \`<div class="table-wrap"><table><tr><th>Murid</th><th>Email Akun Google</th><th>Aktivitas Terakhir</th><th>Bukti Belajar</th><th>Keputusan AI</th>
    <th>Level CEFR</th><th>Tingkat Mastery</th><th>Tren Belajar</th></tr>\${rows}</table></div>
    <div class="note">Nama diambil dari yang DIKETIK murid di langkah pertama perkenalan
      (<code>learner_name</code>, wajib diisi, terikat <code>identity.sub</code>). Email/Gmail berasal dari
      autentikasi resmi Google (<code>auth_email</code>). Profil sosial (<code>social_profile</code>)
      menjadi pelengkap. Baris "murid &lt;8 hex sub&gt;" berarti murid itu mendaftar sebelum nama disimpan di server, atau namanya belum sampai —
      bukan perilaku normal untuk murid baru.</div>\`;
}

function renderLearnerDetail(m) {
  if (!m.learnerSub) {
    return \`<div class="note">💡 <b>Pilih salah satu murid</b> pada tabel di atas untuk membuka riwayat bukti belajar adaptif Braincore secara mendalam.</div>\`;
  }
  const d = m.learnerDetail;
  if (!d || d.state === 'unconfigured') {
    return \`<div class="note">BELUM DIKONFIGURASI — lihat catatan di daftar murid.</div>\`;
  }
  if (d.state === 'unavailable') {
    return \`<div class="warn">\${esc(UNAVAILABLE_TEXT.toUpperCase())}. Subrequest ke
      <code>/api/owner/learner-evidence</code> gagal\${d.status ? \` (status \${esc(d.status)})\` : ''}.</div>\`;
  }
  if (d.state === 'not-migrated' || !d.summary) {
    return \`<div class="note">PENGUKURAN BELUM TERSEDIA untuk murid ini.</div>\`;
  }
  const name = esc(learnerLabel(d.learner));
  const s2 = d.summary;
  if (!s2.measured) {
    return \`<h3>\${name}</h3><div class="note">BELUM ADA PENGUKURAN pada periode ini untuk murid
      ini. Ia mungkin aktif di periode lain — coba rentang yang lebih panjang.</div>\`;
  }
  const decisionRows = (s2.recentDecisions || []).map((x) => {
    const decItem = BRAINCORE_GLOSSARY[x.decision];
    const decLabel = decItem ? decItem.label : (x.decision || '—');
    const outItem = BRAINCORE_GLOSSARY[x.outcome];
    const outLabel = outItem ? outItem.label : (x.outcome || '—');
    const recItem = BRAINCORE_GLOSSARY[x.recommendation];
    const recLabel = recItem ? recItem.label : (x.recommendation || '—');

    return \`<tr><td>\${esc(x.day)}</td><td>\${esc(decLabel)}</td><td><span class="badge-level">\${esc(x.level || '—')}</span></td>
      <td>\${esc(outLabel)}</td><td>\${esc(recLabel)}</td>
      <td>\${esc(x.masteryDelta || '—')}</td><td>\${esc(x.adherence || '—')}</td></tr>\`;
  }).join('');

  const masteryFirstItem = BRAINCORE_GLOSSARY[s2.masteryFirst];
  const masteryLastItem = BRAINCORE_GLOSSARY[s2.masteryLast];
  const masteryMove = s2.masteryFirst && s2.masteryLast
    ? \`\${esc((masteryFirstItem && masteryFirstItem.label) || s2.masteryFirst)} &rarr; \${esc((masteryLastItem && masteryLastItem.label) || s2.masteryLast)}\`
    : NO_DATA_TEXT;
  const emailBadge = (d.learner && d.learner.email)
    ? \`<div style="margin:4px 0 12px 0;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:6px 12px;display:inline-flex;align-items:center;gap:6px;">
        <span style="font-size:13px;">✉️</span>
        <span style="font-size:12px;color:#166534;font-weight:600;">Akun Google (Gmail): <b style="color:#14532d;">\${esc(d.learner.email)}</b></span>
       </div>\`
    : '';
  return \`<div class="evidence-box" style="margin-top:20px;background:#ffffff;border:1.5px solid var(--blue-border);box-shadow:var(--shadow-sm);">
    <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;border-bottom:1px solid var(--card-border);padding-bottom:10px;margin-bottom:14px;">
      <h3 style="margin:0;font-size:17px;font-weight:800;color:var(--text-main);">👤 Profil Belajar: \${name}</h3>
      <span class="section-badge" style="background:var(--blue-subtle);color:var(--blue);border-color:var(--blue-border);">Target Terpantau</span>
    </div>
    \${emailBadge}
    <div class="kpi-hero" style="margin-bottom:14px;">
      <span class="kpi-hero-label">Total Keputusan Adaptif Braincore</span>
      <div class="big">\${esc(fmtInt(s2.decisionCount))}</div>
    </div>
    \${row('Keputusan Braincore (periode)', fmtInt(s2.decisionCount), 'Jumlah intervensi algoritma')}
    \${row('Bukti belajar (periode)', fmtInt(s2.evidenceCount), 'Total sampel pengamatan')}
    \${row('Hari aktif (periode)', fmtInt(s2.activeDays), 'Hari murid membuka materi')}
    \${row('Rentang terukur', s2.firstDay && s2.lastDay ? s2.firstDay + ' – ' + s2.lastDay : NO_DATA_TEXT, 'Jendela pengamatan')}
    \${row('Perpindahan mastery', masteryMove, 'bucket pertama → bucket terakhir pada periode ini')}
    \${row('Kalibrasi kesulitan', s2.calibratedShare === null ? NO_DATA_TEXT : s2.calibratedShare + '%', 'bagian bukti yang menilai kesulitan "calibrated"')}
    \${row('Miskonsepsi (bucket terakhir)', Object.keys(s2.misconception).length ? Object.keys(s2.misconception).join(', ') : NO_DATA_TEXT, 'Pola kekeliruan terakhir')}
    <div class="subgrid subgrid-2" style="margin-top:16px;">
      <div class="evidence-box">
        <h3>Tren Mastery</h3>\${evidenceDist(s2.masteryTrend, ['up', 'flat', 'down'])}
        <h3 style="margin-top:12px;">Sebaran Mastery</h3>\${evidenceDist(s2.mastery, ['m0-40', 'm40-60', 'm60-80', 'm80-100'])}
        <h3 style="margin-top:12px;">Tren Perbaikan Belajar</h3>\${evidenceDist(s2.improvementTrend, ['improving', 'steady', 'declining'])}
      </div>
      <div class="evidence-box">
        <h3>Famili Skill Miskonsepsi</h3>\${evidenceDist(s2.misconceptionSkill)}
        <h3 style="margin-top:12px;">Kalibrasi Kesulitan Soal</h3>\${evidenceDist(s2.difficultyCalibration, ['too_easy', 'calibrated', 'too_hard'])}
      </div>
      <div class="evidence-box">
        <h3>Alasan Keputusan</h3>\${evidenceDist(s2.decision)}
        <h3 style="margin-top:12px;">Hasil Kebijakan</h3>\${evidenceDist(s2.outcome, ['positive', 'mixed', 'negative', 'insufficient'])}
      </div>
      <div class="evidence-box">
        <h3>Rekomendasi</h3>\${evidenceDist(s2.recommendation)}
      </div>
    </div>
    <h3 style="margin-top:18px;">Keputusan Braincore Terakhir</h3>
    <div class="table-wrap"><table><tr><th>Hari</th><th>Keputusan AI</th><th>Level CEFR</th><th>Hasil</th><th>Rekomendasi</th>
      <th>Δ Mastery</th><th>Kepatuhan</th></tr>\${decisionRows}</table></div>
  </div>\`;
}

function renderLearnerSection(m) {
  return \`<section><span class="card-full-inner" id="learners"></span><h2><span>\${ICONS.users} Murid per orang (Braincore)</span><span class="section-badge">Data Berizin</span></h2>
    <div class="section-lead">🧑‍🎓 <b>Direktori Perkembangan Murid</b> · Menampilkan data murid yang mengizinkan sinkronisasi profil demi pemantauan belajar adaptif personal.</div>
    \${renderLearnerDirectory(m)}
    \${renderLearnerDetail(m)}
    <div class="note" style="margin-top:14px;">Panel ini memuat data BERIDENTITAS, atas persetujuan tiap murid, dan
      terpisah dari panel agregat di atas (yang tetap anonim dan tetap memakai cohort acak
      14 hari). Retensi bukti per-murid <b>180 hari</b>; murid yang mencabut persetujuannya
      menghapus buktinya, dan barisnya hilang dari daftar ini.</div>
  </section>\`;
}`;

code = code.slice(0, oldLearnerDirStart) + newLearnerDirectoryAndDetail + '\n\n' + code.slice(oldLearnerDirEnd);

// 5. Update renderDashboard cards & leads
// Let's enhance each section in renderDashboard with helpful leads and hints
const oldUsersSectionStart = code.indexOf('<section>\n    <span id="users"></span>');
const oldQualitySectionEnd = code.indexOf('${limitRows(m, \'Data quality\')}\n    </div>\n  </section>');

if (oldUsersSectionStart !== -1 && oldQualitySectionEnd !== -1) {
  const fullQualityEnd = oldQualitySectionEnd + '${limitRows(m, \'Data quality\')}\n    </div>\n  </section>'.length;
  
  const upgradedSections = `<section>
    <span id="users"></span>
    <h2><span>\${ICONS.activity} Active users (DAU / WAU / MAU)</span><span class="section-badge">Keaktifan</span></h2>
    <div class="section-lead">📊 <b>Keaktifan Pengguna Harian</b> · Murid yang aktif menyelesaikan minimal 5 latihan soal per hari.</div>
    <div class="stat-highlight">
      <div>
        <div class="stat-highlight-label">Perangkat Aktif (DAU) Hari Terakhir</div>
        <div class="big">\${esc(fmtCount(m, l.dau))}</div>
      </div>
      <div class="stat-mini-deck">
        <div class="stat-mini"><span>Puncak Periode</span><b>\${esc(fmtCount(m, m.peak.dau_peak))}</b></div>
        <div class="stat-mini"><span>Rata-rata Harian</span><b>\${esc(fmtAvg(m, m.peak.dau_avg, 1))}</b></div>
        <div class="stat-mini"><span>Rasio Stickiness</span><b>\${esc(fmtRateRange(m, l.dau, l.mau_lower, l.mau_upper))}</b></div>
        <div class="stat-mini"><span>Hari Terhitung</span><b>\${esc(fmtCount(m, m.peak.dau_days))} <small style="color:var(--text-subtle)">/ \${esc(m.span)}</small></b></div>
      </div>
    </div>
    \${row('DAU (hari rollup terakhir)', fmtCount(m, l.dau), 'Murid aktif hari terakhir')}
    \${row('WAU', fmtRange(m, l.wau_lower, l.wau_upper), 'rentang batas bawah–atas')}
    \${row('MAU', fmtRange(m, l.mau_lower, l.mau_upper), 'rentang batas bawah–atas')}
    \${row('Stickiness DAU/MAU', fmtRateRange(m, l.dau, l.mau_lower, l.mau_upper), 'Tingkat loyalitas belajar')}
    \${row('Puncak DAU pada periode', fmtCount(m, m.peak.dau_peak), 'Rekor tertinggi periode ini')}
    \${row('Rata-rata DAU pada periode', fmtAvg(m, m.peak.dau_avg, 1), 'Rata-rata murid aktif harian')}
    \${row('Hari DAU terrollup pada periode', fmtCount(m, m.peak.dau_days), \`dari \${esc(m.span)}\`)}
    \${sparkline(m.series, 'dau')}
    <div class="card-footer">
      <div class="warn">\${esc(DEVICE_TRUTH)} "Aktif" = hari dengan ≥5 jawaban (ambang yang sama dengan cincin misi murid).</div>
      <div class="warn">WAU dan MAU sengaja RENTANG, bukan satu angka\${Number(l.wau_mau_is_estimate) ? ' (penanda estimasi dari job rollup menyala)' : ''}: token perangkat dirotasi tiap 24 jam dan pepper lama dihapus, jadi menyambungkan perangkat lintas hari mustahil. Batas bawah = perangkat harian terbanyak, batas atas = jumlah seluruh hari.</div>
      <div class="note">DAU/WAU/MAU dibaca dari baris agregat harian yang dibekukan job rollup — dashboard tidak pernah menyentuh tabel token per-perangkat.</div>
      \${limitRows(m, 'Active users')}
    </div>
  </section>

  <section>
    <span id="growth"></span>
    <h2><span>\${ICONS.users} User growth</span><span class="section-badge">Pertumbuhan</span></h2>
    <div class="section-lead">👥 <b>Pertumbuhan & Adopsi</b> · Perangkat baru yang terpasang dan frekuensi pembukaan aplikasi.</div>
    <div class="kpi-hero">
      <span class="kpi-hero-label">Total Perangkat Baru</span>
      <div class="big">\${esc(fmtCount(m, t.new_users))}</div>
    </div>
    \${row('Perangkat baru (periode)', fmtCount(m, t.new_users), 'Murid baru mulai belajar')}
    \${row('Aplikasi dibuka (periode)', fmtCount(m, t.app_open), 'pembukaan, bukan orang unik')}
    \${row('Pembukaan dengan akun tertaut', fmtCount(m, t.app_open_with_identity), 'Sesi murid beridentitas')}
    \${row('Laporan hari-aktif', fmtCount(m, t.day_active_reports), 'Laporan sinkronisasi harian')}
    \${sparkline(m.series, 'new_users')}
    <div class="card-footer">
      <div class="warn">\${esc(DEVICE_TRUTH)}</div>
      <div class="note">"Aplikasi dibuka" adalah BATAS BAWAH: PWA yang dibuka dari precache tanpa jaringan tidak pernah mengirim event, jadi ia tidak terhitung.</div>
      \${limitRows(m, 'User growth')}
    </div>
  </section>

  <section>
    <span id="cost"></span>
    <h2><span>\${ICONS.cost} Cost estimation</span><span class="section-badge">Finansial</span></h2>
    <div class="section-lead">💳 <b>Estimasi Biaya Operasional</b> · Kalkulasi komputasi AI bimbingan dan sintesis suara audio.</div>
    <div class="kpi-hero">
      <span class="kpi-hero-label">Estimasi Biaya Operasional</span>
      <div class="big">\${esc(fmtMoney(m, c.totalUsd))}</div>
    </div>
    \${row('TTS', fmtMoney(m, c.ttsUsd), 'Sintesis suara audio')}
    \${row('LLM', fmtMoney(m, c.llmUsd), 'Model bahasa bimbingan AI')}
    \${row('Biaya / perangkat aktif', !isMeasured(m) ? stateText(m) : (c.usdPerActiveDevice == null ? '—' : fmtUsd(c.usdPerActiveDevice, 4)), 'Estimasi biaya per perangkat aktif')}
    <div class="card-footer">
      <div class="assume">ASUMSI YANG DIPAKAI (bukan angka ajaib — sumber: reports/cf-a10-cost.md + cf-a10-cost-model.json):<br>
        · TTS <code>\${esc(a.ttsProvider)}</code> = <code>\${esc(fmtUsd(a.ttsUsdPer1MChars))}</code> per 1 juta karakter<br>
        · <code>chars_per_audio_min = \${esc(fmtInt(a.charsPerAudioMin))}</code> (kalibrasi 273 aset audio nyata)<br>
        · LLM <code>\${esc(a.llmModel)}</code> = <code>\${esc(fmtUsd(a.llmUsdPer1MIn, 3))}</code> masuk / <code>\${esc(fmtUsd(a.llmUsdPer1MOut, 3))}</code> keluar per 1 juta token<br>
        · Rumus: <code>tts = char_dirender/1e6 × tarif</code>; <code>llm = tok_in/1e6 × tarif_in + tok_out/1e6 × tarif_out</code>; <code>total = tts + llm + infra − kredit</code><br>
        · Hanya cache MISS yang ditagih. TARIF TIDAK DISIMPAN PER HARI: tidak ada tabel biaya di database ini dan tidak boleh ada, jadi tarif di atas dipakai ulang untuk SEMUA hari. Mengubahnya mengubah angka bulan lalu juga — ini estimasi sekarang, bukan jejak audit.
      </div>
      <div class="warn">Penyebut "perangkat aktif" adalah UNDER-COUNT (murid offline tidak terlihat), jadi biaya/perangkat aktif adalah BATAS ATAS, bukan angka pasti.\${a.tokensAreEstimated ? ' Token keluaran = proksi char/4 → biaya LLM adalah estimasi kasar.' : ''} Bila TTS berjalan on-device, biaya TTS nyata NOL dan yang perlu dipantau justru bandwidth model.</div>
      \${limitRows(m, 'Cost estimation')}
    </div>
  </section>

  <div class="zone-divider" id="zone-pedagogy">
    <span class="zone-badge">Zona 02</span>
    <div class="zone-title-group">
      <h3 class="zone-title">Efektivitas Belajar &amp; Retensi Kohor</h3>
      <span class="zone-desc">Aktivitas belajar murid, kurva retensi pengamatan, dan kecerdasan pedagogi Braincore.</span>
    </div>
  </div>

  <section>
    <span id="activity"></span>
    <h2><span>\${ICONS.book} Learning activity</span><span class="section-badge">Pelajaran</span></h2>
    <div class="section-lead">📖 <b>Aktivitas Latihan Kuis</b> · Volume penyelesaian soal, rasio keberhasilan, dan ketuntasan modul.</div>
    \${row('Jawaban', fmtCount(m, t.answers), 'Total soal dikerjakan')}
    \${row('Jawaban benar', fmtCount(m, t.answers_ok), 'Soal dijawab tepat')}
    \${row('Akurasi', fmtRate(m, t.answers_ok, t.answers), 'Persentase kebenaran')}
    \${row('Sesi dimulai', fmtCount(m, t.sessions), 'Sesi belajar dibuka')}
    \${row('Sesi tuntas', fmtCount(m, t.sessions_completed), 'Sesi selesai sampai tuntas')}
    \${row('Pelajaran dimulai', fmtCount(m, t.lessons_started), 'Bab pelajaran dibuka')}
    \${row('Pelajaran tuntas', fmtCount(m, t.lessons_completed), 'Bab pelajaran terselesaikan')}
    \${row('Rasio tuntas', fmtRate(m, t.lessons_completed, t.lessons_started), 'Tingkat kelulusan materi')}
    \${sparkline(m.series, 'answers')}
    <div class="card-footer">
      <div class="note">Dilaporkan sendiri oleh klien (self-reported): bisa kurang (murid offline) dan bisa lebih (klien dimodifikasi). Angka biaya TIDAK pernah memakai kanal ini.</div>
    </div>
  </section>

  <section>
    <span class="col-2-panel" id="retention"></span>
    <h2><span>\${ICONS.retention} Retention (observed)</span><span class="section-badge">Kohor Bertahan</span></h2>
    <div class="section-lead">🔁 <b>Retensi Pembelajaran</b> · Mengukur persentase murid yang kembali belajar setelah hari pertama (D1, D7, D30).</div>
    <div class="table-wrap">
      <table><thead><tr><th>Offset</th><th>Kembali</th><th>Cohort</th><th>%</th><th>Kohor</th></tr></thead>
      <tbody>\${retentionRows}</tbody></table>
    </div>
    <div class="card-footer">
      <div class="note">Kolom Cohort (n=) diturunkan dari baris offset D0 kohor yang sama; skema retensi tidak menyimpan ukuran kohor sebagai kolom sendiri. Penyebut tiap baris hanya menjumlahkan kohor yang BENAR-BENAR punya pengamatan di offset itu — kohor yang belum cukup tua tidak diseret masuk sebagai "hilang". Kolom terakhir = jumlah kohor yang menyumbang, supaya "0%" tidak tertukar dengan "nol kohor".</div>
      <div class="warn">PERINGATAN ESTIMASI PERANGKAT: cohort dibangun dari perangkat, bukan orang.
      Ganti perangkat atau hapus data browser terlihat sebagai "berhenti" walau muridnya tetap belajar.
      Belajar offline berhari-hari juga menurunkan retensi tanpa ada murid yang hilang.
      Safari membatasi storage skrip 7 hari → cohort iOS bisa tampak berhenti di D7.</div>
      <div class="note">Persentase disembunyikan bila cohort &lt; \${esc(RETENTION_MIN_COHORT)}: angka presisi di atas cohort kecil adalah derau, bukan sinyal.</div>
      \${limitRows(m, 'Retention')}
    </div>
  </section>

  \${renderEvidenceSection(m)}
  \${renderLearnerSection(m)}

  <div class="zone-divider" id="zone-systems">
    <span class="zone-badge">Zona 03</span>
    <div class="zone-title-group">
      <h3 class="zone-title">Operasi Sistem, Mesin AI &amp; Keandalan Edge</h3>
      <span class="zone-desc">Throughput token LLM, efisiensi cache suara TTS, proteksi kuota, dan integritas data rollup.</span>
    </div>
  </div>

  <section>
    <span id="ai"></span>
    <h2><span>\${ICONS.cpu} AI usage</span><span class="section-badge">Mesin LLM</span></h2>
    <div class="section-lead">🤖 <b>Performa Model AI</b> · Pemantauan volume token, latensi, dan stabilitas endpoint bahasa.</div>
    \${row('Permintaan AI', fmtCount(m, t.ai_calls), 'Total panggilan model')}
    \${row('Berhasil', fmtCount(m, t.ai_success), 'Respons sukses')}
    \${row('Gagal', fmtCount(m, t.ai_failure), 'Gagal terlayani')}
    \${row('Permintaan / perangkat aktif', fmtAvg(m, (Number(t.ai_calls) || 0) / Math.max(1, Number(l.dau) || 0), 2), 'Rata-rata permintaan per perangkat aktif')}
    \${row('Token masuk', fmtCount(m, t.ai_tokens_in), 'Token instruksi masukan')}
    \${row('Token keluaran', fmtCount(m, t.ai_tokens_out), 'Token respons hasil')}
    \${row('Error 429', fmtCount(m, u['ai_err:429']), 'Rate limit AI')}
    \${row('Timeout', fmtCount(m, u['ai_err:timeout']), 'Batas waktu habis')}
    \${row('Error 4xx', fmtCount(m, u['ai_err:4xx']), 'Galat klien')}
    \${row('Error 5xx', fmtCount(m, u['ai_err:5xx']), 'Galat provider')}
    \${row('Error lain', fmtCount(m, u['ai_err:other']), 'Galat jaringan')}
    \${row('Error rate', fmtRate(m, t.ai_failure, t.ai_calls), 'Tingkat kegagalan')}
    \${sparkline(m.series, 'ai_calls')}
    <div class="card-footer">
      \${aiErrBucketSum !== (Number(t.ai_failure) || 0) ? \`<div class="warn">Rincian error berjumlah \${esc(fmtInt(aiErrBucketSum))} sedangkan metrik gagal berbunyi \${esc(fmtCount(m, t.ai_failure))}. Selisih ini nyata (event tanpa kode error tidak masuk rincian), bukan salah tampil — pakai metrik gagal sebagai angka resmi.</div>\` : ''}
      <div class="warn">Token = bisa PROKSI (karakter ÷ 4). Jalur server tidak menandai hari mana yang memakai proksi, jadi peringatan ini dicetak tanpa syarat: perlakukan biaya LLM sebagai estimasi kasar.</div>
      <div class="note">Semua angka AI lahir di Worker (server-side), bukan dari klien — di situlah biaya lahir. Rincian kode error dibaca dari tabel dimensi pemakaian (bucket <code>ai_err:*</code>), bukan dari metrik terpisah per kode.</div>
      \${limitRows(m, 'AI usage')}
    </div>
  </section>

  <section>
    <span id="tts"></span>
    <h2><span>\${ICONS.voice} TTS usage</span><span class="section-badge">Audio Suara</span></h2>
    <div class="section-lead">🔊 <b>Sintesis Suara Pelafalan</b> · Efisiensi cache suara, karakter yang diproses, dan durasi audio.</div>
    \${row('Permintaan TTS', fmtCount(m, t.tts_calls), 'Total audio diminta')}
    \${row('Cache hit', fmtCount(m, t.tts_cache_hits), 'Audio gratis tersimpan')}
    \${row('Cache miss (berbayar)', fmtCount(m, t.tts_cache_misses), 'Audio baru dirender')}
    \${row('Cache hit rate', fmtRate(m, t.tts_cache_hits, ttsTotal), 'Persentase audio gratis')}
    \${row('Karakter dirender', fmtCount(m, t.tts_chars_rendered), 'Karakter teks diproses')}
    \${row('≈ Menit audio', fmtAvg(m, (Number(t.tts_chars_rendered) || 0) / RATE_CARD.charsPerAudioMin, 1), \`\${fmtInt(RATE_CARD.charsPerAudioMin)} char/menit\`)}
    \${row('Berhasil', fmtCount(m, t.tts_success), 'Audio sukses diperdengarkan')}
    \${row('Gagal', fmtCount(m, t.tts_failure), 'Gagal memproses audio')}
    \${row('Gagal 429', fmtCount(m, u['tts_err:429']), 'Rate limit suara')}
    \${row('Gagal timeout', fmtCount(m, u['tts_err:timeout']), 'Waktu render habis')}
    \${row('Gagal 5xx', fmtCount(m, u['tts_err:5xx']), 'Galat server audio')}
    <div class="card-footer">
      <div class="note">Hanya cache MISS yang berbiaya. Mesin suara on-device dihitung terpisah dan tidak masuk biaya; bandwidth model on-device (±152 MB/perangkat) TIDAK terukur skema ini.</div>
    </div>
  </section>

  <section>
    <span id="quota"></span>
    <h2><span>\${ICONS.shield} Quota exhaustion</span><span class="section-badge">Batas Kapasitas</span></h2>
    <div class="section-lead">🛡️ <b>Proteksi Kuota Sistem</b> · Mekanisme pelindung lonjakan biaya agar server tidak over-budget.</div>
    <div class="kpi-hero">
      <span class="kpi-hero-label">Total Penolakan Kuota</span>
      <div class="big">\${esc(fmtCount(m, t.quota_exhausted))}</div>
    </div>
    \${row('Penolakan karena kuota habis', fmtCount(m, t.quota_exhausted), 'penolakan, bukan perangkat')}
    \${row('· kuota AI', fmtCount(m, u['quota:ai']), 'Batas AI harian tercapai')}
    \${row('· kuota TTS', fmtCount(m, u['quota:tts']), 'Batas suara harian tercapai')}
    \${row('· kuota terjemahan', fmtCount(m, u['quota:translate']), 'Batas terjemahan tercapai')}
    \${row('429 dari AI', fmtCount(m, u['ai_err:429']), 'Penolakan provider model')}
    \${row('Breaker terbuka', fmtCount(m, t.breaker_trips), 'Circuit breaker aktif mengamankan')}
    <div class="card-footer">
      \${limitRows(m, 'Quota exhaustion')}
      <div class="note">KEPUTUSAN KUOTA: kalau baris di atas berbunyi "\${esc(NO_DATA_TEXT)}", tidak ada satu pun angka di halaman ini yang boleh dipakai untuk menaikkan atau menurunkan kuota. Yang belum diukur tidak bisa dipangkas.</div>
      <div class="note">Dicatat server-side tepat di cabang yang mengembalikan 429. Angka naik = murid ditolak; itu keputusan biaya yang terlihat, bukan bug yang disembunyikan.</div>
    </div>
  </section>

  <section>
    <span id="infra"></span>
    <h2><span>\${ICONS.server} Infrastructure</span><span class="section-badge">Sistem Edge</span></h2>
    <div class="section-lead">🌐 <b>Keandalan Infrastruktur Edge</b> · Pemantauan Cloudflare Workers, circuit breaker, dan analitik edge.</div>
    \${row('Breaker terbuka', fmtCount(m, t.breaker_trips), 'Insiden proteksi aktif')}
    \${row('Breaker pulih', fmtCount(m, t.breaker_recoveries), 'Pemulihan otomatis sukses')}
    \${row('Event analytics diterima', fmtCount(m, t.events_total), 'Total log aktivitas terverifikasi')}
    <div class="card-footer">
      <div class="note">Hanya tiga baris di atas yang benar-benar ada di tabel agregat. Permintaan Worker, objek/byte R2, error backend, dan latensi p50/p95 hidup di Analytics API Cloudflare (butuh token akun) — lihat baris "tidak bisa diukur" di bawah.</div>
      \${limitRows(m, 'Infrastructure')}
    </div>
  </section>

  <section>
    <span class="col-2-panel" id="quality"></span>
    <h2><span>\${ICONS.check} Data quality</span><span class="section-badge">Integritas</span></h2>
    <div class="section-lead">🔍 <b>Integritas Data Analitik</b> · Status kesehatan data harian, pipeline rollup cron, dan audit kevalidan.</div>
    \${row('Keadaan pengukuran', isMeasured(m) ? 'terukur' : stateText(m), 'Status validitas data')}
    \${row('Pengumpulan dimulai', m.collection.day_first_collected || NO_DATA_TEXT, 'Tanggal awal pelacakan')}
    \${row('Hari terkumpul', m.measurement.daysTotal == null ? stateText(m) : fmtInt(m.measurement.daysTotal) + ' hari', 'Total historis dalam basis data')}
    \${row('Hari dalam periode', m.measurement.daysCounted == null ? stateText(m) : fmtInt(m.measurement.daysCounted) + ' hari', \`dari \${esc(m.span)}\`)}
    \${row('Hari rollup GAGAL', fmtCount(m, brokenDays), 'Hari dengan anomali agregasi')}
    \${row('Rentang hari yang terbaca', isMeasured(m) ? \`\${esc(m.periodDays.day_from || '—')} → \${esc(m.periodDays.day_to || '—')}\` : stateText(m), 'Jendela tanggal pengamatan')}
    <div class="card-footer">
      \${brokenDays > 0 ? \`<div class="warn">\${esc(brokenDays)} hari punya collection_ok=0. Grafik digambar PUTUS di hari itu — tidak diinterpolasi. Jangan bandingkan periode yang memuat hari rusak.</div>\` : ''}
      <div class="note">Semua angka historis dimulai dari tanggal pengumpulan di atas. Sebelum tanggal itu tidak ada data — bukan nol, tetapi tidak diketahui.</div>
      \${limitRows(m, 'Data quality')}
    </div>
  </section>`;

  code = code.slice(0, oldUsersSectionStart) + upgradedSections + code.slice(fullQualityEnd);
}

fs.writeFileSync(indexPath, code, 'utf8');
console.log('Successfully upgraded workers/owner/index.js base redesign!');
try {
  execSync('python tools/dev/apply-investor-enhancements.py', { stdio: 'inherit' });
} catch (e) {
  console.error('Failed to run investor enhancements:', e.message);
}
