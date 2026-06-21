import { useState } from 'react';
import { ChevronDown, Upload, File, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { SelectField } from '@/app/components/ui/select-field';
import { FormField } from '@/app/components/ui/form-field';
import { Button } from '@/app/components/ui/button';
import { useImportCargo } from '@/app/hooks/useImportCargo';

export function ImportCargoPage() {
  const {
    isGroupImport, setIsGroupImport,
    containerCount, setContainerCount,
    category, setCategory,
    clearancePathway, setClearancePathway,
    serviceScope, setServiceScope,
    dmc, setDmc, price, setPrice, revenue, setRevenue, cost, setCost,
    duePaymentDate, setDuePaymentDate,
    clients, loadingClients,
    selectedClientId, setSelectedClientId,
    selectedCargoId, setSelectedCargoId,
    milestoneCompletedAt, setMilestoneCompletedAt,
    startingMilestone, setStartingMilestone,
    milestoneByContainer,
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
  } = useImportCargo();

  const renderFileUpload = (label: string, file: File | null, setFile: (file: File | null) => void) => (
    <div className="border rounded-lg p-5" style={{ borderColor: file ? 'var(--primary)' : 'var(--border)', backgroundColor: file ? 'rgba(94,106,210,0.05)' : 'transparent' }}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <File className="w-4 h-4" />
          <span className="text-sm font-medium">{label}</span>
        </div>
        {file && <CheckCircle2 className="w-5 h-5 text-green-600" />}
      </div>
      <label className="block cursor-pointer">
        <div className="border-2 border-dashed border-default rounded-lg p-6 text-center transition-all hover:border-opacity-60">
          {file ? (
            <div className="space-y-2">
              <div className="flex items-center justify-center gap-2 text-sm font-medium" style={{ color: 'var(--primary)' }}>
                <File className="w-5 h-5" />
                <span>{file.name}</span>
              </div>
              <div className="text-xs">{(file.size / 1024).toFixed(1)} KB</div>
              <button type="button" onClick={(e) => { e.preventDefault(); setFile(null); }} className="text-xs text-red-600 hover:text-red-700 underline mt-2">Remove</button>
            </div>
          ) : (
            <div className="space-y-2">
              <Upload className="w-8 h-8 mx-auto" />
              <div className="text-sm font-medium">Click to upload {label}</div>
              <div className="text-xs">PDF, DOC, DOCX, JPG, PNG (max 10MB)</div>
            </div>
          )}
        </div>
        <input type="file" className="hidden" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" onChange={(e) => setFile(e.target.files?.[0] || null)} />
      </label>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="page-title">Import Cargo</h1>
        <p className="page-desc mt-2">
          Register a cargo already in transit. Select completed milestones and upload documents as needed.
        </p>
      </div>

      {/* Step indicator */}
      <div className="mb-8 flex items-center gap-0" role="progressbar" aria-label="Registration progress" aria-valuenow={currentStep + 1} aria-valuemax={4}>
        {stepTitles.map((title, i) => {
          const isActive = i === currentStep;
          const isPast = i < currentStep;
          return (
            <div key={title} className="flex-1 flex items-center">
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all" style={{
                backgroundColor: isActive ? 'rgba(94,106,210,0.12)' : 'transparent',
                color: isActive ? '#5e6ad2' : isPast ? '#5a5d66' : '#2e3038',
              }}>
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${isPast ? 'text-white' : ''}`} style={{
                  backgroundColor: isPast ? '#22c55e' : isActive ? '#5e6ad2' : '#1c1d20',
                  color: isPast || isActive ? '#fff' : '#2e3038',
                }}>
                  {isPast ? '✓' : i + 1}
                </span>
                <span className="hidden sm:inline whitespace-nowrap">{title}</span>
              </div>
              {i < stepTitles.length - 1 && (
                <div className="flex-1 h-px mx-2" style={{ backgroundColor: isPast ? '#22c55e' : '#1c1d20' }} />
              )}
            </div>
          );
        })}
      </div>

      {error && (
        <div className="mb-6 rounded-xl border px-5 py-4 text-sm flex items-start gap-3" style={{ borderColor: 'rgba(239,68,68,0.3)', backgroundColor: 'rgba(239,68,68,0.06)' }}>
          <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" style={{ color: '#ef4444' }} />
          <div>
            <div className="font-semibold mb-0.5" style={{ color: '#ef4444' }}>Error</div>
            <div style={{ color: '#5a5d66' }}>{error}</div>
          </div>
        </div>
      )}

      {success && (
        <div className="mb-6 rounded-xl border px-5 py-4 text-sm flex items-start gap-3" style={{ borderColor: 'rgba(34,197,94,0.3)', backgroundColor: 'rgba(34,197,94,0.06)' }}>
          <CheckCircle2 className="w-5 h-5 mt-0.5 shrink-0" style={{ color: '#22c55e' }} />
          <div>
            <div className="font-semibold mb-0.5" style={{ color: '#22c55e' }}>Success</div>
            <div style={{ color: '#5a5d66' }}>{success}</div>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-default bg-card overflow-hidden">
        {/* Step 1: Cargo Details */}
        <div className={showUploadForm ? 'hidden' : 'block'}>
          <div className="px-6 py-4 border-b border-default flex items-center gap-3" style={{ backgroundColor: 'rgba(94,106,210,0.04)' }}>
            <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ backgroundColor: '#5e6ad2' }}>1</span>
            <span className="text-sm font-semibold">Cargo Details</span>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="col-span-2 text-xs opacity-70">
                Cargo IDs are provided by your shipment records.
              </div>
              <div>
                <label className="block text-sm opacity-70 mb-2 font-medium">
                  Category
                </label>
                <div className="relative">
                  <select
                    value={category}
                    onChange={(e) => {
                      setCategory(e.target.value as any);
                      setSelectedClientId('');
                      setSelectedCargoId('');
                    }}
                    className="form-input w-full px-4 py-2.5 rounded-md border text-sm appearance-none"
                  >
                    <option value="">Select category</option>
                    <option value="MEDS_BEVERAGE">Meds &amp; Beverage</option>
                    <option value="RAW_MATERIALS">Raw Materials</option>
                    <option value="ELECTRONICS">Electronics</option>
                  </select>
                  <ChevronDown className="w-4 h-4 opacity-50 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-sm opacity-70 mb-2 font-medium">
                  Clearance Pathway
                </label>
                <div className="relative">
                  <select
                    value={clearancePathway}
                    onChange={(e) => setClearancePathway(e.target.value as any)}
                    className="form-input w-full px-4 py-2.5 rounded-md border text-sm appearance-none"
                  >
                    <option value="PORT_CLEARANCE">Port Clearance (Pay Tax at Port)</option>
                    <option value="T1_TRANSIT">T1 Transit (Pay Tax After Transport)</option>
                  </select>
                  <ChevronDown className="w-4 h-4 opacity-50 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
                <p className="text-xs opacity-60 mt-1">
                  {clearancePathway === 'PORT_CLEARANCE'
                    ? 'Customs: Draft, Assessment, WH7, Exit note'
                    : 'Customs: Draft, Assessment, T1, T1 form, WH7, IM7 or IM8'}
                </p>
              </div>

              <div>
                <label className="block text-sm opacity-70 mb-2 font-medium">
                  Service Scope
                </label>
                <div className="relative">
                  <select
                    value={serviceScope}
                    onChange={(e) => setServiceScope(e.target.value as any)}
                    className="form-input w-full px-4 py-2.5 rounded-md border text-sm appearance-none"
                  >
                    <option value="LOGISTICS_AND_CLEARING">Logistics + Clearing</option>
                    <option value="CLEARING_ONLY">Clearing only (no transport)</option>
                  </select>
                  <ChevronDown className="w-4 h-4 opacity-50 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
                <p className="text-xs opacity-60 mt-1">
                  Used for manager reporting + receivables.
                </p>
              </div>

              <div className="col-span-2">
                <label className="block text-sm opacity-70 mb-2 font-medium">
                  Client
                </label>
                {loadingClients ? (
                  <div className="flex items-center gap-2 text-sm opacity-60">Loading clients…</div>
                ) : (
                  <div className="relative">
                    <select
                      value={selectedClientId}
                      onChange={(e) => setSelectedClientId(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-md border text-sm appearance-none"
                      style={{ borderColor: 'var(--border)', backgroundColor: 'var(--background)' }}
                    >
                      <option value="">Select client</option>
                      {clients.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.id})
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 opacity-50 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                )}
              </div>

              {/* Import mode toggle */}
              <div className="flex items-center rounded-md border border-default overflow-hidden">
                <Button
                  onClick={() => setIsGroupImport(false)}
                  className={`flex-1 py-2 text-sm font-medium transition-colors rounded-none ${!isGroupImport ? '' : 'bg-transparent text-inherit hover:bg-transparent'}`}
                  style={!isGroupImport ? {} : { backgroundColor: 'transparent', color: 'inherit' }}
                >
                  Single Container
                </Button>
                <Button
                  onClick={() => setIsGroupImport(true)}
                  className={`flex-1 py-2 text-sm font-medium transition-colors rounded-none ${isGroupImport ? '' : 'bg-transparent text-inherit hover:bg-transparent'}`}
                  style={isGroupImport ? {} : { backgroundColor: 'transparent', color: 'inherit' }}
                >
                  Group Import
                </Button>
              </div>

              {/* Cargo ID / Bill of Lading */}
              <div>
                <label className="block text-sm opacity-70 mb-2 font-medium">
                  {isGroupImport ? 'Bill of Lading (shared across all containers)' : 'Cargo ID'}
                </label>
                <input
                  type="text"
                  value={selectedCargoId}
                  onChange={(e) => setSelectedCargoId(e.target.value)}
                  disabled={!selectedClientId}
                  placeholder={isGroupImport ? 'BL55207305' : cargoIdPlaceholder}
                  className="form-input w-full px-4 py-2.5 rounded-md border text-sm disabled:opacity-60"
                />
                {isGroupImport && selectedCargoId && (
                  <div className="text-xs opacity-50 mt-1">
                    Containers will be: {selectedCargoId}-001, {selectedCargoId}-002, …
                  </div>
                )}
              </div>
            </div>

            {/* Collapsible finance section */}
            <div className="mt-6 rounded-xl border border-default overflow-hidden">
              <button
                type="button"
                onClick={() => setShowFinance(v => !v)}
                className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium transition-colors hover:bg-muted/20"
              >
                <span>Finance & Reporting <span className="text-xs opacity-60">(optional)</span></span>
                <ChevronDown className={`w-4 h-4 transition-transform ${showFinance ? 'rotate-180' : ''}`} />
              </button>
              {showFinance && (
                <div className="border-t border-default p-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField label="DMC" htmlFor="dmc-input">
                      <input id="dmc-input" type="text" value={dmc} onChange={(e) => setDmc(e.target.value)} placeholder="e.g. DMC-2026-0412" className="form-input" />
                    </FormField>
                    <FormField label="Due Payment Date" htmlFor="due-date-input">
                      <input id="due-date-input" type="date" value={duePaymentDate} onChange={(e) => setDuePaymentDate(e.target.value)} className="form-input" />
                    </FormField>
                    <FormField label="Price (RWF)" htmlFor="price-input">
                      <input id="price-input" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} className="form-input" />
                    </FormField>
                    <FormField label="Revenue (RWF)" htmlFor="revenue-input">
                      <input id="revenue-input" inputMode="decimal" value={revenue} onChange={(e) => setRevenue(e.target.value)} className="form-input" />
                    </FormField>
                    <FormField label="Cost (RWF)" htmlFor="cost-input">
                      <input id="cost-input" inputMode="decimal" value={cost} onChange={(e) => setCost(e.target.value)} className="form-input" />
                    </FormField>
                    <div className="flex items-end text-xs opacity-60 pb-2">
                      Profit = Revenue − Cost (Manager Dashboard).
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Container count (group import only) */}
            {isGroupImport && (
              <div className="mt-6">
                <label className="block text-sm opacity-70 mb-2 font-medium">
                  Number of Containers
                </label>
                <input
                  type="number"
                  min={2}
                  max={50}
                  value={containerCount}
                  onChange={(e) => setContainerCount(Math.max(2, Math.min(50, parseInt(e.target.value) || 2)))}
                  className="form-input w-full px-4 py-2.5 rounded-md border text-sm"
                />
                <div className="text-xs opacity-50 mt-1">Required documents shared across all containers; customs docs per container below.</div>
              </div>
            )}

            {previewContainerIds.length > 0 && (
              <div className="mt-6 border border-default rounded-lg p-4">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div className="text-sm font-semibold">Milestone per container</div>
                  {previewContainerIds.length > 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        setMilestoneByContainer((prev) => {
                          const next = { ...prev };
                          for (const id of previewContainerIds) next[id] = startingMilestone;
                          return next;
                        })
                      }
                      className="text-xs px-3 py-1.5 rounded-md border border-default"
                      style={{ opacity: 0.9 }}
                    >
                      Apply "{startingMilestone.replace(/_/g, ' ')}" to all
                    </button>
                  )}
                </div>
                <div className="space-y-3">
                  {previewContainerIds.map((containerId) => {
                    const currentMilestone = milestoneByContainer[containerId] ?? startingMilestone;
                    return (
                      <div key={containerId} className="border border-default rounded-md p-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="font-mono text-sm">{containerId}</div>
                        </div>
                        <div className="mt-3">
                          <SelectField
                            value={currentMilestone}
                            onChange={(e) =>
                              setMilestoneByContainer((prev) => ({
                                ...prev,
                                [containerId]: e.target.value as StartingMilestone,
                              }))
                            }
                          >
                            <option value="DOCS_UPLOADED">Docs Uploaded</option>
                            <option value="DOCS_VERIFIED">Docs Verified</option>
                            <option value="DEPARTED_PORT">Departed from Port</option>
                            <option value="IN_ROUTE_RUSUMO">In Route to Rusumo</option>
                            <option value="PHYSICAL_VERIFICATION">Physical Verification</option>
                            <option value="WAREHOUSE_ARRIVAL">Warehouse Arrival</option>
                          </SelectField>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="mt-6">
              <label className="block text-sm opacity-70 mb-2 font-medium">
                {milestoneDateLabel}
              </label>
              <input
                type="datetime-local"
                value={milestoneCompletedAt}
                onChange={(e) => setMilestoneCompletedAt(e.target.value)}
                className="form-input w-full px-4 py-2.5 rounded-md border text-sm"
              />
              <p className="text-xs opacity-60 mt-1">Optional. Leave blank to use current date/time.</p>
            </div>

            <div className="mt-6">
              <label className="block text-sm opacity-70 mb-2 font-medium">
                Starting Milestone
              </label>
              <div className="relative">
                <select
                  value={startingMilestone}
                  onChange={(e) => setStartingMilestone(e.target.value as any)}
                  className="form-input w-full px-4 py-2.5 rounded-md border text-sm appearance-none"
                >
                  <option value="DOCS_UPLOADED">Docs Uploaded</option>
                  <option value="DOCS_VERIFIED">Docs Verified</option>
                  <option value="DEPARTED_PORT">Departed from Port</option>
                  <option value="IN_ROUTE_RUSUMO">In Route to Rusumo</option>
                  <option value="PHYSICAL_VERIFICATION">Physical Verification</option>
                  <option value="WAREHOUSE_ARRIVAL">Warehouse Arrival</option>
                </select>
                <ChevronDown className="w-4 h-4 opacity-50 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            <div className="mt-6">
              <div className="text-xs opacity-60 mb-2">Required document folders</div>
              <div className="flex flex-wrap gap-2">
                {requiredDocs.length === 0 ? (
                  <span className="text-xs opacity-60">Select a category to preview required folders.</span>
                ) : (
                  requiredDocs.map((d) => (
                    <span
                      key={d}
                      className="text-xs px-2 py-1 rounded-md border border-default"
                    >
                      {d}
                    </span>
                  ))
                )}
              </div>
            </div>

            <div className="flex justify-end pt-6">
              <Button
                onClick={onProceed}
              >
                Proceed to Upload Documents
              </Button>
            </div>
          </div>
        </div>

        {/* Step 2: Documents */}
        <div className={!showUploadForm || showAssessmentForm ? 'hidden' : 'block'}>
          <div className="px-6 py-4 border-b border-default flex items-center gap-3" style={{ backgroundColor: 'rgba(94,106,210,0.04)' }}>
            <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ backgroundColor: '#5e6ad2' }}>2</span>
            <span className="text-sm font-semibold">Upload Required Documents</span>
          </div>
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm opacity-60">
                  {startingMilestone === 'DOCS_UPLOADED' 
                    ? 'Upload the required documents for this cargo.'
                    : 'Documents are marked as verified. You can upload them now or skip.'}
                </p>
              </div>
              <div className="badge-primary text-sm font-medium px-4 py-2 rounded-lg">
                {Object.keys(uploadedFiles).length + Object.keys(notAvailableDocs).filter(k => notAvailableDocs[k]).length} / {requiredDocs.length} handled
              </div>
            </div>
            
            {/* Progress bar */}
            <div className="mb-6">
              <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                <div 
                  className="h-full transition-all duration-300 rounded-full"
                  style={{ 
                    width: `${((Object.keys(uploadedFiles).length + Object.keys(notAvailableDocs).filter(k => notAvailableDocs[k]).length) / requiredDocs.length) * 100}%`,
                    backgroundColor: 'var(--primary)'
                  }}
                />
              </div>
            </div>
            
            <div className="space-y-4">
              {requiredDocs.map((docType) => {
                const isNotAvailable = notAvailableDocs[docType] === true;
                const hasFile = !!uploadedFiles[docType];
                const borderColor = isNotAvailable
                  ? 'rgb(239,68,68)'
                  : hasFile
                      ? 'var(--primary)'
                    : 'var(--border)';
                const bgColor = isNotAvailable
                  ? 'rgba(239,68,68,0.05)'
                  : hasFile
                    ? 'rgba(212,175,55,0.05)'
                    : 'transparent';

                return (
                <div key={docType} className="border rounded-lg p-5 transition-all hover:border-opacity-80" style={{ borderColor, backgroundColor: bgColor }}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <File className="w-4 h-4 opacity-60" />
                      <span className="text-sm font-medium">{docType}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {isNotAvailable && (
                        <span className="text-xs px-2 py-0.5 rounded-md font-medium" style={{ backgroundColor: 'rgba(239,68,68,0.15)', color: 'rgb(239,68,68)' }}>
                          Not Available
                        </span>
                      )}
                      {hasFile && !isNotAvailable && (
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          if (isNotAvailable) {
                            setNotAvailableDocs(prev => { const n = { ...prev }; delete n[docType]; return n; });
                          } else {
                            setNotAvailableDocs(prev => ({ ...prev, [docType]: true }));
                            setUploadedFiles(prev => { const n = { ...prev }; delete n[docType]; return n; });
                          }
                        }}
                        className="text-xs px-2 py-1 rounded-md border transition-colors"
                        style={{
                          borderColor: isNotAvailable ? 'rgb(239,68,68)' : 'var(--border)',
                          color: isNotAvailable ? 'rgb(239,68,68)' : 'inherit',
                          opacity: 0.8,
                        }}
                        title="Mark this document as not available"
                      >
                        {isNotAvailable ? 'Undo' : 'Not Available'}
                      </button>
                    </div>
                  </div>

                  {isNotAvailable ? (
                    <div className="border-2 border-dashed rounded-lg p-4 text-center" style={{ borderColor: 'rgb(239,68,68)', backgroundColor: 'rgba(239,68,68,0.04)' }}>
                      <div className="text-sm opacity-70">This document is marked as not available and will be visible to the client.</div>
                    </div>
                  ) : (
                  <label 
                    className="block cursor-pointer"
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDraggedOver(docType);
                    }}
                    onDragLeave={() => setDraggedOver(null)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDraggedOver(null);
                      const file = e.dataTransfer.files?.[0];
                      if (file) {
                        setUploadedFiles(prev => ({ ...prev, [docType]: file }));
                      }
                    }}
                  >
                    <div 
                      className="border-2 border-dashed rounded-lg p-6 text-center transition-all hover:border-opacity-60 hover:bg-opacity-50" 
                      style={{ 
                        borderColor: draggedOver === docType ? 'var(--primary)' : 'var(--border)', 
                        backgroundColor: draggedOver === docType ? 'rgba(212, 175, 55, 0.1)' : 'var(--background)',
                        transform: draggedOver === docType ? 'scale(1.02)' : 'scale(1)'
                      }}
                    >
                      {uploadedFiles[docType] ? (
                        <div className="space-y-2">
                          <div className="flex items-center justify-center gap-2 text-sm font-medium" style={{ color: 'var(--primary)' }}>
                            <File className="w-5 h-5" />
                            <span>{uploadedFiles[docType].name}</span>
                          </div>
                          <div className="text-xs opacity-60">
                            {(uploadedFiles[docType].size / 1024).toFixed(1)} KB
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              setUploadedFiles(prev => {
                                const newFiles = { ...prev };
                                delete newFiles[docType];
                                return newFiles;
                              });
                            }}
                            className="text-xs text-red-600 hover:text-red-700 underline mt-2"
                          >
                            Remove
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Upload className="w-8 h-8 mx-auto opacity-40" />
                          <div className="text-sm font-medium opacity-70">
                            Click to upload or drag and drop
                          </div>
                          <div className="text-xs opacity-50">
                            PDF, DOC, DOCX, JPG, PNG (max 10MB)
                          </div>
                        </div>
                      )}
                    </div>
                    <input
                      type="file"
                      className="hidden"
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setUploadedFiles(prev => ({ ...prev, [docType]: file }));
                        }
                      }}
                    />
                  </label>
                  )}
                </div>
                );
              })}
            </div>

            <div className="flex gap-3 justify-end pt-6">
              <button
                type="button"
                onClick={() => {
                  setShowUploadForm(false);
                  setUploadedFiles({});
                }}
                className="px-5 py-2.5 rounded-md border border-default text-sm"
              >
                Back
              </button>
              {needsAssessment ? (
                <Button
                  onClick={onProceedToAssessment}
                >
                  Next: Customs clearance
                </Button>
              ) : (
                <Button
                  onClick={() => void onSubmit()}
                  disabled={submitting}
                >
                  {submitting ? 'Saving…' : 'Register Cargo'}
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Step 3: Customs Clearance */}
        <div className={!showAssessmentForm ? 'hidden' : 'block'}>
          <div className="px-6 py-4 border-b border-default flex items-center gap-3" style={{ backgroundColor: 'rgba(94,106,210,0.04)' }}>
            <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ backgroundColor: '#5e6ad2' }}>3</span>
            <span className="text-sm font-semibold">Customs Clearance</span>
          </div>
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm opacity-60">
                  Port: draft, assessment, WH7, exit note. T1: same through WH7, then T1, T1 form, and IM7 or IM8 (choose per suffix). Each row is one container ID.
                </p>
              </div>
              <div className="badge-primary text-sm font-medium px-4 py-2 rounded-lg">
                {previewContainerIds.length} container{previewContainerIds.length === 1 ? '' : 's'}
              </div>
            </div>

            <div className="space-y-4">
              {previewContainerIds.map((containerId) => {
                const containerFiles = customsFilesByContainer[containerId] ?? {};
                const containerNA = notAvailableCustomsByContainer[containerId] ?? {};
                const activeDocTypes = customsDocTypesForContainer(containerId);
                const handledCount = activeDocTypes.filter((docType) => Boolean(containerFiles[docType]) || containerNA[docType]).length;
                return (
                  <div key={containerId} className="border border-default rounded-lg p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-sm font-mono" style={{ color: 'var(--primary)' }}>{containerId}</div>
                      <div className="text-xs opacity-60">{handledCount} / {activeDocTypes.length} handled</div>
                    </div>
                    <div className="space-y-4">
                      {activeDocTypes.map((docType) => {
                        const label =
                          docType === 'DRAFT_DECLARATION'
                            ? 'Draft declaration'
                            : docType === 'ASSESSMENT'
                              ? 'Assessment'
                              : docType === 'WH7'
                                ? 'WH7'
                                : docType === 'EXIT_NOTE'
                                  ? 'Exit note'
                                  : docType === 'T1'
                                    ? 'T1'
                                    : docType === 'T1_FORM'
                                      ? 'T1 form'
                                      : docType === 'IM8'
                                        ? 'IM8'
                                        : docType === 'IM7'
                                          ? 'IM7'
                                          : docType;
                        const file = containerFiles[docType] ?? null;
                        const isNotAvailable = containerNA[docType] === true;
                        const borderColor = isNotAvailable ? 'rgb(239,68,68)' : file ? 'var(--primary)' : 'var(--border)';
                        const bgColor = isNotAvailable ? 'rgba(239,68,68,0.05)' : file ? 'rgba(212,175,55,0.05)' : 'transparent';
                        return (
                          <div key={`${containerId}-${docType}`} className="border rounded-lg p-5 transition-all" style={{ borderColor, backgroundColor: bgColor }}>
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <File className="w-4 h-4 opacity-60" />
                                <span className="text-sm font-medium">{label}</span>
                                {clearancePathway === 'T1_TRANSIT' && (docType === 'IM8' || docType === 'IM7') && (
                                  <div className="ml-2 inline-flex rounded-md border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const current = selectedImDocType(containerId);
                                        if (current === 'IM8') return;
                                        setCustomsFile(containerId, 'IM7', null);
                                        setNotAvailableCustomsByContainer((prev) => {
                                          const row = { ...(prev[containerId] ?? {}) };
                                          delete row.IM7;
                                          return { ...prev, [containerId]: row };
                                        });
                                        setImDocTypeByContainer((prev) => ({ ...prev, [containerId]: 'IM8' }));
                                      }}
                                      className="px-2 py-1 text-xs font-semibold"
                                      style={{
                                        backgroundColor: selectedImDocType(containerId) === 'IM8' ? 'var(--primary)' : 'transparent',
                                        color: selectedImDocType(containerId) === 'IM8' ? '#fff' : 'inherit',
                                      }}
                                    >
                                      IM8
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const current = selectedImDocType(containerId);
                                        if (current === 'IM7') return;
                                        setCustomsFile(containerId, 'IM8', null);
                                        setNotAvailableCustomsByContainer((prev) => {
                                          const row = { ...(prev[containerId] ?? {}) };
                                          delete row.IM8;
                                          return { ...prev, [containerId]: row };
                                        });
                                        setImDocTypeByContainer((prev) => ({ ...prev, [containerId]: 'IM7' }));
                                      }}
                                      className="px-2 py-1 text-xs font-semibold"
                                      style={{
                                        backgroundColor: selectedImDocType(containerId) === 'IM7' ? 'var(--primary)' : 'transparent',
                                        color: selectedImDocType(containerId) === 'IM7' ? '#fff' : 'inherit',
                                      }}
                                    >
                                      IM7
                                    </button>
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                {isNotAvailable && (
                                  <span className="text-xs px-2 py-0.5 rounded-md font-medium" style={{ backgroundColor: 'rgba(239,68,68,0.15)', color: 'rgb(239,68,68)' }}>
                                    Not Available
                                  </span>
                                )}
                                {file && !isNotAvailable && (
                                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                                )}
                                <button
                                  type="button"
                                  onClick={() => {
                                    toggleCustomsNotAvailable(containerId, docType);
                                  }}
                                  className="text-xs px-2 py-1 rounded-md border transition-colors"
                                  style={{
                                    borderColor: isNotAvailable ? 'rgb(239,68,68)' : 'var(--border)',
                                    color: isNotAvailable ? 'rgb(239,68,68)' : 'inherit',
                                    opacity: 0.8,
                                  }}
                                >
                                  {isNotAvailable ? 'Undo' : 'Not Available'}
                                </button>
                              </div>
                            </div>

                            {isNotAvailable ? (
                              <div className="border-2 border-dashed rounded-lg p-4 text-center" style={{ borderColor: 'rgb(239,68,68)', backgroundColor: 'rgba(239,68,68,0.04)' }}>
                                <div className="text-sm opacity-70">This document is marked as not available and will be visible to the client.</div>
                              </div>
                            ) : (
                              <label className="block cursor-pointer">
                                <div className="border-2 border-dashed border-default rounded-lg p-6 text-center transition-all hover:border-opacity-60">
                                  {file ? (
                                    <div className="space-y-2">
              <div className="flex items-center justify-center gap-2 text-sm font-medium" style={{ color: 'var(--primary)' }}>
                                        <File className="w-5 h-5" />
                                        <span>{file.name}</span>
                                      </div>
                                      <div className="text-xs opacity-60">{(file.size / 1024).toFixed(1)} KB</div>
                                      <button
                                        type="button"
                                        onClick={(e) => { e.preventDefault(); setCustomsFile(containerId, docType, null); }}
                                        className="text-xs text-red-600 hover:text-red-700 underline mt-2"
                                      >
                                        Remove
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="space-y-2">
                                      <Upload className="w-8 h-8 mx-auto opacity-40" />
                                      <div className="text-sm font-medium opacity-70">Click to upload or drag and drop</div>
                                      <div className="text-xs opacity-50">PDF, DOC, DOCX, JPG, PNG (max 10MB)</div>
                                    </div>
                                  )}
                                </div>
                                <input
                                  type="file"
                                  className="hidden"
                                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                  onChange={(e) => { const f = e.target.files?.[0]; if (f) setCustomsFile(containerId, docType, f); }}
                                />
                              </label>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex gap-3 justify-end pt-6">
              <button
                type="button"
                onClick={() => setShowAssessmentForm(false)}
                className="px-5 py-2.5 rounded-md border border-default text-sm"
              >
                Back
              </button>
              <Button
                onClick={() => void onSubmit()}
                disabled={submitting}
              >
                {submitting ? 'Saving…' : 'Register Cargo'}
              </Button>
            </div>
          </div>
        </div>

        {error && (
          <div className="mt-4 p-4 rounded-lg border border-red-300 bg-red-50 text-red-800">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="font-medium text-sm mb-1">Registration Error</div>
                <div className="text-sm">{error}</div>
                {error.includes('already exists') && (
                  <a
                    href={`/cargo/${selectedCargoId}`}
                    className="inline-block mt-2 text-sm font-medium underline hover:no-underline"
                  >
                    View existing cargo →
                  </a>
                )}
              </div>
              <button
                onClick={() => setError(null)}
                className="text-red-600 hover:text-red-800"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
        {success && (
          <div className="mt-4 p-4 rounded-lg border border-green-300 bg-green-50 text-green-800">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="font-medium text-sm mb-1">Success!</div>
                <div className="text-sm">{success}</div>
              </div>
              <button
                onClick={() => setSuccess(null)}
                className="text-green-600 hover:text-green-800"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
