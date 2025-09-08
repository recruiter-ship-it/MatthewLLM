import React, { Dispatch } from 'react';
import PageAnalyzer from './PageAnalyzer';
import { MatthewLogoIcon, X } from './icons/Icons';
import { CompanyProfile, Recruiter, Vacancy } from '../types';

interface ExtensionHostProps {
  vacancies: Vacancy[];
  activeRecruiter: Recruiter | CompanyProfile | null;
  activeVacancy: Vacancy | null;
  companyProfile: CompanyProfile | null;
  onSelectVacancy: (vacancyId: string | null) => void;
  onUpdateVacancy: (update: Vacancy | ((prev: Vacancy) => Vacancy)) => void;
  dispatchVacancies: Dispatch<any>;
}

const ExtensionHost: React.FC<ExtensionHostProps> = (props) => {
  const handleClose = () => {
    // This message is sent to the content script via the background script relay
    // It triggers the same toggle logic, which will hide the widget if it's visible.
    chrome.runtime.sendMessage({
        target: 'content_script',
        action: 'toggleWidget'
    });
  };

  return (
    // Removed fixed positioning. Now it's a flex container that fills the iframe.
    <div className="h-full w-full flex flex-col font-sans aurora-panel overflow-hidden">
      <header className="flex items-center justify-between p-4 border-b border-[var(--ui-border)] flex-shrink-0">
        <div className="flex items-center gap-2">
            <MatthewLogoIcon className="w-6 h-6 text-[var(--text-primary)]" />
            <h3 className="font-bold text-[var(--text-primary)]">Matthew Ассистент</h3>
        </div>
        {/* Changed minimize to a close button */}
        <button onClick={handleClose} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
            <X className="w-6 h-6" />
        </button>
      </header>
      <div className="flex-grow min-h-0">
        <PageAnalyzer {...props} />
      </div>
    </div>
  );
};

export default ExtensionHost;