/**
 * Tests for SiteHeader component
 */
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { SiteHeader } from '../SiteHeader'
import type { PlantSite } from '../../../types'

describe('SiteHeader', () => {
  const mockSite: PlantSite = {
    id: 'test-site-01',
    name: 'Test Water Treatment Plant',
    treatment_train: 'coagulation-flocculation-sedimentation-filtration-disinfection',
    location: {
      region: 'Test Region',
      country: 'Test Country',
      coordinates: [40.7128, -74.0060]
    },
    status: 'connected',
    design_capacity: 50000,
    modules: []
  }

  const defaultProps = {
    site: mockSite,
    currentFlowRate: 35.5,
    dailyTotalFlow: 850.2,
    designFlowRate: 45.0,
    hasRecentData: true,
    formatFlowValue: (value: number) => value.toFixed(1)
  }

  it('renders site name and location', () => {
    render(<SiteHeader {...defaultProps} />)

    expect(screen.getByText('Test Water Treatment Plant')).toBeInTheDocument()
    expect(screen.getByText('Test City')).toBeInTheDocument()
  })

  it('displays current flow rate when data is available', () => {
    render(<SiteHeader {...defaultProps} />)

    expect(screen.getByText('35.5')).toBeInTheDocument()
    expect(screen.getByText('m³/h')).toBeInTheDocument()
  })

  it('displays daily total flow', () => {
    render(<SiteHeader {...defaultProps} />)

    expect(screen.getByText('850.2')).toBeInTheDocument()
  })

  it('calculates and displays utilization percentage', () => {
    render(<SiteHeader {...defaultProps} />)

    // 35.5 / 45.0 * 100 = 78.89% → 79%
    expect(screen.getByText(/79%/)).toBeInTheDocument()
  })

  it('shows placeholder when no recent data', () => {
    const propsWithoutData = {
      ...defaultProps,
      hasRecentData: false
    }

    render(<SiteHeader {...propsWithoutData} />)

    // Should show '--' placeholders
    const placeholders = screen.getAllByText('--')
    expect(placeholders.length).toBeGreaterThan(0)
  })

  it('handles large flow values with formatFlowValue', () => {
    const propsWithLargeFlow = {
      ...defaultProps,
      currentFlowRate: 1500.0,
      formatFlowValue: (value: number) => value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value.toFixed(1)
    }

    render(<SiteHeader {...propsWithLargeFlow} />)

    expect(screen.getByText('1.5k')).toBeInTheDocument()
  })

  it('handles zero utilization gracefully', () => {
    const propsWithZeroDesign = {
      ...defaultProps,
      designFlowRate: 0
    }

    render(<SiteHeader {...propsWithZeroDesign} />)

    // Should show 0% utilization
    expect(screen.getByText(/0%/)).toBeInTheDocument()
  })

  it('caps utilization at 100%', () => {
    const propsWithHighFlow = {
      ...defaultProps,
      currentFlowRate: 100.0,
      designFlowRate: 50.0
    }

    render(<SiteHeader {...propsWithHighFlow} />)

    // Utilization should be capped at 100%
    expect(screen.getByText(/100%/)).toBeInTheDocument()
  })

  it('displays correct metric labels', () => {
    render(<SiteHeader {...defaultProps} />)

    expect(screen.getByText('Current Flow')).toBeInTheDocument()
    expect(screen.getByText('Daily Total')).toBeInTheDocument()
    expect(screen.getByText('Utilization')).toBeInTheDocument()
  })
})
