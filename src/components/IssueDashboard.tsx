"use client";

import {
  Activity, ArrowDownToLine, ArrowRight, Check, ChevronDown, CircleHelp,
  Clock3, Fan, FileImage, Filter, Lightbulb, LockKeyhole, LogOut, Menu,
  Monitor, Plus, Presentation, Search, Send, ShieldCheck, Wifi, X,
} from "lucide-react";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import type { Issue, IssueCategory, IssueStatus, Overview } from "@/types/issue";
import { issueCategories, issueStatuses } from "@/types/issue";

type Section = "overview" | "reports" | "track";
type Ticket = Pick<Issue, "ticketCode" | "category" | "title" | "description" | "building" | "room" | "status" | "createdAt" | "updatedAt">;

const categoryLabels: Record<IssueCategory, string> = { COMPUTER: "Computer", PROJECTOR: "Projector", FAN: "Fan", LIGHT: "Lighting", WIFI: "Wi-Fi" };
const statusLabels: Record<IssueStatus, string> = { PENDING: "Pending", IN_PROGRESS: "In progress", RESOLVED: "Resolved" };
const colors: Record<IssueCategory, string> = { COMPUTER: "mint", PROJECTOR: "violet", FAN: "orange", LIGHT: "yellow", WIFI: "blue" };
const icons: Record<IssueCategory, typeof Monitor> = { COMPUTER: Monitor, PROJECTOR: Presentation, FAN: Fan, LIGHT: Lightbulb, WIFI: Wifi };
const blankOverview: Overview = { total: 0, pending: 0, inProgress: 0, resolved: 0, byCategory: { COMPUTER: 0, PROJECTOR: 0, FAN: 0, LIGHT: 0, WIFI: 0 }, thisWeek: [0, 0, 0, 0, 0, 0, 0] };

function dateLabel(value: string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(value));
}

async function responseError(response: Response) {
  const body = await response.json().catch(() => ({})) as { error?: string };
  return body.error ?? "Something went wrong. Please try again.";
}

async function compressImage(file: File) {
  if (!file.type.startsWith("image/")) throw new Error("Choose an image file.");
  if (file.size > 8 * 1024 * 1024) throw new Error("Choose an image smaller than 8 MB.");
  const image = await createImageBitmap(file);
  const scale = Math.min(1, 1280 / Math.max(image.width, image.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(image.width * scale);
  canvas.height = Math.round(image.height * scale);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("This browser could not process the image.");
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  image.close();
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((item) => item ? resolve(item) : reject(new Error("Could not compress this image.")), "image/jpeg", 0.76));
  if (blob.size > 550 * 1024) throw new Error("The compressed image is too large. Choose a smaller image.");
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("Could not read image."));
    reader.onerror = () => reject(new Error("Could not read image."));
    reader.readAsDataURL(blob);
  });
}

