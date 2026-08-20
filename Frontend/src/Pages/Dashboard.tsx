import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import { UserMenu } from '../components/UserMenu.js';
import { useProjectDownload } from '../hooks/useProjectDownload.js';
import type { ProjectSummary } from '../Types/types.js';
import {
  Sparkles,
  Plus,
  Search,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Play,
  Trash2,
  Layers,
  Loader2,
  Download,
  X
} from 'lucide-react';

export const Dashboard: React.FC = () => {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const {
    downloadingProjectId,
    error: downloadError,
    clearError: clearDownloadError,
    downloadProject
  } = useProjectDownload();

  const navigate = useNavigate();

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const res = await api.get<{ success: boolean; data: ProjectSummary[] }>('/api/projects');
      setProjects(res.data.data || []);
    } catch (err) {
      console.error('Failed to load projects:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this project? This cannot be undone.')) {
      return;
    }

    try {
      setDeletingId(id);
      await api.delete(`/api/projects/${id}`);
      setProjects((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      console.error('Failed to delete project:', err);
    } finally {
      setDeletingId(null);
    }
  };

  const filteredProjects = projects.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.prompt.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusBadge = (status: ProjectSummary['status'], completed: number, total: number) => {
    if (status === 'completed' || (total > 0 && completed === total)) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <CheckCircle2 className="w-3 h-3" /> Ready
        </span>
      );
    }
    if (status === 'interrupted') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
          <AlertTriangle className="w-3 h-3" /> Interrupted
        </span>
      );
    }
    if (status === 'generating') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
          <Loader2 className="w-3 h-3 animate-spin" /> In Progress
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700">
        Draft
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      {/* Top Navbar */}
      <header className="h-16 border-b border-slate-800 bg-slate-900/60 backdrop-blur-xl px-6 flex items-center justify-between sticky top-0 z-30">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-violet-600 flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:scale-105 transition">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-blue-400 via-cyan-300 to-violet-500 bg-clip-text text-transparent">
            Webthropic
          </span>
        </Link>

        <div className="flex items-center gap-4">
          <Link
            to="/"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white text-xs font-semibold shadow-lg shadow-blue-500/20 transition active:scale-95"
          >
            <Plus className="w-4 h-4" />
            New Website
          </Link>
          <UserMenu />
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-10">
        {/* Header Title & Search */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white">My Projects</h1>
            <p className="text-sm text-slate-400 mt-1">
              Resume your AI-generated websites or continue editing code
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative w-full md:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search projects..."
                className="w-full rounded-xl border border-slate-800 bg-slate-900/80 pl-9 pr-4 py-2 text-xs text-white placeholder:text-slate-500 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>
        </div>

        {/* Download Error Banner */}
        {downloadError && (
          <div className="mb-6 rounded-2xl bg-rose-950/70 border border-rose-800/60 p-4 flex items-center justify-between text-xs text-rose-300 shadow-lg">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{downloadError}</span>
            </div>
            <button
              onClick={clearDownloadError}
              className="text-rose-400 hover:text-rose-200 p-1 rounded-lg hover:bg-rose-900/40 transition"
              title="Dismiss error"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Project Cards Grid */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-4">
            <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
            <p className="text-sm text-slate-400">Loading your saved projects from MongoDB...</p>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-800 bg-slate-900/30 p-12 text-center max-w-xl mx-auto my-12">
            <div className="w-16 h-16 rounded-2xl bg-blue-600/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mx-auto mb-4">
              <Layers className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-white mb-1">
              {searchQuery ? 'No matching projects found' : 'No projects yet'}
            </h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mb-6">
              {searchQuery
                ? `No projects match "${searchQuery}". Try a different search term.`
                : 'Create your first website with Webthropic AI. Prompts, code, steps, and file trees are saved automatically.'}
            </p>
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 px-6 py-3 font-semibold text-xs text-white shadow-lg shadow-blue-500/20 hover:scale-105 transition"
            >
              <Plus className="w-4 h-4" />
              Build a Website
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map((project) => (
              <div
                key={project.id}
                onClick={() => navigate(`/builder/${project.id}`)}
                className="group relative rounded-2xl border border-slate-800/90 bg-slate-900/50 hover:bg-slate-900/90 hover:border-slate-700 transition-all duration-300 p-6 flex flex-col justify-between shadow-lg hover:shadow-2xl hover:shadow-blue-500/5 cursor-pointer"
              >
                <div>
                  {/* Card Header: Title & Status */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <h3 className="text-base font-bold text-white group-hover:text-blue-400 transition truncate">
                      {project.name}
                    </h3>
                    {getStatusBadge(project.status, project.completedSteps, project.totalSteps)}
                  </div>

                  {/* Prompt snippet */}
                  <p className="text-xs text-slate-400 line-clamp-3 mb-6 leading-relaxed bg-slate-950/40 p-3 rounded-xl border border-slate-800/40">
                    "{project.prompt}"
                  </p>
                </div>

                <div>
                  {/* Stats & Progress */}
                  <div className="flex items-center justify-between text-xs text-slate-400 pt-4 border-t border-slate-800/80 mb-4">
                    <div className="flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-blue-400" />
                      <span>
                        {project.completedSteps}/{project.totalSteps} steps
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      <span>{new Date(project.updatedAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/builder/${project.id}`);
                      }}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-blue-600 text-white text-xs font-semibold transition group-hover:bg-blue-600 shadow-sm"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      Resume
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        downloadProject(project.id, project.name);
                      }}
                      disabled={downloadingProjectId === project.id}
                      className="p-2.5 rounded-xl border border-slate-800 hover:border-blue-900/50 hover:bg-blue-950/30 text-slate-400 hover:text-blue-400 transition"
                      title="Download project as ZIP"
                    >
                      {downloadingProjectId === project.id ? (
                        <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                      ) : (
                        <Download className="w-4 h-4" />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={(e) => handleDelete(project.id, e)}
                      disabled={deletingId === project.id}
                      className="p-2.5 rounded-xl border border-slate-800 hover:border-rose-900/50 hover:bg-rose-950/30 text-slate-400 hover:text-rose-400 transition"
                      title="Delete project"
                    >
                      {deletingId === project.id ? (
                        <Loader2 className="w-4 h-4 animate-spin text-rose-400" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};
