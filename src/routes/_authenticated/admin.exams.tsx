import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo, useEffect } from "react";
import { z } from "zod";
import { zodValidator } from "@tanstack/zod-adapter";
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
import { getTopicsForCategory } from "@/lib/topics";
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
  edit: z.string().optional(),
  new: z.boolean().optional(),
}).partial();

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
        <div className="flex gap-2">
          <Link to="/admin/users">
            <Button variant="outline">Users</Button>
          </Link>
          <Link to="/admin/exams" search={{ new: true, edit: undefined }}>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Exam
            </Button>
          </Link>
        </div>
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
                    {exam.is_diagnostic && (
                      <Badge className="bg-primary/15 text-primary" variant="outline">
                        Diagnostic
                      </Badge>
                    )}
                    {exam.is_timed_final && (
                      <Badge className="bg-primary text-primary-foreground">Timed Final</Badge>
                    )}
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
  is_diagnostic: boolean;
  is_timed_final: boolean;
  time_limit_minutes: string;
  exam_number: string;
  youtube_url: string;
  youtube_video_id: string;
  topicSlugs: string[];
  tagsInput: string;
};

const TIMED_FINAL_DEFAULTS: Record<string, number> = {
  real_estate: 150,
  life_health_insurance: 180,
};

const emptyForm: FormState = {
  title: "",
  slug: "",
  category: "real_estate",
  status: "draft",
  description: "",
  is_sample: false,
  is_diagnostic: false,
  is_timed_final: false,
  time_limit_minutes: "",
  exam_number: "",
  youtube_url: "",
  youtube_video_id: "",
  topicSlugs: [],
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
      const existingTags: string[] = existing.tags ?? [];
      const topicSlugSet = new Set(getTopicsForCategory(existing.category).map((t) => t.slug));
      const topicSlugs = existingTags.filter((t) => topicSlugSet.has(t));
      const extras = existingTags.filter((t) => !topicSlugSet.has(t));
      setForm({
        title: existing.title ?? "",
        slug: existing.slug ?? "",
        category: existing.category,
        status: existing.status,
        description: existing.description ?? "",
        is_sample: !!existing.is_sample,
        is_timed_final: !!existing.is_timed_final,
        time_limit_minutes:
          existing.time_limit_minutes != null ? String(existing.time_limit_minutes) : "",
        exam_number: existing.exam_number != null ? String(existing.exam_number) : "",
        youtube_url: existing.youtube_url ?? "",
        youtube_video_id: existing.youtube_video_id ?? "",
        topicSlugs,
        tagsInput: extras.join(", "),
      });
    }
  }, [existing]);

  const derivedVideoId = useMemo(
    () => form.youtube_video_id || parseYouTubeId(form.youtube_url) || "",
    [form.youtube_url, form.youtube_video_id],
  );

  const save = useMutation({
    mutationFn: () => {
      const extras = form.tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      const tags = Array.from(new Set([...form.topicSlugs, ...extras]));

      return saveExam({
        data: {
          id,
          title: form.title,
          slug: form.slug,
          category: form.category,
          status: form.status || "draft",
          description: form.description || null,
          is_sample: form.is_sample,
          is_timed_final: form.is_timed_final,
          time_limit_minutes: form.is_timed_final
            ? (form.time_limit_minutes
                ? Number(form.time_limit_minutes)
                : (TIMED_FINAL_DEFAULTS[form.category] ?? 150))
            : null,
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
                <Label>Sub-category (topics)</Label>
                <p className="mb-2 mt-1 text-xs text-muted-foreground">
                  Pick one or more topics so this exam shows up under those tiles on the {form.category === "real_estate" ? "Real Estate" : "Life & Health Insurance"} exams page.
                </p>
                <div className="grid max-h-64 gap-2 overflow-y-auto rounded-md border p-3 sm:grid-cols-2">
                  {getTopicsForCategory(form.category).map((t) => {
                    const checked = form.topicSlugs.includes(t.slug);
                    return (
                      <label
                        key={t.slug}
                        className="flex cursor-pointer items-start gap-2 text-sm"
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(v) =>
                            setForm({
                              ...form,
                              topicSlugs: v
                                ? [...form.topicSlugs, t.slug]
                                : form.topicSlugs.filter((s) => s !== t.slug),
                            })
                          }
                        />
                        <span className="leading-tight">{t.label}</span>
                      </label>
                    );
                  })}
                </div>
                {form.topicSlugs.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {form.topicSlugs.map((s) => (
                      <Badge key={s} variant="secondary" className="text-[10px]">
                        {s}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="tags">Extra tags (optional, comma-separated)</Label>
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

              <div className="md:col-span-2 rounded-md border border-dashed p-4">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="is_timed_final"
                    checked={form.is_timed_final}
                    onCheckedChange={(v) => setForm({ ...form, is_timed_final: !!v })}
                  />
                  <Label htmlFor="is_timed_final" className="cursor-pointer">
                    Timed Final Exam
                  </Label>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Mark this as the timed final for its track. Users must pass a timed
                  final (≥70%) before their Readiness score can reach "Ready".
                </p>
                {form.is_timed_final && (
                  <div className="mt-3 max-w-xs">
                    <Label htmlFor="time_limit_minutes">Time limit (minutes)</Label>
                    <Input
                      id="time_limit_minutes"
                      type="number"
                      min={1}
                      max={600}
                      value={form.time_limit_minutes}
                      onChange={(e) =>
                        setForm({ ...form, time_limit_minutes: e.target.value })
                      }
                      placeholder={String(TIMED_FINAL_DEFAULTS[form.category] ?? 150)}
                    />
                    <p className="mt-1 text-xs text-muted-foreground">
                      Defaults: Real Estate 150 min · Life & Health 180 min.
                    </p>
                  </div>
                )}
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

      {id && <QuestionsSection examId={id} />}
    </div>
  );
}

// ---------- Questions section (importer + editor) ----------

function QuestionsSection({ examId }: { examId: string }) {
  return (
    <div className="mt-8 space-y-6">
      <QuestionImporter examId={examId} />
      <QuestionList examId={examId} />
    </div>
  );
}

function QuestionImporter({ examId }: { examId: string }) {
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [mode, setMode] = useState<"append" | "replace">("append");

  const parsed = useMemo(() => (text.trim() ? parseQuestionBank(text) : null), [text]);

  const importMut = useMutation({
    mutationFn: (rows: ParsedRow[]) =>
      importExamQuestions({
        data: {
          examId,
          mode,
          rows: rows.map((r) => ({
            prompt: r.prompt,
            explanation: r.explanation,
            choices: r.choices,
          })),
        },
      }),
    onSuccess: (res: any) => {
      toast.success(`Imported ${res.inserted} questions`);
      setText("");
      qc.invalidateQueries({ queryKey: ["admin-questions", examId] });
      qc.invalidateQueries({ queryKey: ["admin-exams"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Import failed"),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Import Questions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-sm text-muted-foreground">
          Paste rows from Google Sheets, Excel, or Claude. Header row required.
          Columns: <code>question, choice_a, choice_b, choice_c, choice_d, correct, explanation</code>{" "}
          (correct = A/B/C/D). Supports up to 6 choices; blank choice cells are skipped.
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              navigator.clipboard.writeText(IMPORT_TEMPLATE_HEADER);
              toast.success("Header copied — paste into Sheets/Excel");
            }}
          >
            Copy header template
          </Button>
        </div>
        <Textarea
          rows={8}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={`question\tchoice_a\tchoice_b\tchoice_c\tchoice_d\tcorrect\texplanation\nWhat is a fee simple estate?\tHighest form of ownership\tLease for years\tLife estate\tEasement\tA\tFee simple = complete ownership.`}
          className="font-mono text-xs"
        />
        {parsed && (
          <div className="rounded-md border p-3 text-sm">
            <div className="mb-2 flex items-center gap-3">
              <Badge variant={parsed.errors.length ? "destructive" : "default"}>
                {parsed.rows.length} valid
              </Badge>
              {parsed.errors.length > 0 && (
                <Badge variant="destructive">{parsed.errors.length} errors</Badge>
              )}
            </div>
            {parsed.errors.length > 0 && (
              <ul className="mb-3 space-y-1 text-xs text-destructive">
                {parsed.errors.slice(0, 8).map((e, i) => (
                  <li key={i}>Row {e.row}: {e.message}</li>
                ))}
                {parsed.errors.length > 8 && <li>…and {parsed.errors.length - 8} more</li>}
              </ul>
            )}
            {parsed.rows.length > 0 && (
              <div className="max-h-48 overflow-auto text-xs">
                {parsed.rows.slice(0, 5).map((r) => (
                  <div key={r.rowNumber} className="mb-2 border-b pb-2 last:border-0">
                    <div className="font-medium">{r.prompt}</div>
                    <div className="mt-1 text-muted-foreground">
                      {r.choices.map((c, i) => (
                        <span key={i} className={c.is_correct ? "text-primary font-medium" : ""}>
                          {String.fromCharCode(65 + i)}. {c.text}
                          {i < r.choices.length - 1 ? " · " : ""}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
                {parsed.rows.length > 5 && (
                  <div className="text-muted-foreground">+ {parsed.rows.length - 5} more</div>
                )}
              </div>
            )}
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <RadioGroup
            value={mode}
            onValueChange={(v) => setMode(v as "append" | "replace")}
            className="flex gap-4"
          >
            <div className="flex items-center gap-2">
              <RadioGroupItem value="append" id="mode-append" />
              <Label htmlFor="mode-append" className="cursor-pointer">Append</Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="replace" id="mode-replace" />
              <Label htmlFor="mode-replace" className="cursor-pointer">Replace all</Label>
            </div>
          </RadioGroup>
          <Button
            type="button"
            disabled={!parsed || parsed.rows.length === 0 || importMut.isPending}
            onClick={() => {
              if (!parsed) return;
              if (mode === "replace" && !confirm("Replace ALL existing questions for this exam?")) return;
              importMut.mutate(parsed.rows);
            }}
          >
            {importMut.isPending ? "Importing…" : `Import ${parsed?.rows.length ?? 0} questions`}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

type EditableQuestion = {
  id?: string;
  prompt: string;
  explanation: string;
  choices: { text: string; is_correct: boolean }[];
};

function QuestionList({ examId }: { examId: string }) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin-questions", examId],
    queryFn: () => listExamQuestions({ data: { examId } }),
  });

  const [editing, setEditing] = useState<EditableQuestion | null>(null);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin-questions", examId] });
    qc.invalidateQueries({ queryKey: ["admin-exams"] });
  };

  const save = useMutation({
    mutationFn: (q: EditableQuestion) =>
      upsertQuestion({
        data: {
          id: q.id,
          examId,
          prompt: q.prompt,
          explanation: q.explanation || null,
          choices: q.choices.filter((c) => c.text.trim()),
        },
      }),
    onSuccess: () => {
      toast.success("Saved");
      setEditing(null);
      invalidate();
    },
    onError: (e: any) => toast.error(e.message ?? "Save failed"),
  });

  const del = useMutation({
    mutationFn: (id: string) => deleteQuestion({ data: { id } }),
    onSuccess: () => {
      toast.success("Deleted");
      invalidate();
    },
    onError: (e: any) => toast.error(e.message ?? "Delete failed"),
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-lg">
          Questions {data ? `(${data.length})` : ""}
        </CardTitle>
        <Button
          size="sm"
          type="button"
          onClick={() =>
            setEditing({
              prompt: "",
              explanation: "",
              choices: [
                { text: "", is_correct: true },
                { text: "", is_correct: false },
                { text: "", is_correct: false },
                { text: "", is_correct: false },
              ],
            })
          }
        >
          <Plus className="mr-2 h-4 w-4" /> Add question
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {editing && (
          <QuestionEditor
            initial={editing}
            onCancel={() => setEditing(null)}
            onSave={(q) => save.mutate(q)}
            saving={save.isPending}
          />
        )}
        {data && data.length === 0 && !editing && (
          <p className="text-sm text-muted-foreground">
            No questions yet. Use the importer above or click "Add question".
          </p>
        )}
        {data?.map((q, i) => (
          <div key={q.id} className="rounded-md border p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">
                  {i + 1}. {q.text}
                </p>
                <ul className="mt-2 space-y-0.5 text-xs">
                  {q.answers.map((a, j) => (
                    <li key={a.id} className={a.is_correct ? "text-primary font-medium" : "text-muted-foreground"}>
                      {String.fromCharCode(65 + j)}. {a.text} {a.is_correct && "✓"}
                    </li>
                  ))}
                </ul>
                {q.explanation && (
                  <p className="mt-2 text-xs italic text-muted-foreground">{q.explanation}</p>
                )}
              </div>
              <div className="flex flex-col gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setEditing({
                      id: q.id,
                      prompt: q.text,
                      explanation: q.explanation ?? "",
                      choices: q.answers.map((a) => ({ text: a.text, is_correct: a.is_correct })),
                    })
                  }
                >
                  <Pencil className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => {
                    if (confirm("Delete this question?")) del.mutate(q.id);
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function QuestionEditor({
  initial,
  onCancel,
  onSave,
  saving,
}: {
  initial: EditableQuestion;
  onCancel: () => void;
  onSave: (q: EditableQuestion) => void;
  saving: boolean;
}) {
  const [q, setQ] = useState<EditableQuestion>(initial);

  const setChoice = (i: number, patch: Partial<{ text: string; is_correct: boolean }>) => {
    setQ({
      ...q,
      choices: q.choices.map((c, idx) => (idx === i ? { ...c, ...patch } : c)),
    });
  };

  return (
    <div className="rounded-md border-2 border-primary/50 bg-muted/30 p-3 space-y-3">
      <div>
        <Label>Question</Label>
        <Textarea
          rows={2}
          value={q.prompt}
          onChange={(e) => setQ({ ...q, prompt: e.target.value })}
        />
      </div>
      <div className="space-y-2">
        <Label>Choices (check the correct one)</Label>
        {q.choices.map((c, i) => (
          <div key={i} className="flex items-center gap-2">
            <Checkbox
              checked={c.is_correct}
              onCheckedChange={(v) => setChoice(i, { is_correct: !!v })}
            />
            <span className="text-xs font-mono w-4">{String.fromCharCode(65 + i)}</span>
            <Input
              value={c.text}
              onChange={(e) => setChoice(i, { text: e.target.value })}
              placeholder={`Choice ${String.fromCharCode(65 + i)}`}
            />
            {q.choices.length > 2 && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() =>
                  setQ({ ...q, choices: q.choices.filter((_, idx) => idx !== i) })
                }
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        ))}
        {q.choices.length < 6 && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() =>
              setQ({ ...q, choices: [...q.choices, { text: "", is_correct: false }] })
            }
          >
            <Plus className="mr-1 h-3 w-3" /> Add choice
          </Button>
        )}
      </div>
      <div>
        <Label>Explanation (optional)</Label>
        <Textarea
          rows={2}
          value={q.explanation}
          onChange={(e) => setQ({ ...q, explanation: e.target.value })}
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="button" onClick={() => onSave(q)} disabled={saving}>
          {saving ? "Saving…" : "Save question"}
        </Button>
      </div>
    </div>
  );
}
