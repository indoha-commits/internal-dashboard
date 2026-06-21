export const USE_MOCK_DATA = import.meta.env.VITE_USE_MOCK_DATA === 'true';

const now = new Date();
const daysAgo = (n: number) => new Date(now.getTime() - n * 86400000).toISOString();
const hoursAgo = (n: number) => new Date(now.getTime() - n * 3600000).toISOString();

const mockClients = [
  { id: 'client-001', name: 'Rwanda Trading Co' },
  { id: 'client-002', name: 'Kigali Logistics Ltd' },
  { id: 'client-003', name: 'East Africa Imports' },
];

export const MOCK_DASHBOARD = {
  kpis: {
    pending_documents: 12,
    pending_validation: 5,
    awaiting_upload: 8,
    failed_validation: 2,
  },
  urgent_documents: [
    { id: 'doc-001', cargo_id: 'CARGO-2024-001', document_type: 'BILL_OF_LADING', status: 'UPLOADED', drive_url: null, uploaded_at: daysAgo(3), client_id: 'client-001', client_name: 'Rwanda Trading Co' },
    { id: 'doc-002', cargo_id: 'CARGO-2024-002', document_type: 'PACKING_LIST', status: 'UPLOADED', drive_url: null, uploaded_at: daysAgo(5), client_id: 'client-002', client_name: 'Kigali Logistics Ltd' },
    { id: 'doc-003', cargo_id: 'CARGO-2024-003', document_type: 'INVOICE', status: 'UPLOADED', drive_url: null, uploaded_at: daysAgo(7), client_id: 'client-003', client_name: 'East Africa Imports' },
  ],
};

export const MOCK_PENDING_DOCUMENTS = {
  documents: [
    { id: 'pd-001', cargo_id: 'CARGO-2024-001', bill_of_lading: 'BL-2024-001', document_type: 'BILL_OF_LADING', status: 'UPLOADED', drive_url: null, uploaded_at: daysAgo(2), client_id: 'client-001', client_name: 'Rwanda Trading Co' },
    { id: 'pd-002', cargo_id: 'CARGO-2024-001', bill_of_lading: 'BL-2024-001', document_type: 'PACKING_LIST', status: 'UPLOADED', drive_url: null, uploaded_at: daysAgo(2), client_id: 'client-001', client_name: 'Rwanda Trading Co' },
    { id: 'pd-003', cargo_id: 'CARGO-2024-002', bill_of_lading: 'BL-2024-002', document_type: 'INVOICE', status: 'UPLOADED', drive_url: null, uploaded_at: daysAgo(1), client_id: 'client-002', client_name: 'Kigali Logistics Ltd' },
  ],
};

export const MOCK_VALIDATION_QUEUE = {
  items: [
    {
      cargo_id: 'CARGO-2024-001',
      client_name: 'Rwanda Trading Co',
      client_id: 'client-001',
      validation_status: 'pending_upload',
      validation_created_at: daysAgo(4),
      validation_completed_at: null,
      documents: [
        { id: 'doc-001', document_type: 'BILL_OF_LADING', status: 'VERIFIED', uploaded_at: daysAgo(3), drive_url: null },
        { id: 'doc-002', document_type: 'PACKING_LIST', status: 'VERIFIED', uploaded_at: daysAgo(3), drive_url: null },
      ],
      assessment: null,
      draft: null,
      wh7: null,
      exit_note: null,
      im8: null,
    },
    {
      cargo_id: 'CARGO-2024-002',
      client_name: 'Kigali Logistics Ltd',
      client_id: 'client-002',
      validation_status: 'pending_validation',
      validation_created_at: daysAgo(2),
      validation_completed_at: null,
      documents: [
        { id: 'doc-003', document_type: 'INVOICE', status: 'VERIFIED', uploaded_at: daysAgo(1), drive_url: null },
      ],
      assessment: { id: 'app-001', kind: 'ASSESSMENT', status: 'PENDING', file_path: '/mock/assessment.pdf', file_url: null, created_at: hoursAgo(12), decided_at: null, rejection_reason: null },
      draft: { id: 'app-002', kind: 'DECLARATION_DRAFT', status: 'PENDING', file_path: '/mock/draft.pdf', file_url: null, created_at: hoursAgo(10), decided_at: null, rejection_reason: null },
      wh7: null,
      exit_note: null,
      im8: null,
    },
    {
      cargo_id: 'CARGO-2024-003',
      client_name: 'East Africa Imports',
      client_id: 'client-003',
      validation_status: 'validated',
      validation_created_at: daysAgo(10),
      validation_completed_at: daysAgo(8),
      documents: [
        { id: 'doc-005', document_type: 'BILL_OF_LADING', status: 'VERIFIED', uploaded_at: daysAgo(9), drive_url: null },
      ],
      assessment: { id: 'app-003', kind: 'ASSESSMENT', status: 'APPROVED', file_path: '/mock/assessment.pdf', file_url: null, created_at: daysAgo(9), decided_at: daysAgo(8), rejection_reason: null },
      draft: { id: 'app-004', kind: 'DECLARATION_DRAFT', status: 'APPROVED', file_path: '/mock/draft.pdf', file_url: null, created_at: daysAgo(9), decided_at: daysAgo(8), rejection_reason: null },
      wh7: { id: 'app-005', kind: 'WH7_DOC', status: 'APPROVED', file_path: '/mock/wh7.pdf', file_url: null, created_at: daysAgo(8), decided_at: daysAgo(7), rejection_reason: null },
      exit_note: { id: 'app-006', kind: 'EXIT_NOTE', status: 'PENDING', file_path: '/mock/exit.pdf', file_url: null, created_at: daysAgo(7), decided_at: null, rejection_reason: null },
      im8: null,
    },
  ],
};

