import { FileText, Upload, AlertCircle } from 'lucide-react';

export function Context() {
  const handleLoadSampleContext = async () => {
    // In a real implementation, this would copy sample files to the context directory
    alert('Sample context files would be loaded into the context/ directory');
  };

  const handleOpenContextFolder = async () => {
    // In a real implementation, this would open the context folder
    await window.electronAPI?.openExternal('file:///' + 'context/');
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Project Context</h1>
          <p className="text-gray-600">
            Configure your project context with YAML files
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={handleLoadSampleContext}
            className="btn btn-secondary btn-md"
          >
            <Upload className="h-4 w-4 mr-2" />
            Load Samples
          </button>
          <button
            onClick={handleOpenContextFolder}
            className="btn btn-primary btn-md"
          >
            <FileText className="h-4 w-4 mr-2" />
            Open Context Folder
          </button>
        </div>
      </div>

      {/* Context Files Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <FileText className="h-6 w-6 text-primary-600" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900 mb-2">mission.yaml</h3>
              <p className="text-sm text-gray-600 mb-3">
                Define your project mission statement and goals
              </p>
              <div className="bg-gray-50 rounded-md p-3">
                <pre className="text-xs text-gray-700">{`mission:
  statement: "Implement SAP S/4HANA system for..."
  goals:
    - "Complete system integration by Q4"
    - "Achieve 99% uptime requirement"
    - "Train 200+ end users"`}</pre>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <FileText className="h-6 w-6 text-success-600" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900 mb-2">targets.yaml</h3>
              <p className="text-sm text-gray-600 mb-3">
                Set your key performance indicators and deadlines
              </p>
              <div className="bg-gray-50 rounded-md p-3">
                <pre className="text-xs text-gray-700">{`targets:
  kpis:
    - name: "System Performance"
      target: "< 2 second response time"
      deadline: "2024-12-31"
    - name: "Data Migration"
      target: "100% data accuracy"
      deadline: "2024-11-15"`}</pre>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <FileText className="h-6 w-6 text-warning-600" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900 mb-2">milestones.yaml</h3>
              <p className="text-sm text-gray-600 mb-3">
                Define project milestones with owners and acceptance criteria
              </p>
              <div className="bg-gray-50 rounded-md p-3">
                <pre className="text-xs text-gray-700">{`milestones:
  - id: "MTO_STRATEGY_50"
    title: "MTO Strategy Implementation"
    description: "Configure Make-to-Order..."
    owner: "John Smith"
    dueDate: "2024-10-30"
    acceptanceCriteria: "All MTO workflows..."
  - id: "RAR_SETUP"
    title: "Revenue Accounting Setup"
    ...`}</pre>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <FileText className="h-6 w-6 text-error-600" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900 mb-2">glossary.yaml</h3>
              <p className="text-sm text-gray-600 mb-3">
                Map project-specific terms and acronyms
              </p>
              <div className="bg-gray-50 rounded-md p-3">
                <pre className="text-xs text-gray-700">{`MIGO: "Goods Movement"
RAR: "Revenue Accounting & Reporting"
FI/CO: "Financial Accounting & Controlling"
CK11N: "Cost Estimate with Quantity"
G/L: "General Ledger"
MTO: "Make-to-Order"
ATO: "Assemble-to-Order"`}</pre>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="card">
        <h3 className="font-medium text-gray-900 mb-4">Setup Instructions</h3>
        <div className="space-y-4">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 mt-1">
              <div className="w-6 h-6 bg-primary-100 rounded-full flex items-center justify-center">
                <span className="text-xs font-medium text-primary-600">1</span>
              </div>
            </div>
            <div>
              <div className="font-medium text-gray-900">Create context directory</div>
              <div className="text-sm text-gray-600">
                Create a <code className="bg-gray-100 px-1 rounded">context/</code> folder in your project root
              </div>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 mt-1">
              <div className="w-6 h-6 bg-primary-100 rounded-full flex items-center justify-center">
                <span className="text-xs font-medium text-primary-600">2</span>
              </div>
            </div>
            <div>
              <div className="font-medium text-gray-900">Add YAML files</div>
              <div className="text-sm text-gray-600">
                Create the four YAML files shown above with your project-specific content
              </div>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 mt-1">
              <div className="w-6 h-6 bg-primary-100 rounded-full flex items-center justify-center">
                <span className="text-xs font-medium text-primary-600">3</span>
              </div>
            </div>
            <div>
              <div className="font-medium text-gray-900">Restart the app</div>
              <div className="text-sm text-gray-600">
                The context will be automatically loaded when you restart the application
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Context Status */}
      <div className="card border-primary-200 bg-primary-50">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <AlertCircle className="h-5 w-5 text-primary-600 mt-0.5" />
          </div>
          <div>
            <h4 className="font-medium text-primary-800">Context Loading</h4>
            <p className="text-sm text-primary-700 mt-1">
              Project context is loaded automatically from the context/ directory when the app starts.
              If you make changes to the YAML files, restart the app to reload the context.
              The extraction engine uses this context to identify relevant project information in WhatsApp messages.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}