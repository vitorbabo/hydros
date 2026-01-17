/**
 * Protocol Clients Section
 */
import React from 'react'
import { ChevronDown, ChevronRight, Wifi } from 'lucide-react'

interface ProtocolClient {
  client_id: string
  protocol: string
  connection?: {
    host?: string
    port?: number
    [key: string]: any
  }
  modules_assigned?: string[]
  [key: string]: any
}

interface ProtocolClientsSectionProps {
  isOpen: boolean
  onToggle: () => void
  protocolClients: ProtocolClient[]
}

export function ProtocolClientsSection({
  isOpen,
  onToggle,
  protocolClients
}: ProtocolClientsSectionProps) {
  return (
    <div className="bg-white dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-800">
      {/* Section Header */}
      <button
        onClick={onToggle}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors rounded-t-xl"
      >
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Protocol Clients
        </h3>
        {isOpen ? (
          <ChevronDown className="w-5 h-5 text-gray-500" />
        ) : (
          <ChevronRight className="w-5 h-5 text-gray-500" />
        )}
      </button>

      {/* Section Content */}
      {isOpen && (
        <div className="px-6 pb-6 space-y-4">
          {protocolClients.length > 0 ? (
            protocolClients.map((client) => (
              <div
                key={client.client_id}
                className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-gray-900 dark:text-white">{client.client_id}</h4>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                    <Wifi className="w-3 h-3" />
                    {client.protocol}
                  </span>
                </div>

                {/* Connection Details */}
                {client.connection && (
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {client.connection.host && (
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">Host:</span>
                        <span className="ml-2 text-gray-900 dark:text-white font-mono">
                          {client.connection.host}
                        </span>
                      </div>
                    )}
                    {client.connection.port && (
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">Port:</span>
                        <span className="ml-2 text-gray-900 dark:text-white font-mono">
                          {client.connection.port}
                        </span>
                      </div>
                    )}
                    {client.connection.unit_id !== undefined && (
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">Unit ID:</span>
                        <span className="ml-2 text-gray-900 dark:text-white font-mono">
                          {client.connection.unit_id}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Assigned Modules */}
                {client.modules_assigned && client.modules_assigned.length > 0 && (
                  <div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Assigned Modules:
                    </span>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {client.modules_assigned.map((module) => (
                        <span
                          key={module}
                          className="inline-flex px-2 py-0.5 rounded text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                        >
                          {module}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No protocol clients configured
            </p>
          )}
        </div>
      )}
    </div>
  )
}
