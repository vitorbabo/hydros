import React, { useState, useEffect } from 'react'
import type { ModuleTemplate } from '../../types'
import {
  X,
  Save,
  AlertCircle,
  CheckCircle,
  Info,
  Zap,
  Droplet,
  Activity,
  Settings2
} from 'lucide-react'
import { getIconByType } from '../../utils/moduleIcons'

interface ConfigurationPanelProps {
  isVisible: boolean
  onClose: () => void
  moduleId?: string
  template?: ModuleTemplate
  currentParameters?: Record<string, any>
  onSave: (parameters: Record<string, any>) => void
  onValidate?: (parameters: Record<string, any>) => string[]
}

interface ParameterInputProps {
  label: string
  value: any
  onChange: (value: any) => void
  type?: 'text' | 'number' | 'boolean' | 'select'
  options?: string[]
  placeholder?: string
  required?: boolean
  validation?: (value: any) => string | null
  unit?: string
  description?: string
}

const ParameterInput: React.FC<ParameterInputProps> = ({
  label,
  value,
  onChange,
  type = 'text',
  options,
  placeholder,
  required = false,
  validation,
  unit,
  description
}) => {
  const [error, setError] = useState<string | null>(null)
  const [isDirty, setIsDirty] = useState(false)

  const handleChange = (newValue: any) => {
    setIsDirty(true)
    onChange(newValue)
    
    if (validation) {
      const validationError = validation(newValue)
      setError(validationError)
    }
  }

  const getInputIcon = () => {
    if (label.toLowerCase().includes('flow') || label.toLowerCase().includes('rate')) {
      return <Droplet className="w-4 h-4 text-blue-500" />
    }
    if (label.toLowerCase().includes('power') || label.toLowerCase().includes('voltage')) {
      return <Zap className="w-4 h-4 text-yellow-500" />
    }
    if (label.toLowerCase().includes('status') || label.toLowerCase().includes('state')) {
      return <Activity className="w-4 h-4 text-green-500" />
    }
    return <Settings2 className="w-4 h-4 text-gray-500" />
  }

  const renderInput = () => {
    switch (type) {
      case 'boolean':
        return (
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={value || false}
              onChange={(e) => handleChange(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label className="ml-2 text-sm text-gray-600">
              {value ? 'Enabled' : 'Disabled'}
            </label>
          </div>
        )
      
      case 'number':
        return (
          <div className="flex">
            <input
              type="number"
              value={value || ''}
              onChange={(e) => handleChange(parseFloat(e.target.value) || 0)}
              placeholder={placeholder}
              className={`flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                error && isDirty ? 'border-red-300' : 'border-gray-300'
              }`}
            />
            {unit && (
              <span className="ml-2 px-3 py-2 bg-gray-100 border border-l-0 border-gray-300 rounded-r-lg text-sm text-gray-600">
                {unit}
              </span>
            )}
          </div>
        )
      
      case 'select':
        return (
          <select
            value={value || ''}
            onChange={(e) => handleChange(e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              error && isDirty ? 'border-red-300' : 'border-gray-300'
            }`}
          >
            <option value="">Select {label}</option>
            {options?.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        )
      
      default:
        return (
          <input
            type="text"
            value={value || ''}
            onChange={(e) => handleChange(e.target.value)}
            placeholder={placeholder}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              error && isDirty ? 'border-red-300' : 'border-gray-300'
            }`}
          />
        )
    }
  }

  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
        {getInputIcon()}
        {label}
        {required && <span className="text-red-500">*</span>}
      </label>
      
      {renderInput()}
      
      {description && (
        <p className="text-xs text-gray-500">{description}</p>
      )}
      
      {error && isDirty && (
        <p className="text-xs text-red-600 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          {error}
        </p>
      )}
    </div>
  )
}

export const ConfigurationPanel: React.FC<ConfigurationPanelProps> = ({
  isVisible,
  onClose,
  moduleId,
  template,
  currentParameters = {},
  onSave,
  onValidate
}) => {
  const [parameters, setParameters] = useState<Record<string, any>>(currentParameters)
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Reset state when props change
  useEffect(() => {
    setParameters(currentParameters)
    setHasUnsavedChanges(false)
    setValidationErrors([])
  }, [currentParameters, moduleId])

  const handleParameterChange = (key: string, value: any) => {
    const newParameters = { ...parameters, [key]: value }
    setParameters(newParameters)
    setHasUnsavedChanges(true)
    
    // Run validation if provided
    if (onValidate) {
      const errors = onValidate(newParameters)
      setValidationErrors(errors)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      // Final validation check
      if (onValidate) {
        const errors = onValidate(parameters)
        if (errors.length > 0) {
          setValidationErrors(errors)
          return
        }
      }

      await onSave(parameters)
      setHasUnsavedChanges(false)
      setValidationErrors([])
    } catch (error) {
      console.error('Failed to save configuration:', error)
      setValidationErrors(['Failed to save configuration. Please try again.'])
    } finally {
      setIsSaving(false)
    }
  }

  const getParameterConfig = (paramKey: string) => {
    // Enhanced parameter configuration based on common sensor types
    const paramConfig: Record<string, Partial<ParameterInputProps>> = {
      // Flow sensors
      flow_rate: { type: 'number', unit: 'm³/h', description: 'Normal operating flow rate' },
      flow_setpoint: { type: 'number', unit: 'm³/h', description: 'Target flow rate' },
      
      // Pressure sensors
      pressure: { type: 'number', unit: 'bar', description: 'Operating pressure' },
      inlet_pressure: { type: 'number', unit: 'bar', description: 'Inlet pressure reading' },
      outlet_pressure: { type: 'number', unit: 'bar', description: 'Outlet pressure reading' },
      
      // Level sensors
      water_level: { type: 'number', unit: 'm', description: 'Water level measurement' },
      tank_level: { type: 'number', unit: '%', description: 'Tank fill percentage' },
      
      // Quality sensors
      turbidity: { type: 'number', unit: 'NTU', description: 'Turbidity measurement' },
      ph: { type: 'number', unit: 'pH', description: 'pH level' },
      chlorine_residual: { type: 'number', unit: 'mg/L', description: 'Chlorine concentration' },
      
      // Status and control
      run_status: { type: 'boolean', description: 'Equipment running status' },
      auto_mode: { type: 'boolean', description: 'Automatic operation mode' },
      alarm_status: { type: 'boolean', description: 'Alarm condition' },
      
      // Power and electrical
      power_consumption: { type: 'number', unit: 'kW', description: 'Power consumption' },
      voltage: { type: 'number', unit: 'V', description: 'Operating voltage' },
      current: { type: 'number', unit: 'A', description: 'Operating current' },
      
      // Temperature
      temperature: { type: 'number', unit: '°C', description: 'Temperature reading' },
      
      // Dosing
      dose_rate: { type: 'number', unit: 'mg/L', description: 'Chemical dosing rate' },
      dose_volume: { type: 'number', unit: 'L/h', description: 'Chemical dose volume' },
    }

    const baseConfig = paramConfig[paramKey] || {}
    
    return {
      placeholder: `Enter ${paramKey.replace(/_/g, ' ')}`,
      ...baseConfig
    }
  }

  if (!isVisible || !template) return null

  // Get icon component for the template type
  const ModuleIconComponent = getIconByType(template.type)

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
        />

        {/* Panel */}
        <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full sm:p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <ModuleIconComponent className="w-7 h-7 text-blue-600" />
              <div>
                <h3 className="text-lg font-medium text-gray-900">
                  Configure {template.description || moduleId}
                </h3>
                <p className="text-sm text-gray-600 capitalize">
                  {template.type.replace('_', ' ')} Module
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="space-y-6">
            {/* Validation Errors */}
            {validationErrors.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  <span className="font-medium text-red-800">Configuration Errors</span>
                </div>
                <ul className="list-disc list-inside space-y-1">
                  {validationErrors.map((error, index) => (
                    <li key={index} className="text-sm text-red-700">{error}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Module Information */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">Module Information</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Type:</span>
                  <span className="ml-2 font-medium capitalize">{template.type.replace('_', ' ')}</span>
                </div>
                <div>
                  <span className="text-gray-600">ID:</span>
                  <span className="ml-2 font-mono text-xs">{moduleId}</span>
                </div>
                {template.required_sensors && (
                  <div className="col-span-2">
                    <span className="text-gray-600">Required Sensors:</span>
                    <span className="ml-2">{template.required_sensors.length}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Required Sensors Configuration */}
            {template.required_sensors && template.required_sensors.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 mb-4">Required Sensors</h4>
                <div className="space-y-4">
                  {template.required_sensors.map(sensor => {
                    const config = getParameterConfig(sensor)
                    return (
                      <ParameterInput
                        key={sensor}
                        label={sensor.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                        value={parameters[sensor]}
                        onChange={(value) => handleParameterChange(sensor, value)}
                        required={true}
                        {...config}
                      />
                    )
                  })}
                </div>
              </div>
            )}

            {/* Optional Sensors Configuration */}
            {template.optional_sensors && template.optional_sensors.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 mb-4">Optional Sensors</h4>
                <div className="space-y-4">
                  {template.optional_sensors.map(sensor => {
                    const config = getParameterConfig(sensor)
                    return (
                      <ParameterInput
                        key={sensor}
                        label={sensor.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                        value={parameters[sensor]}
                        onChange={(value) => handleParameterChange(sensor, value)}
                        required={false}
                        {...config}
                      />
                    )
                  })}
                </div>
              </div>
            )}

            {/* Actuators Configuration */}
            {template.actuators && template.actuators.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 mb-4">Actuators</h4>
                <div className="space-y-4">
                  {template.actuators.map(actuator => {
                    const config = getParameterConfig(actuator)
                    return (
                      <ParameterInput
                        key={actuator}
                        label={actuator.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                        value={parameters[actuator]}
                        onChange={(value) => handleParameterChange(actuator, value)}
                        {...config}
                      />
                    )
                  })}
                </div>
              </div>
            )}

            {/* No Configuration Available */}
            {(!template.required_sensors || template.required_sensors.length === 0) &&
             (!template.optional_sensors || template.optional_sensors.length === 0) &&
             (!template.actuators || template.actuators.length === 0) && (
              <div className="text-center py-8 text-gray-500">
                <Info className="w-8 h-8 mx-auto mb-3" />
                <p className="font-medium">No Configuration Required</p>
                <p className="text-sm mt-1">This module doesn't require additional configuration</p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
            <div className="flex items-center gap-2 text-sm">
              {hasUnsavedChanges ? (
                <>
                  <AlertCircle className="w-4 h-4 text-orange-500" />
                  <span className="text-orange-600">Unsaved changes</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-green-600">Configuration saved</span>
                </>
              )}
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!hasUnsavedChanges || isSaving || validationErrors.length > 0}
                className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                  hasUnsavedChanges && validationErrors.length === 0
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                <Save className="w-4 h-4" />
                {isSaving ? 'Saving...' : 'Save Configuration'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}