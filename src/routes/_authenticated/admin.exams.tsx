import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo, useEffect } from "react";
import { z } from "zod";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import {
  checkIsAdmin,
  listAllExams,
  getExamForEdit,
  saveExam,
  deleteExam,
  listExamQuestions,
  importExamQuestions,
  upsertQuestion,
  deleteQuestion,
  duplicateExam,
} from "@/lib/admin.functions";
import { parseQuestionBank, IMPORT_TEMPLATE_HEADER, type ParsedRow } from "@/lib/question-import";
import { parseYouTubeId } from "@/lib/youtube";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { Pencil, Plus, Trash2, ArrowLeft, Copy, AlertTriangle } from "lucide-react";

const searchSchema = z.object({
  edit: fallback(z.string().optional(), undefined),
  new: fallback(z.boolean().optional(), undefined),
});

export const Route = createFileRoute("/_authenticated/admin/exams")({
  validateSearch: zodValidator(searchSchema),
  component: AdminExamsPage,
});

function AdminExamsPage() {
  const search = Route.useSearch();
  const { data: adminCheck, isLoading: checkingAdmin } = useQuery({
    queryKey: ["is-admin"],
    queryFn: () => checkIsAdmin(),
  });

  if (checkingAdmin) {
    return <div className="mx-auto max-w-5xl px-4 py-12 text-sm text-muted-foreground">Loading…</div>;
  }
  if (!adminCheck?.isAdmin) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-12">
        <h1 className="text-2xl font-bold">Not authorized</h1>
        <p className="mt-2 text-muted-foreground">
          You need the admin role to manage exams.
        </p>
      </div>
    );
  }

  if (search.new) return <ExamEditor id={undefined} />;
  if (search.edit) return <ExamEditor id={search.edit} />;
  return <ExamsList />;
}