export const MOCK_CARGO_REGISTRY = {
  groups: [
    {
      bill_of_lading: 'BL-2024-001',
      client_id: 'client-001',
      client_name: 'Rwanda Trading Co',
      category: 'ELECTRONICS',
      container_count: 3,
      origin: 'Mombasa, KE',
      destination: 'Kigali, RW',
      route: 'Mombasa → Kigali',
      vessel: 'MV Maersk Kigali',
      expected_arrival_date: daysAgo(7),
      eta: daysAgo(3),
      created_at: daysAgo(20),
      updated_at: daysAgo(3),
      cargos: [
        { cargo_id: 'CARGO-2024-001', cargo_uuid: 'uuid-001', created_at: daysAgo(20), latest_event_type: 'WAREHOUSE_ARRIVAL', latest_event_time: daysAgo(3) },
        { cargo_id: 'CARGO-2024-001-A', cargo_uuid: 'uuid-001a', created_at: daysAgo(20), latest_event_type: 'IN_TRANSIT', latest_event_time: daysAgo(5) },
      ],
    },
    {
      bill_of_lading: 'BL-2024-002',
      client_id: 'client-002',
      client_name: 'Kigali Logistics Ltd',
      category: 'RAW_MATERIALS',
      container_count: 2,
      origin: 'Dar es Salaam, TZ',
      destination: 'Kigali, RW',
      route: 'Dar es Salaam → Kigali',
      vessel: null,
      expected_arrival_date: daysAgo(2),
      eta: daysAgo(1),
      created_at: daysAgo(15),
      updated_at: daysAgo(1),
      cargos: [
        { cargo_id: 'CARGO-2024-002', cargo_uuid: 'uuid-002', created_at: daysAgo(15), latest_event_type: 'PHYSICAL_VERIFICATION', latest_event_time: daysAgo(1) },
      ],
    },
  ],
};

export const MOCK_CLIENTS = {
  clients: mockClients,
};

export const MOCK_REQUESTS = {
  requests: [
    { id: 'req-001', client_id: 'client-001', client_name: 'Rwanda Trading Co', status: 'pending', file_path: '/mock/bl.pdf', file_name: 'bill_of_lading.pdf', bill_of_lading: 'BL-2024-003', cargo_id: null, created_at: hoursAgo(6), approved_at: null, rejection_reason: null, from_number: '+250788123456', linked: true },
    { id: 'req-002', client_id: null, client_name: null, status: 'pending', file_path: '/mock/bl2.pdf', file_name: 'document.pdf', bill_of_lading: null, cargo_id: null, created_at: hoursAgo(2), approved_at: null, rejection_reason: null, from_number: '+250788654321', linked: false },
  ],
};

export const MOCK_CARGO_TIMELINE = {
  cargo: { id: 'CARGO-2024-001', client_name: 'Rwanda Trading Co', category: 'ELECTRONICS', created_at: daysAgo(20) },
  documents: [
    { id: 'doc-001', document_type: 'BILL_OF_LADING', status: 'VERIFIED', uploaded_at: daysAgo(18), verified_at: daysAgo(17), drive_url: null },
    { id: 'doc-002', document_type: 'PACKING_LIST', status: 'VERIFIED', uploaded_at: daysAgo(18), verified_at: daysAgo(17), drive_url: null },
    { id: 'doc-003', document_type: 'INVOICE', status: 'VERIFIED', uploaded_at: daysAgo(17), verified_at: daysAgo(16), drive_url: null },
  ],
  events: [
    { id: 'evt-001', event_type: 'CARGO_CREATED', event_time: daysAgo(20), notes: 'Cargo registered in system' },
    { id: 'evt-002', event_type: 'DOCUMENTS_UPLOADED', event_time: daysAgo(18), notes: 'All documents uploaded' },
    { id: 'evt-003', event_type: 'DOCUMENTS_VERIFIED', event_time: daysAgo(16), notes: 'Documents verified by ops' },
    { id: 'evt-004', event_type: 'WAREHOUSE_ARRIVAL', event_time: daysAgo(3), notes: 'Arrived at Kigali warehouse' },
  ],
  approvals: [
    { id: 'app-001', kind: 'ASSESSMENT', status: 'APPROVED', file_path: '/mock/assessment.pdf', file_url: null, created_at: daysAgo(15), decided_at: daysAgo(14), rejection_reason: null },
    { id: 'app-002', kind: 'DECLARATION_DRAFT', status: 'APPROVED', file_path: '/mock/draft.pdf', file_url: null, created_at: daysAgo(15), decided_at: daysAgo(14), rejection_reason: null },
  ],
};

export const MOCK_ACTIVITY_LOG = {
  rows: [
    { timestamp: hoursAgo(1), action: 'DOCUMENT_VERIFIED', actorRole: 'ops', cargoId: 'CARGO-2024-001', eventType: 'VERIFIED' },
    { timestamp: hoursAgo(3), action: 'CARGO_CREATED', actorRole: 'ops', cargoId: 'CARGO-2024-004', eventType: 'CREATED' },
    { timestamp: hoursAgo(6), action: 'VALIDATION_APPROVED', actorRole: 'ops', cargoId: 'CARGO-2024-002', eventType: 'APPROVED' },
    { timestamp: hoursAgo(12), action: 'SESSION_LOGIN', actorRole: 'ops', cargoId: null, eventType: 'LOGIN' },
  ],
};

export const MOCK_ME = {
  id: 'ops-user-001',
  email: 'ops@galaxy-logistics.com',
  role: 'ops' as const,
  client_id: null,
};

export const MOCK_SIGNED_URL = {
  url: '#',
  kind: 'storage' as const,
};
