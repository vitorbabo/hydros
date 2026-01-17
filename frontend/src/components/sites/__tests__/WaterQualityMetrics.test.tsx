/**
 * Tests for WaterQualityMetrics component
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { WaterQualityMetrics } from '../WaterQualityMetrics'

describe('WaterQualityMetrics', () => {
  const mockOnToggle = vi.fn()

  const mockRawWaterQuality = {
    turbidity: { value: 15.5, unit: 'NTU' },
    ph: { value: 7.2, unit: 'pH' },
    temperature: { value: 18.5, unit: '°C' }
  }

  const mockTreatmentTargets = {
    turbidity: { value: 0.3, unit: 'NTU' },
    ph: { value: 7.5, unit: 'pH' },
    chlorine: { value: 1.5, unit: 'mg/L' }
  }

  afterEach(() => {
    mockOnToggle.mockClear()
  })

  it('renders section header', () => {
    render(
      <WaterQualityMetrics
        isOpen={true}
        onToggle={mockOnToggle}
        rawWaterQuality={mockRawWaterQuality}
        treatmentTargets={mockTreatmentTargets}
      />
    )

    expect(screen.getByText('Water Quality')).toBeInTheDocument()
  })

  it('shows content when isOpen is true', () => {
    render(
      <WaterQualityMetrics
        isOpen={true}
        onToggle={mockOnToggle}
        rawWaterQuality={mockRawWaterQuality}
        treatmentTargets={mockTreatmentTargets}
      />
    )

    expect(screen.getByText('Raw Water Quality')).toBeInTheDocument()
    expect(screen.getByText('Treatment Targets')).toBeInTheDocument()
  })

  it('hides content when isOpen is false', () => {
    render(
      <WaterQualityMetrics
        isOpen={false}
        onToggle={mockOnToggle}
        rawWaterQuality={mockRawWaterQuality}
        treatmentTargets={mockTreatmentTargets}
      />
    )

    expect(screen.queryByText('Raw Water Quality')).not.toBeInTheDocument()
    expect(screen.queryByText('Treatment Targets')).not.toBeInTheDocument()
  })

  it('calls onToggle when header is clicked', () => {
    render(
      <WaterQualityMetrics
        isOpen={false}
        onToggle={mockOnToggle}
        rawWaterQuality={mockRawWaterQuality}
        treatmentTargets={mockTreatmentTargets}
      />
    )

    const header = screen.getByText('Water Quality').closest('button')
    if (header) {
      fireEvent.click(header)
    }

    expect(mockOnToggle).toHaveBeenCalledTimes(1)
  })

  it('displays raw water quality metrics', () => {
    render(
      <WaterQualityMetrics
        isOpen={true}
        onToggle={mockOnToggle}
        rawWaterQuality={mockRawWaterQuality}
        treatmentTargets={mockTreatmentTargets}
      />
    )

    expect(screen.getByText(/15.5 NTU/)).toBeInTheDocument()
    expect(screen.getByText(/7.2 pH/)).toBeInTheDocument()
    expect(screen.getByText(/18.5 °C/)).toBeInTheDocument()
  })

  it('displays treatment targets', () => {
    render(
      <WaterQualityMetrics
        isOpen={true}
        onToggle={mockOnToggle}
        rawWaterQuality={mockRawWaterQuality}
        treatmentTargets={mockTreatmentTargets}
      />
    )

    expect(screen.getByText(/0.3 NTU/)).toBeInTheDocument()
    expect(screen.getByText(/1.5 mg\/L/)).toBeInTheDocument()
  })

  it('handles missing raw water quality data', () => {
    render(
      <WaterQualityMetrics
        isOpen={true}
        onToggle={mockOnToggle}
        rawWaterQuality={undefined}
        treatmentTargets={mockTreatmentTargets}
      />
    )

    expect(screen.getByText('No raw water quality data configured')).toBeInTheDocument()
  })

  it('handles empty raw water quality object', () => {
    render(
      <WaterQualityMetrics
        isOpen={true}
        onToggle={mockOnToggle}
        rawWaterQuality={{}}
        treatmentTargets={mockTreatmentTargets}
      />
    )

    expect(screen.getByText('No raw water quality data configured')).toBeInTheDocument()
  })

  it('handles missing treatment targets', () => {
    render(
      <WaterQualityMetrics
        isOpen={true}
        onToggle={mockOnToggle}
        rawWaterQuality={mockRawWaterQuality}
        treatmentTargets={undefined}
      />
    )

    expect(screen.getByText('No treatment targets configured')).toBeInTheDocument()
  })

  it('formats parameter names correctly', () => {
    const qualityWithUnderscores = {
      chlorine_residual: { value: 1.2, unit: 'mg/L' }
    }

    render(
      <WaterQualityMetrics
        isOpen={true}
        onToggle={mockOnToggle}
        rawWaterQuality={qualityWithUnderscores}
        treatmentTargets={{}}
      />
    )

    // Should replace underscores with spaces and capitalize
    expect(screen.getByText(/Chlorine residual/)).toBeInTheDocument()
  })

  it('handles non-object values', () => {
    const qualityWithPlainValues = {
      status: 'Good',
      condition: 'Acceptable'
    }

    render(
      <WaterQualityMetrics
        isOpen={true}
        onToggle={mockOnToggle}
        rawWaterQuality={qualityWithPlainValues}
        treatmentTargets={{}}
      />
    )

    expect(screen.getByText('Good')).toBeInTheDocument()
    expect(screen.getByText('Acceptable')).toBeInTheDocument()
  })
})
