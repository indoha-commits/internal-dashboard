import { useState } from 'react';
import { EmailIntakeSetupPage } from './EmailIntakeSetupPage';
import { PhoneNumbersAccessPage } from './PhoneNumbersAccessPage';
import { ActivityLogPage } from './ActivityLogPage';
import { GeneralSettingsPage } from './GeneralSettingsPage';

type SettingsTab = 'general' | 'email-intake' | 'phone-numbers' | 'activity-log';

const tabs: { id: SettingsTab; label: string }[] = [
  { id: 'general', label: 'General' },
  { id: 'email-intake', label: 'Email Intake Setup' },
  { id: 'phone-numbers', label: 'Phone Numbers & Access' },
  { id: 'activity-log', label: 'Activity Log' },
];

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="page-title">Settings</h1>
        <p className="page-desc mt-2">Account and application preferences</p>
      </div>

      <div className="flex gap-1 border-b mb-6" style={{ borderColor: 'var(--border)' }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="px-4 py-2.5 text-sm font-medium border-b-2 transition-colors"
            style={{
              borderColor: activeTab === tab.id ? 'var(--accent)' : 'transparent',
              color: activeTab === tab.id ? 'var(--accent)' : 'var(--text-secondary)',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div>
        {activeTab === 'general' && <GeneralSettingsPage />}
        {activeTab === 'email-intake' && <EmailIntakeSetupPage />}
        {activeTab === 'phone-numbers' && <PhoneNumbersAccessPage />}
        {activeTab === 'activity-log' && <ActivityLogPage />}
      </div>
    </div>
  );
}
