import { useEffect, useMemo, useState } from 'react';
import { getOpsClients } from '@/app/api/ops';
import { fetchJson } from '@/app/api/client';

type Category = 'MEDS_BEVERAGE' | 'RAW_MATERIALS' | 'ELECTRONICS';
type StartingMilestone = 'DOCS_UPLOADED' | 'DOCS_VERIFIED' | 'DEPARTED_PORT' | 'IN_ROUTE_RUSUMO' | 'PHYSICAL_VERIFICATION' | 'WAREHOUSE_ARRIVAL';

export function requiredDocsForCategory(category: Category | ''): string[] {
  if (!category) return [];
  const base = ['BILL_OF_LADING', 'COMMERCIAL_INVOICE', 'PACKING_LIST'];
  if (category === 'MEDS_BEVERAGE') return [...base, 'IMPORT_LICENSE'];
  if (category === 'RAW_MATERIALS') return base;
  return [...base, 'TYPE_APPROVAL'];
}

const POST_DEPARTURE_MILESTONES: StartingMilestone[] = ['DEPARTED_PORT', 'IN_ROUTE_RUSUMO', 'PHYSICAL_VERIFICATION', 'WAREHOUSE_ARRIVAL'];

export function useImportCargo() {
  const [isGroupImport, setIsGroupImport] = useState(false);
  const [containerCount, setContainerCount] = useState(2);
  const [category, setCategory] = useState<Category | ''>('');
  const [clearancePathway, setClearancePathway] = useState<'PORT_CLEARANCE' | 'T1_TRANSIT'>('PORT_CLEARANCE');
  const [serviceScope, setServiceScope] = useState<'LOGISTICS_AND_CLEARING' | 'CLEARING_ONLY'>('LOGISTICS_AND_CLEARING');
  const [dmc, setDmc] = useState('');
  const [price, setPrice] = useState('0');
  const [revenue, setRevenue] = useState('0');
  const [cost, setCost] = useState('0');
  const [duePaymentDate, setDuePaymentDate] = useState('');

  const [clients, setClients] = useState<Array<{ id: string; name: string }>>([]);
  const [loadingClients, setLoadingClients] = useState(true);

  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedCargoId, setSelectedCargoId] = useState('');

  const [milestoneCompletedAt, setMilestoneCompletedAt] = useState('');
  const [startingMilestone, setStartingMilestone] = useState<StartingMilestone>('DOCS_UPLOADED');
  const [milestoneByContainer, setMilestoneByContainer] = useState<Record<string, StartingMilestone>>({});

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showFinance, setShowFinance] = useState(false);

  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, File>>({});
  const [notAvailableDocs, setNotAvailableDocs] = useState<Record<string, boolean>>({});
  const [draggedOver, setDraggedOver] = useState<string | null>(null);

  const [showAssessmentForm, setShowAssessmentForm] = useState(false);
  const [customsFilesByContainer, setCustomsFilesByContainer] = useState<Record<string, Record<string, File>>>({});
  const [notAvailableCustomsByContainer, setNotAvailableCustomsByContainer] = useState<Record<string, Record<string, boolean>>>({});
  const [imDocTypeByContainer, setImDocTypeByContainer] = useState<Record<string, 'IM8' | 'IM7'>>({});

  const requiredDocs = useMemo(() => requiredDocsForCategory(category), [category]);

  const customsBaseDocTypes = useMemo(() => {
    if (clearancePathway === 'T1_TRANSIT') {
      return ['DRAFT_DECLARATION', 'ASSESSMENT', 'T1', 'T1_FORM', 'WH7', 'CHANGE_OF_OWNERSHIP'];
    }
    return ['DRAFT_DECLARATION', 'ASSESSMENT', 'WH7', 'EXIT_NOTE'];
  }, [clearancePathway]);

  const previewContainerIds = useMemo(() => {
    if (!isGroupImport) return selectedCargoId.trim() ? [selectedCargoId.trim()] : [];
    const bol = selectedCargoId.trim();
    if (!bol) return [];
    return Array.from({ length: containerCount }, (_, i) => `${bol}-${String(i + 1).padStart(3, '0')}`);
  }, [isGroupImport, selectedCargoId, containerCount]);

  const setCustomsFile = (containerId: string, docType: string, file: File | null) => {
    setCustomsFilesByContainer((prev) => {
      const byContainer = { ...(prev[containerId] ?? {}) };
      if (file) byContainer[docType] = file;
      else delete byContainer[docType];
      return { ...prev, [containerId]: byContainer };
    });
  };

  const toggleCustomsNotAvailable = (containerId: string, docType: string) => {
    setNotAvailableCustomsByContainer((prev) => {
      const byContainer = { ...(prev[containerId] ?? {}) };
      if (byContainer[docType]) delete byContainer[docType];
      else byContainer[docType] = true;
      return { ...prev, [containerId]: byContainer };
    });
    setCustomsFile(containerId, docType, null);
  };

  const selectedImDocType = (containerId: string): 'IM8' | 'IM7' => imDocTypeByContainer[containerId] ?? 'IM8';

  const customsDocTypesForContainer = (containerId: string) =>
    clearancePathway === 'T1_TRANSIT'
      ? [...customsBaseDocTypes, selectedImDocType(containerId)]
      : customsBaseDocTypes;

  const milestoneNeedsCustoms = (milestone: StartingMilestone) => POST_DEPARTURE_MILESTONES.includes(milestone);

  const needsAssessment = useMemo(() => {
    if (!previewContainerIds.length) return milestoneNeedsCustoms(startingMilestone);
    return previewContainerIds.some((id) => milestoneNeedsCustoms(milestoneByContainer[id] ?? startingMilestone));
  }, [previewContainerIds, milestoneByContainer, startingMilestone]);

  const stepTitles = ['Cargo Details', 'Documents', 'Customs Clearance', 'Review'];
  const currentStep = !showUploadForm ? 0 : !showAssessmentForm ? 1 : needsAssessment ? 2 : 3;

  const milestoneDateLabel = useMemo(() => {
    switch (startingMilestone) {
      case 'DOCS_UPLOADED': return 'Docs Uploaded At (optional)';
      case 'DOCS_VERIFIED': return 'Docs Verified At (optional)';
      case 'DEPARTED_PORT': return 'Departed from Port At (optional)';
      case 'IN_ROUTE_RUSUMO': return 'Started Route to Rusumo At (optional)';
      case 'PHYSICAL_VERIFICATION': return 'Physical Verification At (optional)';
      case 'WAREHOUSE_ARRIVAL': return 'Warehouse Arrival At (optional)';
      default: return 'Milestone Completed At (optional)';
    }
  }, [startingMilestone]);

  const cargoIdPlaceholder = category ? `Enter cargo ID (${category})` : 'Enter cargo ID';

  useEffect(() => {
    if (!previewContainerIds.length) return;
    setMilestoneByContainer((prev) => {
      const next = { ...prev };
      for (const id of previewContainerIds) {
        if (next[id] == null) next[id] = startingMilestone;
      }
      return next;
    });
  }, [previewContainerIds, startingMilestone]);

  useEffect(() => {
    if (!previewContainerIds.length) return;
    setImDocTypeByContainer((prev) => {
      const next = { ...prev };
      for (const id of previewContainerIds) {
        if (next[id] == null) next[id] = 'IM8';
      }
      return next;
    });
  }, [previewContainerIds]);

  useEffect(() => {
    (async () => {
      try {
        setLoadingClients(true);
        setError(null);
        const res = await getOpsClients();
        setClients(res.clients ?? []);
      } catch (e) {
        setError(String(e));
      } finally {
        setLoadingClients(false);
      }
    })();
  }, []);

  const onProceed = () => {
    setError(null);
    if (!category) return setError('Select a category');
    if (!selectedClientId) return setError('Select a client');
    if (!selectedCargoId.trim()) return setError('Enter a cargo ID');
    setShowUploadForm(true);
  };

  const onProceedToAssessment = () => {
    setError(null);
    setShowAssessmentForm(true);
  };

  const uploadFileToStorage = async (file: File, path: string): Promise<string> => {
    const signedUrlRes = await fetchJson<{ signed_url: string }>('/ops/storage/upload-url', {
      method: 'POST',
      body: JSON.stringify({ path }),
    });
    const uploadRes = await fetch(signedUrlRes.signed_url, {
      method: 'PUT',
      body: file,
      headers: { 'Content-Type': file.type },
    });
    if (!uploadRes.ok) {
      const errorText = await uploadRes.text();
      throw new Error(`Upload failed: ${errorText}`);
    }
    return path;
  };

  const onSubmit = async () => {
    setError(null);
    setSuccess(null);

    if (!category) return setError('Select a category');
    if (!selectedClientId) return setError('Select a client');
    if (!selectedCargoId.trim()) return setError('Enter a Bill of Lading / Cargo ID');
    if (isGroupImport && (containerCount < 2 || containerCount > 50)) return setError('Container count must be between 2 and 50');

    setSubmitting(true);
    try {
      const notAvailableDocsList = Object.keys(notAvailableDocs).filter(k => notAvailableDocs[k]);
      const notAvailableCustomsList: string[] = [];
      const completedAtIso = milestoneCompletedAt ? new Date(milestoneCompletedAt).toISOString() : null;

      let containerIds: string[] = [];

      if (isGroupImport) {
        const perContainerMilestones = Object.fromEntries(
          previewContainerIds.map((containerId) => [containerId, milestoneByContainer[containerId] ?? startingMilestone])
        );
        const bulkData = await fetchJson<{ containers: Array<{ cargo_id: string; container_id: string }> }>('/ops/cargo/bulk-import', {
          method: 'POST',
          body: JSON.stringify({
            client_id: selectedClientId,
            bill_of_lading: selectedCargoId.trim(),
            container_count: containerCount,
            category,
            clearance_pathway: clearancePathway,
            service_scope: serviceScope,
            dmc: dmc.trim() || null,
            price: Number(price || 0),
            revenue: Number(revenue || 0),
            cost: Number(cost || 0),
            due_payment_date: duePaymentDate || null,
            starting_milestone: perContainerMilestones[previewContainerIds[0]] ?? startingMilestone,
            container_milestones: perContainerMilestones,
            milestone_completed_at: completedAtIso,
            not_available_docs: notAvailableDocsList,
            not_available_customs_docs: notAvailableCustomsList,
            ...(clearancePathway === 'T1_TRANSIT'
              ? { im_doc_type_by_container: Object.fromEntries(previewContainerIds.map((id) => [id, selectedImDocType(id)])) }
              : {}),
          }),
        });
        containerIds = bulkData.containers.map((c) => c.container_id);
      } else {
        const data = await fetchJson<{ cargo_id: string; container_id: string }>('/ops/cargo/register', {
          method: 'POST',
          body: JSON.stringify({
            client_id: selectedClientId,
            cargo_id: selectedCargoId.trim(),
            category,
            clearance_pathway: clearancePathway,
            service_scope: serviceScope,
            dmc: dmc.trim() || null,
            price: Number(price || 0),
            revenue: Number(revenue || 0),
            cost: Number(cost || 0),
            due_payment_date: duePaymentDate || null,
            milestone_completed_at: completedAtIso,
            starting_milestone: milestoneByContainer[selectedCargoId.trim()] ?? startingMilestone,
            not_available_docs: notAvailableDocsList,
            not_available_customs_docs: notAvailableCustomsList,
            ...(clearancePathway === 'T1_TRANSIT'
              ? { im_doc_type: selectedImDocType(selectedCargoId.trim()) }
              : {}),
          }),
        });
        containerIds = [data.container_id];
      }

      for (const cargoId of containerIds) {
        for (const [docType, file] of Object.entries(uploadedFiles)) {
          const path = `cargo/${cargoId}/documents/${docType}/${file.name}`;
          await uploadFileToStorage(file, path);
          await fetchJson(`/ops/cargo/${cargoId}/documents/${docType}`, {
            method: 'PATCH',
            body: JSON.stringify({ client_id: selectedClientId, provider_path: path, status: 'VERIFIED', import_mode: true }),
          });
        }
        if (needsAssessment) {
          const containerFiles = customsFilesByContainer[cargoId] ?? {};
          const containerNotAvailable = notAvailableCustomsByContainer[cargoId] ?? {};
          const containerMilestone = milestoneByContainer[cargoId] ?? startingMilestone;
          if (!milestoneNeedsCustoms(containerMilestone)) continue;
          const containerCustomsDocTypes = customsDocTypesForContainer(cargoId);
          for (const docType of containerCustomsDocTypes) {
            const file = containerFiles[docType];
            if (file && !containerNotAvailable[docType]) {
              const path = `cargo/${cargoId}/documents/${docType}/${file.name}`;
              await uploadFileToStorage(file, path);
              await fetchJson(`/ops/cargo/${cargoId}/documents/${docType}`, {
                method: 'PATCH',
                body: JSON.stringify({ client_id: selectedClientId, provider_path: path, status: 'VERIFIED', import_mode: true }),
              });
            }
          }
        }
      }

      const label = isGroupImport
        ? `${containerCount} containers registered under BoL ${selectedCargoId.trim()}: ${containerIds.join(', ')}`
        : `Cargo ${selectedCargoId.trim()} registered successfully`;
      setSuccess(label + (needsAssessment ? ' with customs clearance documents' : ''));

      setShowUploadForm(false);
      setShowAssessmentForm(false);
      setUploadedFiles({});
      setNotAvailableDocs({});
      setCustomsFilesByContainer({});
      setNotAvailableCustomsByContainer({});
      setMilestoneByContainer({});
      setImDocTypeByContainer({});
      setSelectedCargoId('');
      setMilestoneCompletedAt('');
      setContainerCount(2);
    } catch (e) {
      const errorMsg = String(e);
      if (errorMsg.includes('already_exists') || errorMsg.includes('409')) {
        setError(`Cargo "${selectedCargoId}" already exists in the system.`);
      } else if (errorMsg.includes('signed_upload_failed')) {
        setError('File upload failed. Please check your internet connection and try again.');
      } else if (errorMsg.includes('missing_field')) {
        setError('Please fill in all required fields before submitting.');
      } else if (errorMsg.includes('404') || errorMsg.includes('not_found')) {
        setError('API endpoint not found. Please contact support.');
      } else {
        setError(`Registration failed: ${errorMsg}`);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setShowUploadForm(false);
    setShowAssessmentForm(false);
    setUploadedFiles({});
    setNotAvailableDocs({});
    setCustomsFilesByContainer({});
    setNotAvailableCustomsByContainer({});
    setMilestoneByContainer({});
    setImDocTypeByContainer({});
    setSelectedCargoId('');
    setMilestoneCompletedAt('');
    setContainerCount(2);
    setSuccess(null);
    setError(null);
  };

  return {
    isGroupImport, setIsGroupImport,
    containerCount, setContainerCount,
    category, setCategory,
    clearancePathway, setClearancePathway,
    serviceScope, setServiceScope,
    dmc, setDmc,
    price, setPrice,
    revenue, setRevenue,
    cost, setCost,
    duePaymentDate, setDuePaymentDate,
    clients, loadingClients,
    selectedClientId, setSelectedClientId,
    selectedCargoId, setSelectedCargoId,
    milestoneCompletedAt, setMilestoneCompletedAt,
    startingMilestone, setStartingMilestone,
    milestoneByContainer, setMilestoneByContainer,
    submitting, error, setError, success, setSuccess,
    showFinance, setShowFinance,
    showUploadForm, setShowUploadForm,
    uploadedFiles, setUploadedFiles,
    notAvailableDocs, setNotAvailableDocs,
    draggedOver, setDraggedOver,
    showAssessmentForm, setShowAssessmentForm,
    customsFilesByContainer, setCustomsFilesByContainer,
    notAvailableCustomsByContainer, setNotAvailableCustomsByContainer,
    imDocTypeByContainer, setImDocTypeByContainer,
    requiredDocs, customsBaseDocTypes, previewContainerIds,
    setCustomsFile, toggleCustomsNotAvailable,
    selectedImDocType, customsDocTypesForContainer,
    milestoneNeedsCustoms, needsAssessment,
    stepTitles, currentStep,
    milestoneDateLabel, cargoIdPlaceholder,
    onProceed, onProceedToAssessment,
    onSubmit, resetForm,
  };
}
