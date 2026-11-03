import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { MoreHorizontal, Pencil, Tag, Copy, Trash2, ExternalLink, Loader2 } from "lucide-react";
import {
  useUpdateProject,
  useDeleteProject,
  useCreateAnalysis,
  getListProjectsQueryKey,
  getGetProjectQueryKey,
  getGetDashboardStatsQueryKey,
  getListAnalysesQueryKey,
} from "@workspace/api-client-react";
import { useToast } from "@/components/ui/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Link, useLocation } from "wouter";
import { useI18n } from "../lib/i18n";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export type MenuProject = {
  id: number;
  title: string;
  ideaSummary?: string | null;
  industry?: string | null;
  targetMarket?: string | null;
};

interface Props {
  project: MenuProject;
  /** Called after a successful delete (e.g. navigate away) */
  onDeleted?: () => void;
  /** Called after rename, edit, or duplicate so parent can refresh */
  onUpdated?: () => void;
  triggerClassName?: string;
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function inputClass() {
  return "w-full px-4 py-2.5 rounded-xl text-sm font-light text-white placeholder-white/25 outline-none transition-colors"
    + " bg-white/[0.04] border border-white/[0.08] focus:border-white/20 focus:bg-white/[0.06]";
}

function labelClass() {
  return "block text-xs text-white/40 uppercase tracking-widest mb-2";
}

// ─────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────

export default function ProjectActionsMenu({ project, onDeleted, onUpdated, triggerClassName }: Props) {
  const [modal, setModal] = useState<"rename" | "edit" | "delete" | null>(null);
  const close = () => setModal(null);
  const { toast } = useToast();
  const { t } = useI18n();
  const qc = useQueryClient();

  const { mutateAsync: updateProject } = useUpdateProject();
  const { mutateAsync: deleteProject } = useDeleteProject();
  const { mutateAsync: createAnalysis } = useCreateAnalysis();

  const invalidateAll = (projectId: number) => {
    qc.invalidateQueries({ queryKey: getListProjectsQueryKey() });
    qc.invalidateQueries({ queryKey: getGetProjectQueryKey(projectId) });
    qc.invalidateQueries({ queryKey: getGetDashboardStatsQueryKey() });
    qc.invalidateQueries({ queryKey: getListAnalysesQueryKey(projectId) });
  };

  const handleDuplicate = async () => {
    try {
      const res = await fetch(`/api/projects/${project.id}/duplicate`, {
        method: "POST",
        credentials: "same-origin",
      });
      if (!res.ok) throw new Error("Duplicate failed");
      const copy = await res.json() as { title: string };
      invalidateAll(project.id);
      toast({ title: t('actions.toast_duplicated'), description: `"${copy.title}" ${t('actions.toast_dup_ready')}` });
      onUpdated?.();
    } catch {
      toast({ title: t('actions.toast_error'), description: t('actions.error_duplicate'), variant: "destructive" });
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className={
              triggerClassName ??
              "w-8 h-8 rounded-lg flex items-center justify-center text-white/30 hover:text-white/70 hover:bg-white/[0.07] transition-colors outline-none"
            }
            onClick={e => e.stopPropagation()}
            aria-label="Project actions"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="end"
          className="w-44 z-50"
          style={{
            background: "var(--_dropdown)",
            border: "1px solid var(--_dropdown-b)",
            borderRadius: "12px",
            boxShadow: "0 16px 40px rgba(0,0,0,0.5)",
          }}
          onClick={e => e.stopPropagation()}
        >
          <DropdownMenuItem asChild className="cursor-pointer text-sm font-light text-white/70 hover:text-white focus:text-white gap-2.5 rounded-lg">
            <Link href={`/projects/${project.id}`} className="flex items-center gap-2.5">
              <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" /> {t('actions.open')}
            </Link>
          </DropdownMenuItem>

          <DropdownMenuSeparator className="bg-white/[0.06] my-1" />

          <DropdownMenuItem
            className="cursor-pointer text-sm font-light text-white/70 hover:text-white focus:text-white gap-2.5 rounded-lg"
            onClick={() => setModal("rename")}
          >
            <Tag className="w-3.5 h-3.5 flex-shrink-0" /> {t('actions.rename')}
          </DropdownMenuItem>

          <DropdownMenuItem
            className="cursor-pointer text-sm font-light text-white/70 hover:text-white focus:text-white gap-2.5 rounded-lg"
            onClick={() => setModal("edit")}
          >
            <Pencil className="w-3.5 h-3.5 flex-shrink-0" /> {t('actions.edit')}
          </DropdownMenuItem>

          <DropdownMenuItem
            className="cursor-pointer text-sm font-light text-white/70 hover:text-white focus:text-white gap-2.5 rounded-lg"
            onClick={handleDuplicate}
          >
            <Copy className="w-3.5 h-3.5 flex-shrink-0" /> {t('actions.duplicate')}
          </DropdownMenuItem>

          <DropdownMenuSeparator className="bg-white/[0.06] my-1" />

          <DropdownMenuItem
            className="cursor-pointer text-sm font-light text-red-400 hover:text-red-300 focus:text-red-300 gap-2.5 rounded-lg"
            onClick={() => setModal("delete")}
          >
            <Trash2 className="w-3.5 h-3.5 flex-shrink-0" /> {t('actions.delete')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* ── Rename Modal ─────────────────────────── */}
      {modal === "rename" && (
        <RenameModal
          project={project}
          onClose={close}
          onSaved={() => { invalidateAll(project.id); onUpdated?.(); }}
          updateProject={updateProject}
        />
      )}

      {/* ── Edit Modal ───────────────────────────── */}
      {modal === "edit" && (
        <EditModal
          project={project}
          onClose={close}
          onSaved={() => { invalidateAll(project.id); onUpdated?.(); }}
          updateProject={updateProject}
          createAnalysis={createAnalysis}
        />
      )}

      {/* ── Delete Modal ─────────────────────────── */}
      {modal === "delete" && (
        <DeleteModal
          project={project}
          onClose={close}
          onDeleted={() => { invalidateAll(project.id); onDeleted?.(); }}
          deleteProject={deleteProject}
        />
      )}
    </>
  );
}

// ─────────────────────────────────────────────
// Rename Modal
// ─────────────────────────────────────────────

function RenameModal({
  project,
  onClose,
  onSaved,
  updateProject,
}: {
  project: MenuProject;
  onClose: () => void;
  onSaved: () => void;
  updateProject: ReturnType<typeof useUpdateProject>["mutateAsync"];
}) {
  const [title, setTitle] = useState(project.title);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const { toast } = useToast();
  const { t } = useI18n();

  const handleSave = async () => {
    const trimmed = title.trim();
    if (!trimmed) { setError(t('actions.name_empty')); return; }
    setSaving(true);
    try {
      await updateProject({ projectId: project.id, data: { title: trimmed } });
      toast({ title: t('actions.toast_renamed'), description: t('actions.toast_renamed_desc', { name: trimmed }) });
      onSaved();
      onClose();
    } catch {
      setError(t('actions.error_rename'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={v => !v && onClose()}>
      <DialogContent
        className="w-[calc(100vw-32px)] max-w-sm"
        style={{ background: "var(--_dropdown)", border: "1px solid var(--_dropdown-b)", borderRadius: "20px" }}
      >
        <DialogHeader>
          <DialogTitle className="text-white font-medium text-base">{t('actions.rename_title')}</DialogTitle>
          <DialogDescription className="text-white/40 text-sm font-light">
            {t('actions.rename_desc')}
          </DialogDescription>
        </DialogHeader>

        <div className="py-2">
          <label className={labelClass()}>{t('actions.name_label')}</label>
          <input
            className={inputClass()}
            value={title}
            onChange={e => { setTitle(e.target.value); setError(""); }}
            onKeyDown={e => e.key === "Enter" && handleSave()}
            placeholder={t('actions.name_ph')}
            autoFocus
          />
          {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
        </div>

        <DialogFooter className="gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-light text-white/40 hover:text-white/70 transition-colors"
          >
            {t('actions.cancel')}
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-medium transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
            style={{ background: "rgba(201,168,76,0.15)", border: "1px solid rgba(201,168,76,0.3)", color: "#C9A84C" }}
          >
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {t('actions.save')}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────
// Edit Modal
// ─────────────────────────────────────────────

function EditModal({
  project,
  onClose,
  onSaved,
  updateProject,
  createAnalysis,
}: {
  project: MenuProject;
  onClose: () => void;
  onSaved: () => void;
  updateProject: ReturnType<typeof useUpdateProject>["mutateAsync"];
  createAnalysis: ReturnType<typeof useCreateAnalysis>["mutateAsync"];
}) {
  const [title, setTitle] = useState(project.title);
  const [idea, setIdea] = useState(project.ideaSummary ?? "");
  const [industry, setIndustry] = useState(project.industry ?? "");
  const [market, setMarket] = useState(project.targetMarket ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [confirmRegen, setConfirmRegen] = useState(false);
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const substantiveChanged =
    idea.trim() !== (project.ideaSummary ?? "") ||
    industry.trim() !== (project.industry ?? "") ||
    market.trim() !== (project.targetMarket ?? "");

  const { t, language } = useI18n();

  const doSave = async (regenerate: boolean) => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) { setError(t('actions.name_empty')); return; }
    setSaving(true);
    try {
      await updateProject({
        projectId: project.id,
        data: {
          title: trimmedTitle,
          ideaSummary: idea.trim() || undefined,
          industry: industry.trim() || undefined,
          targetMarket: market.trim() || undefined,
        },
      });

      if (regenerate) {
        const newAnalysis = await createAnalysis({ projectId: project.id, data: { language } });
        toast({ title: t('actions.toast_saved'), description: t('actions.toast_new_analysis') });
        onSaved();
        onClose();
        navigate(`/projects/${project.id}/analysis/${newAnalysis.id}`);
      } else {
        toast({ title: t('actions.toast_saved'), description: t('actions.toast_updated') });
        onSaved();
        onClose();
      }
    } catch {
      setError(t('actions.error_save'));
      setSaving(false);
    }
  };

  const handleSave = () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) { setError(t('actions.name_empty')); return; }
    if (substantiveChanged) {
      setConfirmRegen(true);
    } else {
      doSave(false);
    }
  };

  // ── Regeneration confirmation dialog ────────
  if (confirmRegen) {
    return (
      <Dialog open onOpenChange={v => !v && setConfirmRegen(false)}>
        <DialogContent
          className="w-[calc(100vw-32px)] max-w-sm"
          style={{ background: "var(--_dropdown)", border: "1px solid var(--_dropdown-b)", borderRadius: "20px" }}
        >
          <DialogHeader>
            <DialogTitle className="text-white font-medium text-base">{t('actions.regen_title')}</DialogTitle>
            <DialogDescription className="text-sm font-light leading-relaxed" style={{ color: "rgba(255,255,255,0.5)" }}>
              {t('actions.regen_desc')}
            </DialogDescription>
          </DialogHeader>
          {error && <p className="text-red-400 text-xs">{error}</p>}
          <DialogFooter className="flex-col gap-2">
            <button
              onClick={() => doSave(true)}
              disabled={saving}
              className="flex items-center justify-center gap-2 w-full px-5 py-2.5 rounded-xl text-sm font-medium transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50"
              style={{ background: "rgba(201,168,76,0.15)", border: "1px solid rgba(201,168,76,0.3)", color: "#C9A84C" }}
            >
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {t('actions.save_regen')}
            </button>
            <button
              onClick={() => doSave(false)}
              disabled={saving}
              className="w-full px-5 py-2.5 rounded-xl text-sm font-light text-white/60 hover:text-white transition-colors disabled:opacity-50"
              style={{ border: "1px solid rgba(255,255,255,0.08)" }}
            >
              {t('actions.save_no_regen')}
            </button>
            <button
              onClick={() => setConfirmRegen(false)}
              className="w-full text-sm font-light text-white/30 hover:text-white/60 transition-colors py-1"
            >
              {t('actions.cancel')}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // ── Edit form ───────────────────────────────
  return (
    <Dialog open onOpenChange={v => !v && onClose()}>
      <DialogContent
        className="w-[calc(100vw-32px)] max-w-md"
        style={{ background: "var(--_dropdown)", border: "1px solid var(--_dropdown-b)", borderRadius: "20px" }}
      >
        <DialogHeader>
          <DialogTitle className="text-white font-medium text-base">{t('actions.edit_title')}</DialogTitle>
          <DialogDescription className="text-white/40 text-sm font-light">
            {t('actions.edit_desc')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div>
            <label className={labelClass()}>{t('actions.name_label')}</label>
            <input
              className={inputClass()}
              value={title}
              onChange={e => { setTitle(e.target.value); setError(""); }}
              placeholder={t('actions.name_ph')}
            />
          </div>
          <div>
            <label className={labelClass()}>{t('actions.desc_label')}</label>
            <textarea
              className={inputClass() + " min-h-[80px] resize-none"}
              value={idea}
              onChange={e => setIdea(e.target.value)}
              placeholder={t('actions.desc_ph')}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelClass()}>{t('project.industry')}</label>
              <input
                className={inputClass()}
                value={industry}
                onChange={e => setIndustry(e.target.value)}
                placeholder={t('actions.industry_ph')}
              />
            </div>
            <div>
              <label className={labelClass()}>{t('project.market')}</label>
              <input
                className={inputClass()}
                value={market}
                onChange={e => setMarket(e.target.value)}
                placeholder={t('actions.market_ph')}
              />
            </div>
          </div>
          {error && <p className="text-red-400 text-xs">{error}</p>}
        </div>

        <DialogFooter className="gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-light text-white/40 hover:text-white/70 transition-colors"
          >
            {t('actions.cancel')}
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-medium transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
            style={{ background: "rgba(201,168,76,0.15)", border: "1px solid rgba(201,168,76,0.3)", color: "#C9A84C" }}
          >
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {t('actions.save_changes')}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────
// Delete Modal
// ─────────────────────────────────────────────

function DeleteModal({
  project,
  onClose,
  onDeleted,
  deleteProject,
}: {
  project: MenuProject;
  onClose: () => void;
  onDeleted: () => void;
  deleteProject: ReturnType<typeof useDeleteProject>["mutateAsync"];
}) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const { toast } = useToast();
  const { t } = useI18n();

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteProject({ projectId: project.id });
      toast({ title: t('actions.toast_deleted'), description: t('actions.toast_deleted_desc', { name: project.title }) });
      onDeleted();
      onClose();
    } catch {
      setError(t('actions.error_delete'));
      setDeleting(false);
    }
  };

  return (
    <Dialog open onOpenChange={v => !v && onClose()}>
      <DialogContent
        className="w-[calc(100vw-32px)] max-w-sm"
        style={{ background: "var(--_dropdown)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "20px" }}
      >
        <DialogHeader>
          <DialogTitle className="text-white font-medium text-base">{t('actions.delete_title')}</DialogTitle>
          <DialogDescription className="text-sm font-light leading-relaxed" style={{ color: "rgba(255,255,255,0.45)" }}>
            {t('actions.delete_desc', { name: project.title })}
          </DialogDescription>
        </DialogHeader>
        {error && <p className="text-red-400 text-xs">{error}</p>}
        <DialogFooter className="gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-light text-white/40 hover:text-white/70 transition-colors"
          >
            {t('actions.cancel')}
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-medium transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
            style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171" }}
          >
            {deleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {t('actions.delete_confirm')}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
