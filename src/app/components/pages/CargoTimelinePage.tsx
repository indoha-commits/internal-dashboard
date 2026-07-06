import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';

import { getOpsCargoTimeline, getOpsDocumentSignedUrl, getOpsApprovalSignedUrl, type OpsCargoTimelineResponse } from '@/app/api/ops';
import { requiredDocsForCategory, type CargoCategory, formatLabel as formatCategoryLabel } from '@/app/api/categories';
import { getSupabase } from '@/app/auth/supabase';
import { Button } from '@/app/components/ui/button';

interface CargoTimelinePageProps {
  preselectedCargoId?: string;
}

function formatLabel(value?: string | null): string {
  if (!value) return 'Unknown';
  return value.replace(/_/g, ' ').toLowerCase().replace(/(^|\s)\S/g, (s) => s.toUpperCase());
}

function approvalKindForDocType(docType: string): string | null {
  if (docType === 'DRAFT_DECLARATION') return 'DECLARATION_DRAFT';
  if (docType === 'WH7') return 'WH7_DOC';
  return docType;
}

type DerivedTimelineEvent = {
  key: string;
  label: string;
  at: string;
  detail?: string;
};

function buildDerivedTimeline(data: OpsCargoTimelineResponse): DerivedTimelineEvent[] {
  const events: DerivedTimelineEvent[] = [];

  // 1) Cargo created
  events.push({
    key: 'CARGO_CREATED',
    label: 'Cargo created',
    at: data.cargo?.created_at,
  });

  // 2) Document-based milestones (bucket evidence)
  const uploadedDocs = (data.documents ?? []).filter((d) => d.status === 'UPLOADED' && d.uploaded_at);
  const verifiedDocs = (data.documents ?? []).filter((d) => d.status === 'VERIFIED' && d.verified_at);

  const earliestUpload = uploadedDocs
    .map((d) => d.uploaded_at as string)
    .sort((a, b) => Date.parse(a) - Date.parse(b))[0];

  const latestUpload = uploadedDocs
    .map((d) => d.uploaded_at as string)
    .sort((a, b) => Date.parse(b) - Date.parse(a))[0];

  const latestVerified = verifiedDocs
    .map((d) => d.verified_at as string)
    .sort((a, b) => Date.parse(b) - Date.parse(a))[0];

  if (earliestUpload) {
    events.push({
      key: 'DOCS_UPLOADED',
      label: 'Documents uploaded',
      at: earliestUpload,
      detail: 'Files detected in bucket (pre-validation).',
    });
  }

  // 3) Validation step (explicit when we see bucket uploads without verification)
  // If there are uploaded docs and not all are verified, we are effectively in validation.
  const hasUploaded = (data.documents ?? []).some((d) => d.status === 'UPLOADED');
  const hasAnyVerified = (data.documents ?? []).some((d) => d.status === 'VERIFIED');
  const hasPendingValidation = hasUploaded && !hasAnyVerified;

  if (hasPendingValidation) {
    events.push({
      key: 'VALIDATION',
      label: 'Validation in progress',
      at: latestUpload ?? earliestUpload ?? data.cargo?.created_at,
      detail: 'Documents are present in the bucket and awaiting verification.',
    });
  }

  if (latestVerified) {
    events.push({
      key: 'DOCS_VERIFIED',
      label: 'Documents verified',
      at: latestVerified,
    });
  }

  // 4) Approvals (draft/assessment) visibility
  for (const a of (data.approvals ?? [])) {
    events.push({
      key: `APPROVAL_${a.kind}_${a.id}`,
      label: `${formatLabel(a.kind)} ${formatLabel(a.status)}`,
      at: a.decided_at ?? a.created_at,
      detail: a.decided_at ? `Decided ${new Date(a.decided_at).toLocaleString()}` : 'Awaiting decision',
    });
  }

  // Sort chronologically
  return events
    .filter((e) => !Number.isNaN(Date.parse(e.at)))
    .sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
}

