import React, { useState, useEffect } from 'react'
import { Settings, Plus, Edit2, Trash2, Power, PowerOff } from 'lucide-react'
import { useAlertStore, mockAlertRules, AlertRule } from '../../store/alertStore'
import { useDashboardStore } from '../../store/dashboardStore'
import AlertSeverityBadge from '../../components/alerts/AlertSeverityBadge'
import AlertRuleEditor from '../../components/alerts/AlertRuleEditor'

const AlertConfiguration: React.FC = () => {
  const {
    alertRules,
    addAlertRule,
    updateAlertRule,
    deleteAlertRule,
    toggleAlertRule
  } = useAlertStore()

  const { sites } = useDashboardStore()

  const [showEditor, setShowEditor] = useState(false)
  const [editingRule, setEditingRule] = useState<AlertRule | undefined>(undefined)
  const [selectedSite, setSelectedSite] = useState<string>('all')

  // Load mock data on mount (for development)
  useEffect(() => {
    if (alertRules.length === 0) {
      mockAlertRules.forEach(rule => addAlertRule(rule))
    }
  }, [])

  const filteredRules =
    selectedSite === 'all'
      ? alertRules
      : alertRules.filter(rule => rule.siteId === selectedSite)

  const handleCreateRule = () => {
    setEditingRule(undefined)
    setShowEditor(true)
  }

  const handleEditRule = (rule: AlertRule) => {
    setEditingRule(rule)
    setShowEditor(true)
  }

  const handleSaveRule = (ruleData: Omit<AlertRule, 'id' | 'createdAt'>) => {
    if (editingRule) {
      updateAlertRule(editingRule.id, ruleData)
    } else {
      addAlertRule(ruleData)
    }
    setShowEditor(false)
    setEditingRule(undefined)
  }

  const handleDeleteRule = (ruleId: string, ruleName: string) => {
    if (window.confirm(`Are you sure you want to delete the rule "${ruleName}"?`)) {
      deleteAlertRule(ruleId)
    }
  }

  const handleToggleRule = (ruleId: string, enabled: boolean) => {
    toggleAlertRule(ruleId, !enabled)
  }

  const getConditionText = (rule: AlertRule): string => {
    const threshold = rule.threshold
    const measurement = rule.measurement.replace(/_/g, ' ')

    if (rule.condition === 'between' && Array.isArray(threshold)) {
      return `${measurement} is between ${threshold[0]} and ${threshold[1]}`
    } else if (typeof threshold === 'number') {
      return `${measurement} is ${rule.condition} ${threshold}`
    }
    return `${measurement} ${rule.condition} ${threshold}`
  }

  const stats = {
    total: alertRules.length,
    enabled: alertRules.filter(r => r.enabled).length,
    disabled: alertRules.filter(r => !r.enabled).length,
    critical: alertRules.filter(r => r.severity === 'critical').length
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <Settings className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Alert Configuration
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Manage alert rules and notification settings
              </p>
            </div>
          </div>

          <button
            onClick={handleCreateRule}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
          >
            <Plus size={18} />
            Create Rule
          </button>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {stats.total}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Total Rules</div>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {stats.enabled}
            </div>
            <div className="text-xs text-green-600 dark:text-green-400">Enabled</div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
            <div className="text-2xl font-bold text-gray-600 dark:text-gray-400">
              {stats.disabled}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Disabled</div>
          </div>
          <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3">
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
              {stats.critical}
            </div>
            <div className="text-xs text-red-600 dark:text-red-400">Critical Rules</div>
          </div>
        </div>

        {/* Site Filter */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Filter by Site:
          </label>
          <select
            value={selectedSite}
            onChange={(e) => setSelectedSite(e.target.value)}
            className="px-3 py-1.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400"
          >
            <option value="all">All Sites</option>
            {Object.entries(sites).map(([siteId, site]) => (
              <option key={siteId} value={siteId}>
                {site.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Rules List */}
      <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900 p-6">
        {filteredRules.length > 0 ? (
          <div className="space-y-3">
            {filteredRules.map((rule) => (
              <div
                key={rule.id}
                className={`bg-white dark:bg-gray-800 rounded-lg border ${
                  rule.enabled
                    ? 'border-gray-200 dark:border-gray-700'
                    : 'border-gray-300 dark:border-gray-600 opacity-60'
                } p-4`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    {/* Header */}
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {rule.name}
                      </h3>
                      <AlertSeverityBadge severity={rule.severity} size="sm" />
                      {rule.enabled ? (
                        <span className="inline-flex items-center gap-1 text-xs bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 px-2 py-0.5 rounded-full">
                          <Power size={10} />
                          Enabled
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded-full">
                          <PowerOff size={10} />
                          Disabled
                        </span>
                      )}
                    </div>

                    {/* Description */}
                    {rule.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                        {rule.description}
                      </p>
                    )}

                    {/* Condition */}
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 mb-3">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        Condition: <span className="font-normal">{getConditionText(rule)}</span>
                      </p>
                    </div>

                    {/* Metadata */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-gray-600 dark:text-gray-400">
                      <div>
                        <span className="font-medium">Site:</span>
                        <br />
                        {rule.siteName || rule.siteId}
                      </div>
                      <div>
                        <span className="font-medium">Asset:</span>
                        <br />
                        {rule.assetName || rule.assetId}
                      </div>
                      <div>
                        <span className="font-medium">Measurement:</span>
                        <br />
                        {rule.measurement.replace(/_/g, ' ')}
                      </div>
                      <div>
                        <span className="font-medium">Notifications:</span>
                        <br />
                        {rule.notificationChannels.join(', ')}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleRule(rule.id, rule.enabled)}
                      className={`p-2 rounded-lg transition-colors ${
                        rule.enabled
                          ? 'text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20'
                          : 'text-gray-400 dark:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                      title={rule.enabled ? 'Disable rule' : 'Enable rule'}
                    >
                      {rule.enabled ? <Power size={18} /> : <PowerOff size={18} />}
                    </button>
                    <button
                      onClick={() => handleEditRule(rule)}
                      className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                      title="Edit rule"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button
                      onClick={() => handleDeleteRule(rule.id, rule.name)}
                      className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      title="Delete rule"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-full mb-4">
              <Settings className="w-12 h-12 text-gray-400 dark:text-gray-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No alert rules configured
            </h3>
            <p className="text-gray-600 dark:text-gray-400 max-w-md mb-4">
              {alertRules.length > 0
                ? 'No rules match your current filter. Try selecting a different site.'
                : 'Get started by creating your first alert rule to monitor system conditions.'}
            </p>
            <button
              onClick={handleCreateRule}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
            >
              Create Alert Rule
            </button>
          </div>
        )}
      </div>

      {/* Rule Editor Modal */}
      {showEditor && (
        <AlertRuleEditor
          rule={editingRule}
          onSave={handleSaveRule}
          onCancel={() => {
            setShowEditor(false)
            setEditingRule(undefined)
          }}
        />
      )}
    </div>
  )
}

export default AlertConfiguration
