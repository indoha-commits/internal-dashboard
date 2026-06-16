import { fetchJson } from './client';

export type MeResponse = {
  id: string;
  email: string;
  role: 'client' | 'ops' | 'admin';
  client_id: string | null;
};

export async function getMe(): Promise<MeResponse> {
  return await fetchJson<MeResponse>('/me');
}

export type ClaimInternalSessionResponse =
  | { ok: true; session_id: string; expires_at: string }
  | { ok: false; error: 'session_locked'; detail: string };

export async function claimInternalSession(sessionId: string): Promise<ClaimInternalSessionResponse> {
  return await fetchJson<ClaimInternalSessionResponse>('/ops/internal-session/claim', {
    method: 'POST',
    body: JSON.stringify({ session_id: sessionId }),
  });
}

export async function heartbeatInternalSession(sessionId: string): Promise<{ ok: true; expires_at: string }> {
  return await fetchJson<{ ok: true; expires_at: string }>('/ops/internal-session/heartbeat', {
    method: 'POST',
    body: JSON.stringify({ session_id: sessionId }),
  });
}

export async function releaseInternalSession(sessionId: string): Promise<{ ok: true }> {
  return await fetchJson<{ ok: true }>('/ops/internal-session/release', {
    method: 'POST',
    body: JSON.stringify({ session_id: sessionId }),
  });
}

export type OpsDashboardResponse = {
  kpis: {
    pending_documents: number;
    pending_validation: number;
    awaiting_upload: number;
    failed_validation: number;
  };
  urgent_documents: Array<{
    id: string;
    cargo_id: string;
    document_type: string;
    status: string;
    drive_url: string | null;
    uploaded_at: string | null;
    client_id: string | null;
    client_name: string | null;
  }>;
};

export async function getOpsDashboard(): Promise<OpsDashboardResponse> {
  return await fetchJson<OpsDashboardResponse>('/ops/dashboard');
}

export type OpsPendingDocumentsResponse = {
  documents: Array<{
    id: string;
    cargo_id: string;
    bill_of_lading: string | null;
    document_type: string;
    status: string;
    drive_url: string | null;
    uploaded_at: string | null;
    client_id: string | null;
    client_name: string | null;
    rejection_reason?: string | null;
  }>;
};

export async function getOpsPendingDocuments(): Promise<OpsPendingDocumentsResponse> {
  return await fetchJson<OpsPendingDocumentsResponse>('/ops/pending-documents');
}

export type OpsCargoRegistryResponse = {
  groups: Array<{
    bill_of_lading: string;
    client_id: string;
    client_name: string;
    category: string | null;
    container_count: number;
    origin: string | null;
    destination: string | null;
    route: string | null;
    vessel: string | null;
    expected_arrival_date: string | null;
    eta: string | null;
    created_at: string;
    updated_at: string;
    cargos: Array<{
      cargo_id: string;
      cargo_uuid: string;
      created_at: string;
      latest_event_type: string | null;
      latest_event_time: string | null;
    }>;
  }>;
};

export async function getOpsCargoRegistry(): Promise<OpsCargoRegistryResponse> {
  return await fetchJson<OpsCargoRegistryResponse>('/ops/cargo-registry');
}

export type OpsCargoTimelineResponse = {
  cargo: {
    id: string;
    client_id: string;
    client_name: string;
    category: string;
    created_at: string;
  };
  documents: Array<{
    id: string;
    document_type: string;
    status: string;
    uploaded_at: string | null;
    verified_at: string | null;
    drive_url: string | null;
  }>;
  events: Array<{
    id: string;
    event_type: string;
    event_time: string;
    notes: string | null;
    recorded_at: string;
  }>;
  approvals: Array<{
    id: string;
    kind: string;
    status: string;
    file_url: string | null;
    file_path: string | null;
    created_at: string;
    decided_at: string | null;
    rejection_reason: string | null;
  }>;
};

export async function getOpsCargoTimeline(cargoId: string): Promise<OpsCargoTimelineResponse> {
  return await fetchJson<OpsCargoTimelineResponse>(`/ops/cargo/${encodeURIComponent(cargoId)}/timeline`);
}