export function CargoTimelinePage({ preselectedCargoId = '' }: CargoTimelinePageProps) {
  const [searchQuery, setSearchQuery] = useState(preselectedCargoId);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<OpsCargoTimelineResponse | null>(null);
  const requiredDocs = data?.cargo?.category
    ? requiredDocsForCategory(data.cargo?.category as CargoCategory)
    : [];
  const documentsByType = data?.documents.reduce<Record<string, typeof data.documents>>((acc, doc) => {
    acc[doc.document_type] = acc[doc.document_type] ? [...acc[doc.document_type], doc] : [doc];
    return acc;
  }, {}) ?? {};
  const approvalsByKind = data?.approvals.reduce<Record<string, typeof data.approvals>>((acc, approval) => {
    acc[approval.kind] = acc[approval.kind] ? [...acc[approval.kind], approval] : [approval];
    return acc;
  }, {}) ?? {};

  const load = async (cargoId: string) => {
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const res = await getOpsCargoTimeline(cargoId);
      setData(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (preselectedCargoId) {
      load(preselectedCargoId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preselectedCargoId]);

  // Real-time subscriptions for cargo timeline updates
  useEffect(() => {
    if (!data?.cargo.id) return;

    const supabase = getSupabase();
    const cargoId = data.cargo.id;

    const refreshTimeline = () => {
      load(cargoId);
    };

    // Subscribe to cargo_events table (timeline updates)
    const eventsSubscription = supabase
      .channel(`cargo_timeline_events_${cargoId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'cargo_events',
          filter: `cargo_id=eq.${cargoId}`,
        },
        () => {
          refreshTimeline();
        }
      )
      .subscribe();

    // Subscribe to client_documents table (document updates)
    const documentsSubscription = supabase
      .channel(`cargo_timeline_documents_${cargoId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'client_documents',
          filter: `cargo_id=eq.${cargoId}`,
        },
        () => {
          refreshTimeline();
        }
      )
      .subscribe();

    // Subscribe to cargo_client_approvals table (approval updates)
    const approvalsSubscription = supabase
      .channel(`cargo_timeline_approvals_${cargoId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cargo_client_approvals',
          filter: `cargo_id=eq.${cargoId}`,
        },
        () => {
          refreshTimeline();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(eventsSubscription);
      supabase.removeChannel(documentsSubscription);
      supabase.removeChannel(approvalsSubscription);
    };
  }, [data?.cargo.id]);

  const handleSearch = () => {
    const q = searchQuery.trim();
    if (!q) return;
    load(q);
  };

  const [actionError, setActionError] = useState<string | null>(null);

  const openDoc = async (documentId: string) => {
    setActionError(null);
    try {
      const res = await getOpsDocumentSignedUrl(documentId);
      window.open(res.url, '_blank', 'noopener,noreferrer');
    } catch (e) {
      setActionError(e instanceof Error ? e.message : String(e));
    }
  };

  const openApproval = async (approval: OpsCargoTimelineResponse['approvals'][number]) => {
    setActionError(null);
    try {
      const res = await getOpsApprovalSignedUrl(approval.id);
      window.open(res.url, '_blank', 'noopener,noreferrer');
    } catch (e) {
      setActionError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="page-title">Cargo Timeline</h1>
        <p className="page-desc mt-2">Authoritative event history for every cargo</p>
      </div>

      <div className="mb-8 flex gap-3">
        <label className="sr-only" htmlFor="search-timeline">Search cargo timeline</label>
        <div className="flex-1 search-bar">
          <Search className="w-4 h-4" style={{ color: '#2a2b2f' }} />
          <input
            id="search-timeline"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Cargo ID"
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSearch();
            }}
            aria-label="Search cargo timeline"
          />
        </div>

        <Button onClick={handleSearch}>
          Search
        </Button>
      </div>

      {actionError && (
        <div
          className="mb-6 bg-card rounded-lg border border-default p-4 text-sm"
          style={{ color: 'var(--destructive)' }}
        >
          {actionError}
        </div>
      )}

      {loading ? (
        <div className="empty-state">
          <div className="animate-pulse">
            <div className="w-6 h-6 rounded-full loading-pulse"></div>
          </div>
          <p className="empty-title">Loading timeline</p>
          <p className="empty-sub">Fetching cargo events…</p>
        </div>
      ) : error ? (
        <div className="bg-card rounded-lg border border-default p-8 text-sm" style={{ color: 'var(--destructive)' }}>
          {error}
        </div>
      ) : !data ? (
        <div className="empty-state">
          <Search size={28} color="#1c1d20" />
          <p className="empty-title">Enter a Cargo ID</p>
          <p className="empty-sub">Search for a cargo to view its timeline</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-card rounded-lg border border-default p-6">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>Cargo</div>
                <div className="font-mono text-lg" style={{ color: 'var(--primary)' }}>
                  {data.cargo?.id}
                </div>
                <div className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Client: {data.cargo?.client_name}</div>
                <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>Category: {formatLabel(data.cargo?.category ?? '')}</div>
              </div>
              <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>Created {data.cargo?.created_at ? new Date(data.cargo.created_at).toLocaleString() : ''}</div>
            </div>
          </div>

          <div className="bg-card rounded-lg border border-default">
            <div className="px-6 py-4 border-b border-default">
              <h2>Required Documents</h2>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                {data.cargo?.category ? `Category: ${formatCategoryLabel(data.cargo.category)}` : 'Category not set'}
              </p>
            </div>
            <div className="divide-y border-default">
              {requiredDocs.length === 0 ? (
                <div className="empty-state">
                  <p className="empty-title">No required documents</p>
                  <p className="empty-sub">No documents configured for this cargo category</p>
                </div>
              ) : (
                requiredDocs.map((docType) => {
                  const docs = documentsByType[docType] ?? [];
                  const approvals = approvalsByKind[approvalKindForDocType(docType) ?? docType] ?? [];
                  const latestDoc = docs[0];
                  const latestApproval = approvals[0];
                  const status = latestDoc?.status === 'VERIFIED'
                    ? 'Validated'
                    : latestDoc?.status === 'UPLOADED'
                    ? 'Uploaded'
                    : latestApproval?.status
                    ? formatLabel(latestApproval.status)
                    : 'Pending';
                  const uploadedAt = latestDoc?.uploaded_at ?? latestApproval?.created_at ?? null;
                  const verifiedAt = latestDoc?.verified_at ?? latestApproval?.decided_at ?? null;

                  return (
                    <div key={docType} className="px-6 py-4 flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <div className="text-sm font-medium">
                          {formatLabel(docType)}
                        </div>
                        <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>{status}</div>
                        {uploadedAt && (
                          <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>Uploaded {new Date(uploadedAt).toLocaleString()}</div>
                        )}
                        {verifiedAt && (
                          <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>Validated {new Date(verifiedAt).toLocaleString()}</div>
                        )}
                      </div>
                      <div>
                        {latestDoc ? (
                          <Button
                            onClick={() => openDoc(latestDoc.id)}
                            variant="outline"
                          >
                            Open
                          </Button>
                        ) : latestApproval ? (
                          <Button
                            onClick={() => void openApproval(latestApproval)}
                            variant="outline"
                          >
                            Open
                          </Button>
                        ) : (
                          <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>No file</span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="bg-card rounded-lg border border-default">
            <div className="px-6 py-4 border-b border-default">
              <h2>Validation Queue Documents</h2>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Assessment, Draft, WH7, Exit Note, IM8, and pathway approvals</p>
            </div>
            <div className="divide-y border-default">
              {(data.approvals ?? []).length === 0 ? (
                <div className="empty-state">
                  <p className="empty-title">No validation documents</p>
                  <p className="empty-sub">Approval documents appear here when uploaded</p>
                </div>
              ) : (
                data.approvals.map((a) => (
                  <div key={a.id} className="px-6 py-4 flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-baseline gap-3">
                        <div className="text-sm font-medium">
                          {formatLabel(a.kind)}
                        </div>
                        <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>{formatLabel(a.status)}</div>
                      </div>
                      <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>Uploaded {new Date(a.created_at).toLocaleString()}</div>
                      {a.decided_at && <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>Validated {new Date(a.decided_at).toLocaleString()}</div>}
                    </div>

                    <Button
                      onClick={() => void openApproval(a)}
                      variant="outline"
                    >
                      Open
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-card rounded-lg border border-default">
            <div className="px-6 py-4 border-b border-default">
              <h2>Events</h2>
            </div>
            <div className="divide-y border-default">
              {(data.events ?? []).length === 0 ? (
                (() => {
                  const derived = buildDerivedTimeline(data);
                  if (derived.length === 0) {
                    return <div className="empty-state"><p className="empty-title">No events</p><p className="empty-sub">No events recorded for this cargo yet</p></div>;
                  }

                  return (
                    <div className="px-6 py-6">
                      <div className="text-xs mb-3" style={{ color: 'var(--text-secondary)' }}>
                        No cargo milestone events recorded for this cargo. Showing a derived timeline from documents/approvals.
                      </div>
                      <div className="divide-y border-default">
                        {derived.map((ev) => (
                          <div key={ev.key} className="py-3">
                            <div className="flex items-baseline justify-between gap-4">
                              <div className="text-sm font-medium">
                                {ev.label}
                              </div>
                              <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>{new Date(ev.at).toLocaleString()}</div>
                            </div>
                            {ev.detail && <div className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>{ev.detail}</div>}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()
              ) : (
                data.events.map((ev) => (
                  <div key={ev.id} className="px-6 py-4">
                    <div className="flex items-baseline justify-between gap-4">
                      <div className="text-sm font-medium">
                        {formatLabel(ev.event_type)}
                      </div>
                      <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>{new Date(ev.event_time).toLocaleString()}</div>
                    </div>
                    {ev.notes && <div className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>{ev.notes}</div>}
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
