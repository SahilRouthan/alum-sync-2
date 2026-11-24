import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, Loader2, UploadCloud } from "lucide-react";
import { api } from "../../services/apiClient";
import { useToast } from "../../context/ToastContext";
import {
  DataTable,
  ErrorBanner,
  LoadingSpinner,
  PageHeader,
  StatusBadge,
} from "../../components/app/UI";

const SAMPLE_CSV = `full_name,email,graduation_year,degree,department,company,job_title,industry,location,skills,years_of_experience,is_verified
Priya Nair,priya.nair@alumni.edu,2019,B.Tech,Computer Science,Google,Senior Software Engineer,Software & Technology,Bengaluru,"React; TypeScript; System Design; Node.js",5,true
Rohan Deshmukh,rohan.d@alumni.edu,2020,B.Tech,Information Technology,Microsoft,Product Manager,Product & Strategy,Hyderabad,"Product Management; SQL; Agile; Data Analysis",4,true`;

export default function AdminCsvImportPage() {
  const { showToast } = useToast();

  const [file, setFile] = useState(null);
  const [previewing, setPreviewing] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [preview, setPreview] = useState(null);
  const [commitResult, setCommitResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [error, setError] = useState("");

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await api.get("/admin/import/history");
      setHistory(res.history || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const downloadSampleCsv = () => {
    const blob = new Blob([SAMPLE_CSV], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "alumsync-alumni-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePreview = async (e) => {
    e.preventDefault();
    if (!file) return;
    setPreviewing(true);
    setCommitResult(null);
    setError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await api.upload("/admin/import/preview", fd);
      setPreview(res);
      showToast("CSV parsed & validated. Review records below.", "info");
    } catch (err) {
      setError(err.message);
    } finally {
      setPreviewing(false);
    }
  };

  const handleCommit = async () => {
    if (!preview) return;
    setCommitting(true);
    try {
      const res = await api.post("/admin/import/commit", {
        fileName: preview.fileName,
        totalRows: preview.totalRows,
        validRows: preview.validRows,
        duplicateRows: preview.duplicateRows,
        errorRows: preview.errorRows,
      });
      setCommitResult(res);
      setPreview(null);
      setFile(null);
      showToast(`Imported ${res.importedCount} alumni records!`, "success");
      loadHistory();
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setCommitting(false);
    }
  };

  const historyColumns = [
    { key: "file_name", label: "File Name" },
    { key: "total_rows", label: "Total" },
    { key: "imported_rows", label: "Imported" },
    { key: "duplicate_rows", label: "Duplicates" },
    { key: "error_rows", label: "Errors" },
    { key: "status", label: "Status", render: (h) => <StatusBadge status={h.status} /> },
    {
      key: "created_at",
      label: "Date",
      render: (h) => <span className="text-xs text-slate-500">{new Date(h.created_at).toLocaleString()}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="CSV Bulk Alumni Import"
        subtitle="Validate, normalize, detect duplicates, and import alumni records into PostgreSQL."
        actions={
          <button
            type="button"
            onClick={downloadSampleCsv}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Download className="w-4 h-4" /> Download Sample CSV
          </button>
        }
      />

      <ErrorBanner message={error} />

      {/* Upload Form */}
      <form onSubmit={handlePreview} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        <label className="flex flex-col items-center justify-center gap-2 py-8 px-4 rounded-xl border-2 border-dashed border-slate-300 hover:border-brand-500 cursor-pointer bg-slate-50/70">
          <UploadCloud className="w-8 h-8 text-brand-600" />
          <span className="text-sm font-semibold text-slate-800">
            {file ? `${file.name} (${(file.size / 1024).toFixed(1)} KB)` : "Select Alumni CSV File"}
          </span>
          <span className="text-xs text-slate-500">
            Required columns: email, full_name (or first_name + last_name). Optional: company, job_title, industry, graduation_year, skills
          </span>
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="hidden"
          />
        </label>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={!file || previewing}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 disabled:opacity-50"
          >
            {previewing ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
            {previewing ? "Validating CSV..." : "Validate & Preview Records"}
          </button>
        </div>
      </form>

      {/* Preview Stage */}
      {preview && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Validation Preview: {preview.fileName}</h2>
              <p className="text-xs text-slate-500">
                Total Rows: {preview.totalRows} • Valid: {preview.validRows.length} • Duplicates:{" "}
                {preview.duplicateRows.length} • Validation Errors: {preview.errorRows.length}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPreview(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700"
              >
                Discard
              </button>
              <button
                type="button"
                disabled={preview.validRows.length === 0 || committing}
                onClick={handleCommit}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 disabled:opacity-50"
              >
                {committing && <Loader2 className="w-4 h-4 animate-spin" />}
                Import {preview.validRows.length} Valid Record(s)
              </button>
            </div>
          </div>

          {preview.errorRows.length > 0 && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 space-y-2">
              <p className="text-xs font-bold text-rose-800 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" /> Validation Errors ({preview.errorRows.length}) — Not Imported
              </p>
              <div className="max-h-40 overflow-y-auto space-y-1 text-xs text-rose-700">
                {preview.errorRows.map((errRow, i) => (
                  <p key={i}>
                    Row {errRow.rowNumber} ({errRow.email || errRow.full_name || "Blank"}):{" "}
                    {errRow.errors.join("; ")}
                  </p>
                ))}
              </div>
            </div>
          )}

          {preview.duplicateRows.length > 0 && (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 space-y-2">
              <p className="text-xs font-bold text-amber-900">
                Duplicate Records Detected ({preview.duplicateRows.length}) — Skipped
              </p>
              <div className="max-h-40 overflow-y-auto space-y-1 text-xs text-amber-800">
                {preview.duplicateRows.map((dup, i) => (
                  <p key={i}>
                    Row {dup.rowNumber}: {dup.full_name} ({dup.email}) — {dup.reason}
                  </p>
                ))}
              </div>
            </div>
          )}

          {preview.validRows.length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase text-slate-500 mb-2">
                Normalized Valid Records Ready for Import ({preview.validRows.length})
              </p>
              <DataTable
                columns={[
                  { key: "rowNumber", label: "Row" },
                  { key: "full_name", label: "Name" },
                  { key: "email", label: "Email" },
                  { key: "company", label: "Company" },
                  { key: "job_title", label: "Role" },
                  { key: "graduation_year", label: "Batch" },
                  {
                    key: "skills",
                    label: "Normalized Skills",
                    render: (r) => (r.skills || []).join(", ") || "—",
                  },
                ]}
                rows={preview.validRows.slice(0, 50)}
              />
            </div>
          )}
        </div>
      )}

      {/* Commit Summary */}
      {commitResult && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="text-sm text-emerald-900">
            <p className="font-bold">Bulk Import Complete</p>
            <p className="text-xs mt-1">
              Imported: <strong>{commitResult.importedCount}</strong> • Duplicates skipped:{" "}
              <strong>{commitResult.duplicateCount}</strong> • Errors:{" "}
              <strong>{commitResult.errorCount}</strong>
            </p>
          </div>
        </div>
      )}

      {/* Import History */}
      <section className="space-y-3">
        <h2 className="text-lg font-bold text-slate-900">Import History</h2>
        {loadingHistory ? (
          <LoadingSpinner label="Loading import history..." />
        ) : (
          <DataTable columns={historyColumns} rows={history} emptyMessage="No CSV import history yet." />
        )}
      </section>
    </div>
  );
}