export async function recordOpsCargoEvent(cargoId: string, eventType: string): Promise<{ event: any }> {
  return await fetchJson<{ event: any }>(`/ops/cargo/${encodeURIComponent(cargoId)}/timeline`, {
    method: 'POST',
    body: JSON.stringify({ event_type: eventType }),
  });
}

export type OpsActivityLogResponse = {
  rows: Array<{
    timestamp: string;
    action: string;
    cargoId?: string;
    eventType?: string;
    actorRole: string;
  }>;
};

export async function getOpsActivityLog(): Promise<OpsActivityLogResponse> {
  return await fetchJson<OpsActivityLogResponse>('/ops/activity-log');
}

export type OpsValidationQueueItem = {
  cargo_id: string;
  client_id: string;
  client_name: string;
  documents: Array<{
    id: string;
    document_type: string;
    uploaded_at: string | null;
    verified_at: string | null;
    status: 'REQUIRED' | 'UPLOADED' | 'VERIFIED';
    drive_url: string | null;
  }>;
  assessment: {
    id: string;
    cargo_id: string;
    kind: 'ASSESSMENT';
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';
    file_url: string | null;
    file_path: string | null;
    created_at: string;
    decided_at: string | null;
    rejection_reason: string | null;
  } | null;
  draft: {
    id: string;
    cargo_id: string;
    kind: 'DECLARATION_DRAFT';
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';
    file_url: string | null;
    file_path: string | null;
    created_at: string;
    decided_at: string | null;
    rejection_reason: string | null;
  } | null;
  validation_status: 'pending_upload' | 'pending_validation' | 'validated' | 'failed';
  wh7: {
    id: string;
    cargo_id: string;
    kind: 'WH7_DOC';
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';
    file_url: string | null;
    file_path: string | null;
    created_at: string;
    decided_at: string | null;
    rejection_reason: string | null;
  } | null;
  exit_note: {
    id: string;
    cargo_id: string;
    kind: 'EXIT_NOTE';
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';
    file_url: string | null;
    file_path: string | null;
    created_at: string;
    decided_at: string | null;
    rejection_reason: string | null;
  } | null;
  im8: {
    id: string;
    cargo_id: string;
    kind: 'IM8';
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';
    file_url: string | null;
    file_path: string | null;
    created_at: string;
    decided_at: string | null;
    rejection_reason: string | null;
  } | null;
  validation_created_at: string | null;
  validation_completed_at: string | null;
  failure_reason: string | null;
};

export type OpsValidationQueueResponse = {
  items: OpsValidationQueueItem[];
};

export async function getOpsValidationQueue(): Promise<OpsValidationQueueResponse> {
  return await fetchJson<OpsValidationQueueResponse>('/ops/validation-queue');
}

export type OpsVerifyDocumentRequest = {
  document_id: string;
  action: 'approve' | 'reject';
  rejection_reason?: string;
};

export type OpsVerifyDocumentResponse = {
  ok: boolean;
};