export default function IssueDashboard() {
  const [section, setSection] = useState<Section>("overview");
  const [overview, setOverview] = useState(blankOverview);
  const [todayLabel, setTodayLabel] = useState("");
  const [weekDays, setWeekDays] = useState(["M", "T", "W", "T", "F", "S", "S"]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [databaseError, setDatabaseError] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [trackingCode, setTrackingCode] = useState("");
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [trackError, setTrackError] = useState("");
  const [busy, setBusy] = useState(false);

  async function loadOverview() {
    const response = await fetch("/api/overview", { cache: "no-store" });
    if (response.ok) {
      setOverview(await response.json() as Overview);
      setDatabaseError("");
    } else setDatabaseError(await responseError(response));
  }

  async function loadIssues() {
    const response = await fetch("/api/issues", { cache: "no-store" });
    if (response.ok) setIssues(await response.json() as Issue[]);
  }

  useEffect(() => {
    const dateTimer = window.setTimeout(() => {
      const today = new Date();
      setTodayLabel(new Intl.DateTimeFormat("en", { weekday: "long", month: "long", day: "numeric" }).format(today).toUpperCase());
      setWeekDays(Array.from({ length: 7 }, (_, index) => {
        const day = new Date(today);
        day.setDate(today.getDate() - (6 - index));
        return new Intl.DateTimeFormat("en", { weekday: "short" }).format(day).slice(0, 1);
      }));
    }, 0);

    void fetch("/api/overview", { cache: "no-store" }).then(async (response) => {
      if (response.ok) {
        setOverview(await response.json() as Overview);
        setDatabaseError("");
      } else setDatabaseError(await responseError(response));
    }).catch(() => setDatabaseError("Statistics are unavailable until PostgreSQL is connected."));

    void fetch("/api/admin/session").then(async (response) => {
      const body = await response.json() as { authenticated?: boolean };
      if (body.authenticated) {
        const issuesResponse = await fetch("/api/issues", { cache: "no-store" });
        if (issuesResponse.ok) setIssues(await issuesResponse.json() as Issue[]);
      }
      setIsAdmin(Boolean(body.authenticated));
    }).catch(() => undefined);
    return () => window.clearTimeout(dateTimer);
  }, []);

  const filteredIssues = issues.filter((issue) => {
    const matchesStatus = statusFilter === "ALL" || issue.status === statusFilter;
    const query = search.trim().toLowerCase();
    const matchesSearch = !query || [issue.ticketCode, issue.title, issue.building, issue.room, issue.reporterName].some((value) => value.toLowerCase().includes(query));
    return matchesStatus && matchesSearch;
  });

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setLoginError("");
    const password = new FormData(event.currentTarget).get("password");
    const response = await fetch("/api/admin/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
    if (!response.ok) setLoginError(await responseError(response));
    else { setIsAdmin(true); setLoginOpen(false); setSection("reports"); }
    setBusy(false);
  }

  async function logout() {
    await fetch("/api/admin/session", { method: "DELETE" });
    setIsAdmin(false);
    setIssues([]);
    setSection("overview");
  }

  async function updateStatus(id: string, status: IssueStatus) {
    const response = await fetch(`/api/issues/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    if (response.ok) await Promise.all([loadIssues(), loadOverview()]);
  }

  async function track(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setTicket(null);
    setTrackError("");
    const response = await fetch(`/api/issues/track/${encodeURIComponent(trackingCode.trim())}`);
    if (response.ok) setTicket(await response.json() as Ticket);
    else setTrackError(await responseError(response));
    setBusy(false);
  }

  function exportCsv() {
    const rows = [["Reference", "Issue", "Category", "Building", "Room", "Reporter", "Email", "Status", "Created"]];
    for (const issue of filteredIssues) rows.push([issue.ticketCode, issue.title, categoryLabels[issue.category], issue.building, issue.room, issue.reporterName, issue.reporterEmail, statusLabels[issue.status], dateLabel(issue.createdAt)]);
    const csv = rows.map((row) => row.map((value) => `"${value.replaceAll('"', '""')}"`).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "campus-fix-reports.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  function navigate(next: Section) { setSection(next); setMenuOpen(false); }
  const maxBar = Math.max(1, ...overview.thisWeek);

  return <div className="app-shell">
    <aside className={`sidebar ${menuOpen ? "sidebar-open" : ""}`}>
      <a className="brand" href="#overview" onClick={() => navigate("overview")}><span className="brand-mark"><Activity size={19} /></span><span className="brand-name">campus<span>fix</span><small>FACILITIES DESK</small></span></a>
      <div className="campus-switcher"><span className="campus-monogram">NC</span><span><strong>North Campus</strong><small>Operations</small></span><ChevronDown size={15} /></div>
      <div className="nav-label">WORKSPACE</div>
      <nav className="primary-nav" aria-label="Main navigation">
        <button className={`nav-item ${section === "overview" ? "active" : ""}`} onClick={() => navigate("overview")}><Activity size={17} />Overview</button>
        <button className={`nav-item ${section === "reports" ? "active" : ""}`} onClick={() => isAdmin ? navigate("reports") : setLoginOpen(true)}><Filter size={17} />All reports{isAdmin && <span className="nav-count">{overview.total}</span>}</button>
        <button className={`nav-item ${section === "track" ? "active" : ""}`} onClick={() => navigate("track")}><Search size={17} />Track a report</button>
      </nav>
      <div className="sidebar-lower"><div className="sidebar-note"><i />CAMPUS SERVICES <span>ONLINE</span></div><button className="nav-item" onClick={() => isAdmin ? void logout() : setLoginOpen(true)}>{isAdmin ? <LogOut size={17} /> : <LockKeyhole size={17} />}{isAdmin ? "Sign out" : "Admin access"}</button><div className="profile-row"><span className="profile-avatar">CF</span><span><strong>{isAdmin ? "Campus admin" : "Campus community"}</strong><small>{isAdmin ? "Administrator" : "Issue reporting"}</small></span><ShieldCheck size={16} /></div></div>
    </aside>
    {menuOpen && <button className="nav-scrim" aria-label="Close navigation" onClick={() => setMenuOpen(false)} />}

    <main className="main-area"><header className="topbar"><button className="mobile-menu icon-button" aria-label="Open navigation" onClick={() => setMenuOpen(true)}><Menu size={20} /></button><div className="breadcrumb"><span>North Campus</span><i>/</i><strong>{section === "reports" ? "All reports" : section === "track" ? "Track a report" : "Overview"}</strong></div><div className="topbar-right"><span className="live-label">ISSUE DESK <i /> LIVE</span><button className="top-report-button" onClick={() => setReportOpen(true)}><Plus size={16} />New report</button></div></header>
      <div className="content-wrap">
        {databaseError && <div className="database-banner" role="status"><CircleHelp size={17} />{databaseError}</div>}
        {section === "overview" && <>
          <section className="welcome-row"><div><div className="eyebrow"><i />CAMPUS OPERATIONS <span> / {todayLabel}</span></div><h1>Good things happen<br /><em>when we fix them.</em></h1><p>One place to report what&apos;s broken and keep campus moving.</p></div><button className="hero-report-button" onClick={() => setReportOpen(true)}><Plus size={18} />Report an issue<ArrowRight size={16} /></button></section>
          <section className="metrics-grid" aria-label="Issue statistics"><Metric label="TOTAL REPORTS" value={overview.total} helper="All time on campus" tone="mint" icon={<Activity size={18} />} /><Metric label="NEEDS ATTENTION" value={overview.pending} helper="Waiting to be picked up" tone="coral" icon={<Clock3 size={18} />} /><Metric label="IN THE WORKS" value={overview.inProgress} helper="Being worked on now" tone="yellow" icon={<Activity size={18} />} /><Metric label="BACK IN ACTION" value={overview.resolved} helper="Fixed and confirmed" tone="blue" icon={<Check size={18} />} /></section>
          <section className="insights-grid"><article className="panel activity-panel"><div className="panel-heading"><div><Kicker>THE PULSE</Kicker><h2>Issue activity</h2></div><span className="period-chip"><i />Last 7 days</span></div><div className="activity-total"><strong>{overview.thisWeek.reduce((sum, value) => sum + value, 0)}</strong><span>reports<br />this week</span></div><div className="chart" aria-label="Daily reports over the last 7 days">{overview.thisWeek.map((value, index) => <div className="chart-day" key={index}><div className="bar-space"><i className={index === 6 ? "today" : ""} style={{ height: `${Math.max(value ? 14 : 3, value / maxBar * 100)}%` }} title={`${value} reports`} /></div><span>{weekDays[index]}</span></div>)}</div><div className="chart-foot"><span><i />Daily submissions</span><span>THIS WEEK</span></div></article>
            <article className="panel category-panel"><div className="panel-heading"><div><Kicker>WHERE IT HURTS</Kicker><h2>By category</h2></div><button className="text-link" onClick={() => isAdmin ? navigate("reports") : setLoginOpen(true)}>See reports <ArrowRight size={14} /></button></div><div className="category-list">{issueCategories.map((category) => { const Icon = icons[category]; const count = overview.byCategory[category] ?? 0; const percent = overview.total ? count / overview.total * 100 : 0; return <div className="category-row" key={category}><span className={`category-icon ${colors[category]}`}><Icon size={17} /></span><span className="category-name">{categoryLabels[category]}</span><span className="category-meter"><i className={colors[category]} style={{ width: `${percent}%` }} /></span><strong>{count}</strong></div>; })}</div><div className="category-footer"><span>Share of all issues</span><span>{overview.total ? "5 categories" : "No reports yet"}</span></div></article></section>
          <section className="bottom-grid"><article className="panel community-panel"><div className="community-art"><i /><i /><b><Activity size={25} /></b><span>✳</span></div><div><Kicker>BETTER TOGETHER</Kicker><h2>Small report.<br /><em>Big difference.</em></h2><p>A quick heads-up helps our facilities team make every corner of campus work better.</p><button className="text-link" onClick={() => setReportOpen(true)}>Tell us what needs fixing <ArrowRight size={14} /></button></div></article><article className="panel track-panel"><span className="track-icon"><Search size={18} /></span><Kicker>ALREADY REPORTED?</Kicker><h2>Check your report.</h2><p>Enter the reference number to see the latest update from the team.</p><form className="track-inline" onSubmit={track}><input aria-label="Ticket reference" value={trackingCode} onChange={(event) => setTrackingCode(event.target.value)} placeholder="e.g. ISS-4F82AC" required /><button aria-label="Look up report" type="submit"><ArrowRight size={17} /></button></form></article></section>
        </>}

        {section === "reports" && <section className="reports-section"><div className="page-heading"><div><div className="eyebrow"><i />OPERATIONS DESK</div><h1>All reports <span>{issues.length.toString().padStart(2, "0")}</span></h1><p>Review incoming issues and keep every repair moving.</p></div><button className="secondary-action" onClick={exportCsv} disabled={!filteredIssues.length}><ArrowDownToLine size={15} />Export CSV</button></div><div className="report-toolbar"><label className="report-search"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search reports, rooms, people..." /></label><label className="filter-select"><Filter size={15} /><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="ALL">All statuses</option>{issueStatuses.map((status) => <option key={status} value={status}>{statusLabels[status]}</option>)}</select><ChevronDown size={14} /></label></div><article className="panel report-table-panel"><div className="table-caption"><span>REPORT QUEUE</span><span>{filteredIssues.length} REPORTS</span></div>{filteredIssues.length ? <div className="table-scroll"><table><thead><tr><th>ISSUE</th><th>LOCATION</th><th>REPORTED BY</th><th>DATE</th><th>STATUS</th></tr></thead><tbody>{filteredIssues.map((issue) => <tr key={issue.id}><td><div className="issue-title-cell"><span className={`category-icon tiny ${colors[issue.category]}`}>{(() => { const Icon = icons[issue.category]; return <Icon size={14} />; })()}</span><span><strong>{issue.title}</strong><small>{issue.ticketCode} · {categoryLabels[issue.category]}</small></span></div>{issue.imageData && <a className="image-link" href={issue.imageData} target="_blank" rel="noreferrer"><FileImage size={12} /> Picture</a>}</td><td>{issue.building}<small className="table-subline">Room {issue.room}</small></td><td>{issue.reporterName}<small className="table-subline">{issue.reporterEmail}</small></td><td>{dateLabel(issue.createdAt)}</td><td><label className={`status-select ${issue.status.toLowerCase()}`}><i /><select aria-label={`Change status for ${issue.ticketCode}`} value={issue.status} onChange={(event) => void updateStatus(issue.id, event.target.value as IssueStatus)}>{issueStatuses.map((status) => <option key={status} value={status}>{statusLabels[status]}</option>)}</select><ChevronDown size={13} /></label></td></tr>)}</tbody></table></div> : <EmptyState title={issues.length ? "No matching reports" : "The queue is clear"} body={issues.length ? "Try a different search or status filter." : "New campus issues will show up here when they are reported."} />}</article></section>}

        {section === "track" && <section className="tracking-page"><span className="track-hero-icon"><Search size={20} /></span><div className="eyebrow"><i />YOUR REPORT, IN THE LOOP</div><h1>Where does it<br /><em>stand now?</em></h1><p>Drop in the reference number from your report confirmation.</p><form className="tracking-form" onSubmit={track}><label htmlFor="ticket-code">TICKET REFERENCE</label><div><input id="ticket-code" value={trackingCode} onChange={(event) => setTrackingCode(event.target.value)} placeholder="ISS-4F82AC" required /><button disabled={busy}>{busy ? "Checking..." : "Find my report"}<ArrowRight size={15} /></button></div></form>{trackError && <p className="form-error">{trackError}</p>}{ticket && <TicketResult ticket={ticket} />}</section>}
        <footer className="page-footer"><span><b>✳</b> Campus works better when we work together.</span><span>FACILITIES DESK <i /> NORTH CAMPUS</span></footer>
      </div>
    </main>

    {loginOpen && <Modal title="Admin sign in" subtitle="Manage incoming campus reports." onClose={() => { setLoginOpen(false); setLoginError(""); }}><form className="modal-form" onSubmit={login}><label htmlFor="admin-password">ADMIN PASSWORD</label><input id="admin-password" name="password" type="password" autoComplete="current-password" required autoFocus />{loginError && <p className="form-error">{loginError}</p>}<button className="submit-button" disabled={busy}>{busy ? "Signing in..." : "Open operations desk"}<ArrowRight size={15} /></button></form></Modal>}
    {reportOpen && <ReportModal onClose={() => setReportOpen(false)} onSubmitted={(code) => { setReportOpen(false); setTrackingCode(code); setSection("track"); void loadOverview(); }} />}
    {trackError && section !== "track" && <div className="toast" role="status"><CircleHelp size={16} />{trackError}<button aria-label="Dismiss" onClick={() => setTrackError("")}><X size={15} /></button></div>}
  </div>;
}

function Kicker({ children }: { children: ReactNode }) { return <div className="section-kicker">{children}</div>; }
function Metric({ label, value, helper, tone, icon }: { label: string; value: number; helper: string; tone: string; icon: ReactNode }) { return <article className={`metric-card ${tone}`}><div className="metric-top"><span>{label}</span><span className="metric-icon">{icon}</span></div><strong>{value.toString().padStart(2, "0")}</strong><small>{helper}</small><i className="metric-decoration" /></article>; }
function EmptyState({ title, body }: { title: string; body: string }) { return <div className="empty-state"><span><FileImage size={20} /></span><strong>{title}</strong><p>{body}</p></div>; }

function Modal({ title, subtitle, onClose, children }: { title: string; subtitle: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) { if (event.key === "Escape") onClose(); }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div className="modal-top"><span className="modal-mark"><Activity size={18} /></span><button className="icon-button" aria-label="Close dialog" onClick={onClose}><X size={18} /></button></div><h2 id="modal-title">{title}</h2><p className="modal-subtitle">{subtitle}</p>{children}</section></div>;
}

function ReportModal({ onClose, onSubmitted }: { onClose: () => void; onSubmitted: (code: string) => void }) {
  const [category, setCategory] = useState<IssueCategory>("COMPUTER");
  const [imageData, setImageData] = useState("");
  const [imageName, setImageName] = useState("");
  const [imageError, setImageError] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    const response = await fetch("/api/issues", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...values, category, imageData: imageData || null }) });
    if (!response.ok) { setError(await responseError(response)); setBusy(false); return; }
    const result = await response.json() as { ticketCode: string };
    onSubmitted(result.ticketCode);
  }

  async function addImage(file: File | undefined) {
    setImageError("");
    if (!file) return;
    try { setImageData(await compressImage(file)); setImageName(file.name); }
    catch (cause) { setImageError(cause instanceof Error ? cause.message : "Could not process this image."); setImageName(""); setImageData(""); }
  }

  return <Modal title="Report an issue" subtitle="Tell us what is getting in the way. We’ll get it moving." onClose={onClose}><form className="modal-form report-form" onSubmit={submit}>
    <label>WHAT NEEDS FIXING?</label><div className="category-choices">{issueCategories.map((value) => { const Icon = icons[value]; return <button className={`category-choice ${colors[value]} ${category === value ? "selected" : ""}`} type="button" key={value} onClick={() => setCategory(value)}><Icon size={17} /><span>{categoryLabels[value]}</span>{category === value && <Check className="choice-check" size={12} />}</button>; })}</div>
    <label htmlFor="issue-title">SHORT TITLE</label><input id="issue-title" name="title" placeholder="e.g. Projector won’t connect" maxLength={120} required />
    <label htmlFor="issue-description">WHAT&apos;S HAPPENING?</label><textarea id="issue-description" name="description" placeholder="A few details help us bring the right fix." maxLength={2000} rows={3} required />
    <div className="form-row"><div><label htmlFor="issue-building">BUILDING</label><input id="issue-building" name="building" placeholder="Science Hall" maxLength={120} required /></div><div><label htmlFor="issue-room">ROOM</label><input id="issue-room" name="room" placeholder="204" maxLength={60} required /></div></div>
    <div className="form-row"><div><label htmlFor="reporter-name">YOUR NAME</label><input id="reporter-name" name="reporterName" placeholder="Name" maxLength={120} required /></div><div><label htmlFor="reporter-email">EMAIL</label><input id="reporter-email" name="reporterEmail" type="email" placeholder="you@campus.edu" maxLength={254} required /></div></div>
    <label className="upload-label" htmlFor="issue-image"><span className="upload-icon"><FileImage size={17} /></span><span><strong>{imageName || "Add a picture"}</strong><small>{imageName ? "Ready to attach" : "Optional · JPEG, PNG, or WebP · up to 8 MB"}</small></span><span className="upload-action">{imageName ? "CHANGE" : "BROWSE"}</span></label><input className="visually-hidden" id="issue-image" type="file" accept="image/*" onChange={(event) => void addImage(event.target.files?.[0])} />
    {imageError && <p className="form-error">{imageError}</p>}{error && <p className="form-error">{error}</p>}<button className="submit-button" disabled={busy}>{busy ? "Sending report..." : "Send report"}<Send size={15} /></button><p className="privacy-note"><ShieldCheck size={13} /> Contact details are only visible to campus administrators.</p>
  </form></Modal>;
}

function TicketResult({ ticket }: { ticket: Ticket }) {
  return <article className="ticket-result"><div className="ticket-result-head"><span className={`status-badge ${ticket.status.toLowerCase()}`}><i />{statusLabels[ticket.status]}</span><span>{ticket.ticketCode}</span></div><h2>{ticket.title}</h2><p>{categoryLabels[ticket.category]} <i>·</i> {ticket.building}, room {ticket.room}</p><div className="ticket-timeline"><span className="timeline-check"><Check size={12} /></span><span><strong>Report received</strong><small>{dateLabel(ticket.createdAt)}</small></span><i /><span className={ticket.status !== "PENDING" ? "complete" : ""} /><span><strong>{ticket.status === "PENDING" ? "Waiting for pickup" : ticket.status === "IN_PROGRESS" ? "Work in progress" : "Resolved"}</strong><small>Updated {dateLabel(ticket.updatedAt)}</small></span></div></article>;
}