import { CheckCircle, Clock, Upload, XCircle, ChevronDown, ChevronRight, Eye, Inbox } from 'lucide-react';
import { getOpsApprovalSignedUrl, getOpsDocumentSignedUrl } from '@/app/api/ops';
import { CrossPageStatus } from '@/app/components/CrossPageStatus';
import { formatLabel } from '@/app/api/categories';
import { useValidationQueue } from '@/app/hooks/useValidationQueue';
import { useToast } from '@/app/hooks/useToast';
import { Button } from '@/app/components/ui/button';

function getStatusBadge(status: string) {
  switch (status) {
    case 'pending_upload':
      return { color: '#d97706', text: formatLabel(status), icon: Clock };
    case 'pending_validation':
      return { color: '#2563eb', text: formatLabel(status), icon: Clock };
    case 'validated':
      return { color: '#16a34a', text: formatLabel(status), icon: CheckCircle };
    case 'failed':
      return { color: '#dc2626', text: formatLabel(status), icon: Clock };
    default:
      return { color: '#6b7280', text: formatLabel(status), icon: Clock };
  }
}

export function ValidationPage() {
  const {
    loading, error, items, grouped, busy, summary,
    expandedClients, setExpandedClients,
    expandedCargo, setExpandedCargo,
    pickFile, onFilePicked,
    assessmentInputRef, draftInputRef, wh7InputRef, exitNoteInputRef, im8InputRef,
  } = useValidationQueue();
  const { toast } = useToast();

  const formatApprovalStatus = (status?: string | null) => {
    if (!status) return 'Not uploaded';
    if (status === 'REJECTED') return 'Awaiting validation';
    return formatLabel(status);
  };

  const getStatusColor = (status?: string | null) => {
    if (!status) return '#6b7280';
    if (status === 'APPROVED') return '#16a34a';
    if (status === 'REJECTED') return '#dc2626';
    return '#d97706';
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="page-title">Validation Queue</h1>
        <p className="page-desc mt-2">Cargos awaiting document upload and assessment review</p>
      </div>

      <CrossPageStatus />

      {/* hidden file inputs */}
      <input
        ref={assessmentInputRef}
        type="file"
        className="hidden"
        onChange={(e) => void onFilePicked(e.target.files?.[0] ?? null)}
      />
      <input
        ref={draftInputRef}
        type="file"
        className="hidden"
        onChange={(e) => void onFilePicked(e.target.files?.[0] ?? null)}
      />
      <input
        ref={wh7InputRef}
        type="file"
        className="hidden"
        onChange={(e) => void onFilePicked(e.target.files?.[0] ?? null)}
      />
      <input
        ref={exitNoteInputRef}
        type="file"
        className="hidden"
        onChange={(e) => void onFilePicked(e.target.files?.[0] ?? null)}
      />
      <input
        ref={im8InputRef}
        type="file"
        className="hidden"
        onChange={(e) => void onFilePicked(e.target.files?.[0] ?? null)}
      />

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-6 mb-8">
        <div className="bg-card rounded-lg p-5 border border-default">
          <div className="flex items-center gap-3 mb-2">
            <Upload className="w-5 h-5" style={{ color: '#10b981' }} />
            <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>Awaiting Upload</div>
          </div>
          <div className="text-3xl kpi-value">
            {summary.pendingUpload}
          </div>
        </div>
        <div className="bg-card rounded-lg p-5 border border-default">
          <div className="flex items-center gap-3 mb-2">
            <Inbox className="w-5 h-5" style={{ color: '#5e6ad2' }} />
            <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>Pending Validation</div>
          </div>
          <div className="text-3xl kpi-value">
            {summary.pendingValidation}
          </div>
        </div>
        <div className="bg-card rounded-lg p-5 border border-default">
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle className="w-5 h-5" style={{ color: '#22c55e' }} />
            <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>Validated / Failed</div>
          </div>
          <div className="text-3xl kpi-value">
            {summary.validated + summary.failed}
          </div>
        </div>
      </div>

      <div className="bg-card rounded-lg border border-default">
        {loading ? (
          <div className="empty-state">
            <div className="animate-pulse">
              <div className="w-6 h-6 rounded-full loading-pulse"></div>
            </div>
            <p className="empty-title">Loading validation queue</p>
            <p className="empty-sub">Fetching the latest data…</p>
          </div>
        ) : error ? (
          <div className="px-6 py-8 text-sm text-destructive">
            {error}
          </div>
        ) : items.length === 0 ? (
          <div className="empty-state">
            <CheckCircle size={28} color="#1c1d20" />
            <p className="empty-title">No cargos ready for validation</p>
            <p className="empty-sub">Items appear here when documents need validation</p>
          </div>
        ) : (
          <div className="divide-y border-default">
            {grouped.map((g) => {
              const expanded = expandedClients[g.clientId] ?? true;

              return (
                <div key={g.clientId} className="px-6 py-4">
                  <Button variant="outline"
                    className="w-full flex items-center justify-between"
                    onClick={() => setExpandedClients((m) => ({ ...m, [g.clientId]: !expanded }))}
                  >
                      <div className="flex items-center gap-2">
                        {expanded ? (
                          <ChevronDown className="w-4 h-4 opacity-60 shrink-0" />
                        ) : (
                          <ChevronRight className="w-4 h-4 opacity-60 shrink-0" />
                        )}
                        <div className="flex items-center gap-2">
                          <div className="text-sm font-semibold">
                            {g.clientName}
                          </div>
                          <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>{g.items.length} {g.items.length === 1 ? 'cargo' : 'cargos'}</div>
                        </div>
                      </div>
                  </Button>

                  {expanded && (
                    <div className="mt-4 space-y-3">
                      {g.items.map((it) => {
                        const assessmentKey = `${it.cargo_id}:ASSESSMENT`;
                        const draftKey = `${it.cargo_id}:DECLARATION_DRAFT`;
                        const wh7Key = `${it.cargo_id}:WH7_DOC`;
                        const exitNoteKey = `${it.cargo_id}:EXIT_NOTE`;
                        const im8Key = `${it.cargo_id}:IM8`;

                        const badge = getStatusBadge(it.validation_status);
                        const Icon = badge.icon;

                        const cargoExpanded = expandedCargo[it.cargo_id] ?? false;

                        const canUploadRequired = it.validation_status === 'pending_upload' || it.validation_status === 'pending_validation' || it.validation_status === 'failed';
                        const canUploadOptional = canUploadRequired || it.validation_status === 'validated';
                        const canSend =
                          Boolean(it.assessment) &&
                          Boolean(it.draft) &&
                          Boolean(it.wh7) &&
                          Boolean(it.exit_note) &&
                          it.validation_status === 'pending_upload' || it.validation_status === 'failed';

                        return (
                          <div key={it.cargo_id} className="rounded border border-default">
                            <div className="px-4 py-3 flex items-start justify-between gap-4">
                              <div
                                className="flex items-start gap-3 cursor-pointer"
                                role="button"
                                tabIndex={0}
                                onClick={() => setExpandedCargo((m) => ({ ...m, [it.cargo_id]: !cargoExpanded }))}
                              >
                                {cargoExpanded ? (
                                  <ChevronDown className="w-4 h-4 opacity-60 mt-0.5" />
                                ) : (
                                  <ChevronRight className="w-4 h-4 opacity-60 mt-0.5" />
                                )}
                                <div>
                                  <div className="font-mono text-sm" style={{ color: 'var(--primary)' }}>
                                    {it.cargo_id}
                                  </div>
                                  <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>Client: {it.client_name}</div>
                                  <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                                    Created:{' '}
                                    {it.validation_created_at ? new Date(it.validation_created_at).toLocaleString() : '—'}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-3">
                                <div
                                  className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs border"
                                  style={{ borderColor: badge.color, color: badge.color, fontWeight: 700 }}
                                >
                                  <Icon className="w-3.5 h-3.5" />
                                  {badge.text}
                                </div>
                              </div>
                            </div>

                              {cargoExpanded && (
                                <div className="px-4 pb-4 animate-fadeIn">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                  <div className="border rounded-lg p-4 border-default">
                                    <div className="text-sm mb-2">
                                      Verified Documents
                                    </div>
                                    <div className="space-y-2">
                                      {(it.documents ?? []).map((d) => (
                                        <div
                                          key={d.document_type}
                                          className="flex items-center justify-between px-3 py-2 rounded border border-default"
                                        >
                                          <div>
                                            <div className="text-sm font-semibold">
                                              {formatLabel(d.document_type)}
                                            </div>
                                            <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                                               Uploaded {d.uploaded_at ? new Date(d.uploaded_at).toLocaleString() : '—'}
                                            </div>
                                          </div>
                                          <div className="flex items-center gap-3">
                                            <Button
                                              className="inline-flex items-center gap-2 text-xs px-2 py-1 rounded border border-default disabled:opacity-50"
                                              disabled={!d.id && !(d.status === 'VERIFIED' && d.drive_url)}
                                              onClick={async () => {
                                                try {
                                                  // IMPORTANT:
                                                  // - Before VERIFIED, the file lives in the bucket. Use signed-url (requires document id).
                                                  // - After VERIFIED, drive_url is a Google Drive URL.
                                                  if (d.status === 'VERIFIED' && d.drive_url) {
                                                    window.open(d.drive_url, '_blank', 'noreferrer');
                                                    return;
                                                  }

                                                  const { url } = await getOpsDocumentSignedUrl(d.id);
                                                  window.open(url, '_blank', 'noreferrer');
                                                } catch (e) {
                                                  toast({ type: 'error', message: 'Failed to open document' });
                                                }
                                              }}
                                            >
                                              <Eye className="w-3.5 h-3.5" />
                                              View
                                            </Button>
                                            <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>{formatLabel(d.status)}</div>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>

                                  <div className="border rounded-lg p-5 border-default">
                                    <div className="section-title mb-4">Actions</div>

                                    <div className="space-y-4">
                                      {/* Assessment */}
                                      <div className="rounded-lg p-4 bg-muted">
                                        <div className="flex items-start justify-between gap-4">
                                          <div>
                                            <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Assessment</div>
                                            <div className="text-xs mt-1 flex items-center gap-1.5" style={{ color: getStatusColor(it.assessment?.status) }}>
                                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: getStatusColor(it.assessment?.status) }} />
                                            {formatApprovalStatus(it.assessment?.status)}
                                          </div>
                                          </div>
                                          <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                                            {it.assessment && (it.assessment.file_path || it.assessment.file_url) && (
                                              <Button variant="outline"
                                                onClick={async () => {
                                                  try {
                                                    const { url } = await getOpsApprovalSignedUrl(it.assessment!.id);
                                                    window.open(url, '_blank', 'noreferrer');
                                                  } catch (e) {
                                                    toast({ type: 'error', message: 'Failed to open document' });
                                                  }
                                                }}>
                                                <Eye className="w-3.5 h-3.5" /> View
                                              </Button>
                                            )}
                                            <Button onClick={() => pickFile(it.cargo_id, 'ASSESSMENT')}
                                              disabled={!canUploadRequired || Boolean(busy[assessmentKey]) || Boolean(it.assessment && it.assessment.status !== 'REJECTED')}
                                              className="text-xs">
                                              <Upload className="w-3.5 h-3.5" />
                                              {busy[assessmentKey]
                                                ? it.assessment?.status === 'REJECTED' ? 'Re-uploading…' : 'Uploading…'
                                                : it.assessment
                                                  ? it.assessment.status === 'REJECTED' ? 'Re-upload' : 'Uploaded'
                                                  : 'Upload'}
                                            </Button>
                                          </div>
                                        </div>
                                        {it.assessment?.status === 'REJECTED' && it.assessment?.rejection_reason && (
                                          <div className="flex items-start gap-2 mt-3 px-3 py-2 rounded text-xs" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', borderLeft: '3px solid rgb(239, 68, 68)' }}>
                                            <XCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: 'rgb(239, 68, 68)' }} />
                                            <div>
                                              <div style={{ color: 'rgb(220, 38, 38)', fontWeight: 600 }}>Rejection Reason</div>
                                              <div style={{ color: 'rgb(185, 28, 28)' }}>{it.assessment.rejection_reason}</div>
                                            </div>
                                          </div>
                                        )}
                                      </div>

                                      {/* Draft Validation */}
                                      <div className="rounded-lg p-4 bg-muted">
                                        <div className="flex items-start justify-between gap-4">
                                          <div>
                                            <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Draft Validation</div>
                                            <div className="text-xs mt-1 flex items-center gap-1.5" style={{ color: getStatusColor(it.draft?.status) }}>
                                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: getStatusColor(it.draft?.status) }} />
                                            {formatApprovalStatus(it.draft?.status)}
                                          </div>
                                          </div>
                                          <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                                            {it.draft && (it.draft.file_path || it.draft.file_url) && (
                                              <Button variant="outline"
                                                onClick={async () => {
                                                  try {
                                                    const { url } = await getOpsApprovalSignedUrl(it.draft!.id);
                                                    window.open(url, '_blank', 'noreferrer');
                                                  } catch (e) {
                                                    toast({ type: 'error', message: 'Failed to open document' });
                                                  }
                                                }}>
                                                <Eye className="w-3.5 h-3.5" /> View
                                              </Button>
                                            )}
                                            <Button onClick={() => pickFile(it.cargo_id, 'DECLARATION_DRAFT')}
                                              disabled={!canUploadRequired || Boolean(busy[draftKey]) || Boolean(it.draft && it.draft.status !== 'REJECTED')}
                                              className="text-xs">
                                              <Upload className="w-3.5 h-3.5" />
                                              {busy[draftKey]
                                                ? it.draft?.status === 'REJECTED' ? 'Re-uploading…' : 'Uploading…'
                                                : it.draft
                                                  ? it.draft.status === 'REJECTED' ? 'Re-upload' : 'Uploaded'
                                                  : 'Upload'}
                                            </Button>
                                          </div>
                                        </div>
                                        {it.draft?.status === 'REJECTED' && it.draft?.rejection_reason && (
                                          <div className="flex items-start gap-2 mt-3 px-3 py-2 rounded text-xs" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', borderLeft: '3px solid rgb(239, 68, 68)' }}>
                                            <XCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: 'rgb(239, 68, 68)' }} />
                                            <div>
                                              <div style={{ color: 'rgb(220, 38, 38)', fontWeight: 600 }}>Rejection Reason</div>
                                              <div style={{ color: 'rgb(185, 28, 28)' }}>{it.draft.rejection_reason}</div>
                                            </div>
                                          </div>
                                        )}
                                      </div>

                                      {/* WH7 */}
                                      <div className="rounded-lg p-4 bg-muted">
                                        <div className="flex items-start justify-between gap-4">
                                          <div>
                                            <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>WH7</div>
                                            <div className="text-xs mt-1 flex items-center gap-1.5" style={{ color: getStatusColor(it.wh7?.status) }}>
                                              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: getStatusColor(it.wh7?.status) }} />
                                              {formatApprovalStatus(it.wh7?.status)}
                                            </div>
                                          </div>
                                          <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                                            {it.wh7 && (it.wh7.file_path || it.wh7.file_url) && (
                                              <Button variant="outline"
                                                onClick={async () => {
                                                  try {
                                                    const { url } = await getOpsApprovalSignedUrl(it.wh7!.id);
                                                    window.open(url, '_blank', 'noreferrer');
                                                  } catch (e) {
                                                    toast({ type: 'error', message: 'Failed to open document' });
                                                  }
                                                }}>
                                                <Eye className="w-3.5 h-3.5" /> View
                                              </Button>
                                            )}
                                            <Button onClick={() => pickFile(it.cargo_id, 'WH7_DOC')}
                                              disabled={!canUploadRequired || Boolean(busy[wh7Key]) || Boolean(it.wh7 && it.wh7.status !== 'REJECTED')}
                                              className="text-xs">
                                              <Upload className="w-3.5 h-3.5" />
                                              {busy[wh7Key]
                                                ? it.wh7?.status === 'REJECTED' ? 'Re-uploading…' : 'Uploading…'
                                                : it.wh7
                                                  ? it.wh7.status === 'REJECTED' ? 'Re-upload' : 'Uploaded'
                                                  : 'Upload'}
                                            </Button>
                                          </div>
                                        </div>
                                        {it.wh7?.status === 'REJECTED' && it.wh7?.rejection_reason && (
                                          <div className="flex items-start gap-2 mt-3 px-3 py-2 rounded text-xs" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', borderLeft: '3px solid rgb(239, 68, 68)' }}>
                                            <XCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: 'rgb(239, 68, 68)' }} />
                                            <div>
                                              <div style={{ color: 'rgb(220, 38, 38)', fontWeight: 600 }}>Rejection Reason</div>
                                              <div style={{ color: 'rgb(185, 28, 28)' }}>{it.wh7.rejection_reason}</div>
                                            </div>
                                          </div>
                                        )}
                                      </div>

                                      {/* Exit Note */}
                                      <div className="rounded-lg p-4 bg-muted">
                                        <div className="flex items-start justify-between gap-4">
                                          <div>
                                            <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Exit Note</div>
                                            <div className="text-xs mt-1 flex items-center gap-1.5" style={{ color: getStatusColor(it.exit_note?.status) }}>
                                              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: getStatusColor(it.exit_note?.status) }} />
                                              {formatApprovalStatus(it.exit_note?.status)}
                                            </div>
                                          </div>
                                          <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                                            {it.exit_note && (it.exit_note.file_path || it.exit_note.file_url) && (
                                              <Button variant="outline"
                                                onClick={async () => {
                                                  try {
                                                    const { url } = await getOpsApprovalSignedUrl(it.exit_note!.id);
                                                    window.open(url, '_blank', 'noreferrer');
                                                  } catch (e) {
                                                    toast({ type: 'error', message: 'Failed to open document' });
                                                  }
                                                }}>
                                                <Eye className="w-3.5 h-3.5" /> View
                                              </Button>
                                            )}
                                            <Button onClick={() => pickFile(it.cargo_id, 'EXIT_NOTE')}
                                              disabled={!canUploadOptional || Boolean(busy[exitNoteKey]) || Boolean(it.exit_note && it.exit_note.status !== 'REJECTED')}
                                              className="text-xs">
                                              <Upload className="w-3.5 h-3.5" />
                                              {busy[exitNoteKey]
                                                ? it.exit_note?.status === 'REJECTED' ? 'Re-uploading…' : 'Uploading…'
                                                : it.exit_note
                                                  ? it.exit_note.status === 'REJECTED' ? 'Re-upload' : 'Uploaded'
                                                  : 'Upload'}
                                            </Button>
                                          </div>
                                        </div>
                                        {it.exit_note?.status === 'REJECTED' && it.exit_note?.rejection_reason && (
                                          <div className="flex items-start gap-2 mt-3 px-3 py-2 rounded text-xs" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', borderLeft: '3px solid rgb(239, 68, 68)' }}>
                                            <XCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: 'rgb(239, 68, 68)' }} />
                                            <div>
                                              <div style={{ color: 'rgb(220, 38, 38)', fontWeight: 600 }}>Rejection Reason</div>
                                              <div style={{ color: 'rgb(185, 28, 28)' }}>{it.exit_note.rejection_reason}</div>
                                            </div>
                                          </div>
                                        )}
                                      </div>

                                      {/* IM8 */}
                                      <div className="rounded-lg p-4 bg-muted">
                                        <div className="flex items-start justify-between gap-4">
                                          <div>
                                            <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>IM8</div>
                                            <div className="text-xs mt-1 flex items-center gap-1.5" style={{ color: getStatusColor(it.im8?.status) }}>
                                              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: getStatusColor(it.im8?.status) }} />
                                              {formatApprovalStatus(it.im8?.status)}
                                            </div>
                                          </div>
                                          <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                                            {it.im8 && (it.im8.file_path || it.im8.file_url) && (
                                              <Button variant="outline"
                                                onClick={async () => {
                                                  try {
                                                    const { url } = await getOpsApprovalSignedUrl(it.im8!.id);
                                                    window.open(url, '_blank', 'noreferrer');
                                                  } catch (e) {
                                                    toast({ type: 'error', message: 'Failed to open document' });
                                                  }
                                                }}>
                                                <Eye className="w-3.5 h-3.5" /> View
                                              </Button>
                                            )}
                                            <Button onClick={() => pickFile(it.cargo_id, 'IM8')}
                                              disabled={!canUploadOptional || Boolean(busy[im8Key]) || Boolean(it.im8 && it.im8.status !== 'REJECTED')}
                                              className="text-xs">
                                              <Upload className="w-3.5 h-3.5" />
                                              {busy[im8Key]
                                                ? it.im8?.status === 'REJECTED' ? 'Re-uploading…' : 'Uploading…'
                                                : it.im8
                                                  ? it.im8.status === 'REJECTED' ? 'Re-upload' : 'Uploaded'
                                                  : 'Upload'}
                                            </Button>
                                          </div>
                                        </div>
                                        {it.im8?.status === 'REJECTED' && it.im8?.rejection_reason && (
                                          <div className="flex items-start gap-2 mt-3 px-3 py-2 rounded text-xs" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', borderLeft: '3px solid rgb(239, 68, 68)' }}>
                                            <XCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: 'rgb(239, 68, 68)' }} />
                                            <div>
                                              <div style={{ color: 'rgb(220, 38, 38)', fontWeight: 600 }}>Rejection Reason</div>
                                              <div style={{ color: 'rgb(185, 28, 28)' }}>{it.im8.rejection_reason}</div>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