function ExamsList() {
  const qc = useQueryClient();
  const navigate = useNavigate({ from: "/admin/exams" });
  const { data, isLoading } = useQuery({
    queryKey: ["admin-exams"],
    queryFn: () => listAllExams(),
  });

  const del = useMutation({
    mutationFn: (id: string) => deleteExam({ data: { id } }),
    onSuccess: () => {
      toast.success("Exam deleted");
      qc.invalidateQueries({ queryKey: ["admin-exams"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Delete failed"),
  });

  const dup = useMutation({
    mutationFn: (id: string) => duplicateExam({ data: { id } }),
    onSuccess: (res: any) => {
      toast.success("Exam duplicated");
      qc.invalidateQueries({ queryKey: ["admin-exams"] });
      navigate({ search: { edit: res.id, new: undefined } });
    },
    onError: (e: any) => toast.error(e.message ?? "Duplicate failed"),
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Manage Exams</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Create and edit practice exams, YouTube links, and topic tags.
          </p>
        </div>
        <Link to="/admin/exams" search={{ new: true, edit: undefined }}>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Exam
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : !data || data.length === 0 ? (
        <p className="text-sm text-muted-foreground">No exams yet.</p>
      ) : (
        <div className="space-y-3">
          {data.map((exam) => (
            <Card key={exam.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">
                      {exam.exam_number ? `#${exam.exam_number} · ` : ""}
                      {exam.title}
                    </p>
                    <Badge variant={exam.status === "published" ? "default" : "secondary"}>
                      {exam.status}
                    </Badge>
                    {exam.is_sample && <Badge variant="outline">Sample</Badge>}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    /{exam.slug} · {exam.category} ·{" "}
                    {exam.question_count === 0 ? (
                      <span className="inline-flex items-center gap-1 text-amber-600 font-medium">
                        <AlertTriangle className="h-3 w-3" /> 0 questions — add some
                      </span>
                    ) : (
                      `${exam.question_count} questions`
                    )}
                    {exam.youtube_video_id ? " · 🎬 video" : ""}
                  </p>
                  {exam.tags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {exam.tags.map((t: string) => (
                        <Badge key={t} variant="outline" className="text-[10px] font-normal">
                          {t}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Link to="/admin/exams" search={{ edit: exam.id, new: undefined }}>
                    <Button size="sm" variant="outline">
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit
                    </Button>
                  </Link>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => dup.mutate(exam.id)}
                    disabled={dup.isPending}
                    title="Duplicate exam (metadata + questions)"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      if (confirm(`Delete "${exam.title}"? This deletes its questions and answers too.`)) {
                        del.mutate(exam.id);
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

type FormState = {
  title: string;
  slug: string;
  category: "real_estate" | "life_health_insurance";
  status: "draft" | "published" | "archived";
  description: string;
  is_sample: boolean;
  exam_number: string;
  youtube_url: string;
  youtube_video_id: string;
  tagsInput: string;
};

const emptyForm: FormState = {
  title: "",
  slug: "",
  category: "real_estate",
  status: "draft",
  description: "",
  is_sample: false,
  exam_number: "",
  youtube_url: "",
  youtube_video_id: "",
  tagsInput: "",
};

function ExamEditor({ id }: { id: string | undefined }) {
  const qc = useQueryClient();
  const navigate = useNavigate({ from: "/admin/exams" });

  const { data: existing, isLoading } = useQuery({
    queryKey: ["admin-exam", id],
    queryFn: () => getExamForEdit({ data: { id: id! } }),
    enabled: !!id,
  });

  const [form, setForm] = useState<FormState>(emptyForm);

  useEffect(() => {
    if (existing) {
      setForm({
        title: existing.title ?? "",
        slug: existing.slug ?? "",
        category: existing.category,
        status: existing.status,
        description: existing.description ?? "",
        is_sample: !!existing.is_sample,
        exam_number: existing.exam_number != null ? String(existing.exam_number) : "",
        youtube_url: existing.youtube_url ?? "",
        youtube_video_id: existing.youtube_video_id ?? "",
        tagsInput: (existing.tags ?? []).join(", "),
      });
    }
  }, [existing]);

  const derivedVideoId = useMemo(
    () => form.youtube_video_id || parseYouTubeId(form.youtube_url) || "",
    [form.youtube_url, form.youtube_video_id],
  );

  const save = useMutation({
    mutationFn: () => {
      const tags = form.tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      return saveExam({
        data: {
          id,
          title: form.title,
          slug: form.slug,
          category: form.category,
          status: form.status,
          description: form.description || null,
          is_sample: form.is_sample,
          exam_number: form.exam_number ? Number(form.exam_number) : null,
          youtube_url: form.youtube_url || null,
          youtube_video_id: derivedVideoId || null,
          tags,
        },
      });
    },
    onSuccess: () => {
      toast.success(id ? "Exam updated" : "Exam created");
      qc.invalidateQueries({ queryKey: ["admin-exams"] });
      qc.invalidateQueries({ queryKey: ["admin-exam", id] });
      navigate({ search: { edit: undefined, new: undefined } });
    },
    onError: (e: any) => toast.error(e.message ?? "Save failed"),
  });

  if (id && isLoading) {
    return <div className="mx-auto max-w-3xl px-4 py-12 text-sm text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <Link
        to="/admin/exams"
        search={{ edit: undefined, new: undefined }}
        className="mb-4 inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="mr-1 h-4 w-4" /> Back to list
      </Link>
      <Card>
        <CardHeader>
          <CardTitle>{id ? "Edit Exam" : "New Exam"}</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate();
            }}
          >
            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="slug">Slug</Label>
                <Input
                  id="slug"
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  placeholder="real-estate-37-financing"
                  required
                />
              </div>

              <div>
                <Label htmlFor="exam_number">Exam number</Label>
                <Input
                  id="exam_number"
                  type="number"
                  value={form.exam_number}
                  onChange={(e) => setForm({ ...form, exam_number: e.target.value })}
                />
              </div>

              <div>
                <Label>Category</Label>
                <Select
                  value={form.category}
                  onValueChange={(v) => setForm({ ...form, category: v as FormState["category"] })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="real_estate">Real Estate</SelectItem>
                    <SelectItem value="life_health_insurance">Life & Health Insurance</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) => setForm({ ...form, status: v as FormState["status"] })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="youtube_url">YouTube URL</Label>
                <Input
                  id="youtube_url"
                  value={form.youtube_url}
                  onChange={(e) => setForm({ ...form, youtube_url: e.target.value })}
                  placeholder="https://www.youtube.com/watch?v=..."
                />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="youtube_video_id">YouTube Video ID</Label>
                <Input
                  id="youtube_video_id"
                  value={form.youtube_video_id}
                  onChange={(e) => setForm({ ...form, youtube_video_id: e.target.value })}
                  placeholder="Auto-derived from URL if empty"
                />
                {derivedVideoId && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Using video ID: <code>{derivedVideoId}</code>
                  </p>
                )}
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="tags">Tags (comma-separated)</Label>
                <Input
                  id="tags"
                  value={form.tagsInput}
                  onChange={(e) => setForm({ ...form, tagsInput: e.target.value })}
                  placeholder="financing, contracts, ethics"
                />
              </div>

              <div className="flex items-center gap-2 md:col-span-2">
                <Checkbox
                  id="is_sample"
                  checked={form.is_sample}
                  onCheckedChange={(v) => setForm({ ...form, is_sample: !!v })}
                />
                <Label htmlFor="is_sample" className="cursor-pointer">
                  Free sample exam
                </Label>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Link to="/admin/exams" search={{ edit: undefined, new: undefined }}>
                <Button type="button" variant="outline">Cancel</Button>
              </Link>
              <Button type="submit" disabled={save.isPending}>
                {save.isPending ? "Saving…" : id ? "Save changes" : "Create exam"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