export async function verifyDocument(payload: OpsVerifyDocumentRequest): Promise<OpsVerifyDocumentResponse> {
  return await fetchJson<OpsVerifyDocumentResponse>('/ops/verify-document', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export type OpsSignedUrlResponse = {
  url: string;
  kind: 'drive' | 'storage';
  expires_in?: number;
};

export async function getOpsDocumentSignedUrl(documentId: string): Promise<OpsSignedUrlResponse> {
  return await fetchJson<OpsSignedUrlResponse>(`/ops/documents/${encodeURIComponent(documentId)}/signed-url`);
}

export async function getOpsApprovalSignedUrl(approvalId: string): Promise<OpsSignedUrlResponse> {
  return await fetchJson<OpsSignedUrlResponse>(`/ops/approvals/${encodeURIComponent(approvalId)}/signed-url`);
}

export type OpsClientsResponse = {
  clients: Array<{ id: string; name: string }>;
};

export async function getOpsClients(category?: string): Promise<OpsClientsResponse> {
  const path = category ? `/ops/clients?category=${encodeURIComponent(category)}` : '/ops/clients';
  return await fetchJson<OpsClientsResponse>(path);
}

export type OpsCreateClientRequest = {
  name: string;
  email: string;
  password: string;
  tin: string;
  price_per_dmc: 118000 | 142600;
};

export type OpsCreateClientResponse = {
  client: { id: string; name: string };
  user: { id: string; email: string };
};

export async function deleteOpsClient(clientId: string): Promise<{ ok: true }> {
  return await fetchJson<{ ok: true }>(`/ops/clients/${encodeURIComponent(clientId)}`, {
    method: 'DELETE',
  });
}

export async function addOpsClientUser(clientId: string, email: string, password: string): Promise<{ ok: true; userId: string; email: string }> {
  return await fetchJson<{ ok: true; userId: string; email: string }>(`/ops/clients/${encodeURIComponent(clientId)}/users`, {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function createOpsClient(payload: OpsCreateClientRequest): Promise<OpsCreateClientResponse> {
  return await fetchJson<OpsCreateClientResponse>('/ops/clients', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export type OpsCreateCargoRequest = {
  client_id: string;
  container_id: string;
  container_number: string;
  expected_arrival_date: string;
  category: 'ELECTRONICS' | 'RAW_MATERIALS' | 'MEDS_BEVERAGE';
  clearance_pathway?: 'PORT_CLEARANCE' | 'T1_TRANSIT';
  required_documents: string[];
  container_count?: number;
  destination?: string | null;
  origin?: string | null;
  bill_of_lading?: string | null;
};

export type OpsBulkCreateCargoRequest = {
  client_id: string;
  bill_of_lading: string;
  expected_arrival_date: string;
  category: 'ELECTRONICS' | 'RAW_MATERIALS' | 'MEDS_BEVERAGE';
  clearance_pathway?: 'PORT_CLEARANCE' | 'T1_TRANSIT';
  required_documents: string[];
  container_count: number;
  destination?: string | null;
  origin?: string | null;
};

export type OpsCreateCargoResponse = { cargo_id: string; container_id: string | null };

export async function createOpsCargo(payload: OpsCreateCargoRequest): Promise<OpsCreateCargoResponse> {
  return await fetchJson<OpsCreateCargoResponse>('/ops/cargo', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function createOpsCargoBulk(payload: OpsBulkCreateCargoRequest): Promise<{ cargos: { id: string }[]; bill_of_lading: string }> {
  return await fetchJson<{ cargos: { id: string }[]; bill_of_lading: string }>('/ops/cargo/bulk', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export type OpsDeleteCargoResponse = { ok: boolean; cargo_id: string };

export async function deleteOpsCargo(cargoId: string): Promise<OpsDeleteCargoResponse> {
  return await fetchJson<OpsDeleteCargoResponse>(`/ops/cargo/${encodeURIComponent(cargoId)}`, {
    method: 'DELETE',
  });
}

export async function deleteOpsCargoGroup(billOfLading: string): Promise<{ ok: boolean; bill_of_lading: string; deleted: number }> {
  return await fetchJson<{ ok: boolean; bill_of_lading: string; deleted: number }>(
    `/ops/cargo-group/${encodeURIComponent(billOfLading)}`,
    {
      method: 'DELETE',
    }
  );
}

export type OpsCreateApprovalUploadUrlRequest = {
  kind: 'ASSESSMENT' | 'DECLARATION_DRAFT' | 'WH7_DOC' | 'EXIT_NOTE' | 'IM8';
  file_name: string;
};

export type OpsCreateApprovalUploadUrlResponse = {
  path: string;
  upload_url: string;
  expires_in?: number;
  approval_id?: string;
};

export async function createOpsApprovalUploadUrl(
  cargoId: string,
  payload: OpsCreateApprovalUploadUrlRequest
): Promise<OpsCreateApprovalUploadUrlResponse> {
  return await fetchJson<OpsCreateApprovalUploadUrlResponse>(
    `/ops/cargo/${encodeURIComponent(cargoId)}/approvals/upload-url`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    }
  );
}

export type OpsCreateCargoApprovalRequest = {
  kind: 'ASSESSMENT' | 'DECLARATION_DRAFT' | 'WH7_DOC' | 'EXIT_NOTE' | 'IM8';
  file_url?: string | null;
  file_path?: string | null;
  notes?: string | null;
};

export type OpsCreateCargoApprovalResponse = {
  approval: {
    id: string;
    cargo_id: string;
    kind: 'ASSESSMENT' | 'DECLARATION_DRAFT' | 'WH7_DOC' | 'EXIT_NOTE' | 'IM8';
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';
    file_url: string | null;
    file_path: string | null;
    notes: string | null;
    created_at: string;
    created_by: string;
    decided_at: string | null;
    decided_by: string | null;
    rejection_reason: string | null;
  };
};

export async function createOpsCargoApproval(
  cargoId: string,
  payload: OpsCreateCargoApprovalRequest
): Promise<OpsCreateCargoApprovalResponse> {
  return await fetchJson<OpsCreateCargoApprovalResponse>(`/ops/cargo/${encodeURIComponent(cargoId)}/approvals`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export type EmailIntakeSetupGuide = {
  tenant_id: string;
  tenant_name: string | null;
  tenant_subdomain: string | null;
  forward_to: string;
  forward_local: string;
  intake_domain: string;
  webhook_url_hint: string;
  pipeline: { inbound_enabled: boolean; provider_hint: string };
  filter_keywords: string[];
  filter_extensions: string[];
  gmail_admin_steps: string[];
  exchange_admin_steps: string[];
  recommended_workflow: string;
  ops_forward_steps: string[];
  clients: Array<{
    id: string;
    name: string;
    billing_email: string | null;
    forward_to: string;
  }>;
  selected_client: {
    id: string;
    name: string;
    billing_email: string | null;
    forward_to: string;
    sql_hint: string;
    ops_sop_email: { subject: string; body: string };
    client_letter_email: { subject: string; body: string };
    it_email_template: { subject: string; body: string };
    packet_html: string;
    client_packet_html: string;
  } | null;
};

export async function getEmailIntakeSetup(clientId?: string): Promise<EmailIntakeSetupGuide> {
  const q = clientId ? `?client_id=${encodeURIComponent(clientId)}` : '';
  return await fetchJson<EmailIntakeSetupGuide>(`/ops/email-intake/setup${q}`);
}

export async function patchEmailIntakeClientBillingEmail(
  clientId: string,
  billingEmail: string,
): Promise<{ ok: boolean; client_id: string; billing_email: string }> {
  return await fetchJson(`/ops/email-intake/clients/${encodeURIComponent(clientId)}`, {
    method: 'PATCH',
    body: JSON.stringify({ billing_email: billingEmail }),
  });
}

export async function testEmailIntakeRoute(
  clientId?: string,
  fromEmail?: string,
): Promise<{
  ok: boolean;
  dry_run: boolean;
  forward_to: string;
  from_email: string;
  route: Record<string, unknown>;
  pipeline: { inbound_enabled: boolean; webhook_configured: boolean };
  hint: string;
}> {
  return await fetchJson('/ops/email-intake/test', {
    method: 'POST',
    body: JSON.stringify({ client_id: clientId, from_email: fromEmail }),
  });
}

// ── Ops WhatsApp numbers management ──

export type OpsNumber = {
  id: string;
  phone_number: string;
  role: 'ops' | 'company_admin';
  label: string | null;
  created_at: string;
};

export type ListOpsNumbersResponse = {
  numbers: OpsNumber[];
};

export async function listOpsNumbers(): Promise<ListOpsNumbersResponse> {
  return await fetchJson<ListOpsNumbersResponse>('/ops/tenant/ops-numbers');
}

export type AddOpsNumberInput = {
  phone_number: string;
  role: 'ops' | 'company_admin';
  label?: string;
};

export type AddOpsNumberResponse = {
  number: OpsNumber;
};

export async function addOpsNumber(input: AddOpsNumberInput): Promise<AddOpsNumberResponse> {
  return await fetchJson<AddOpsNumberResponse>('/ops/tenant/ops-numbers', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export type UpdateOpsNumberInput = {
  role?: 'ops' | 'company_admin';
  label?: string | null;
};

export async function updateOpsNumber(id: string, input: UpdateOpsNumberInput): Promise<{ ok: true }> {
  return await fetchJson<{ ok: true }>(`/ops/tenant/ops-numbers/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export async function deleteOpsNumber(id: string): Promise<{ ok: true }> {
  return await fetchJson<{ ok: true }>(`/ops/tenant/ops-numbers/${id}`, {
    method: 'DELETE',
  });
}
