import React from 'react'
import {
  Waves,
  Wrench,
  Zap,
  TestTube,
  Droplet,
  Disc,
  Filter,
  ShieldCheck,
  Sparkles,
  Hospital,
  Building,
  Settings,
  CircleDot,
  Construction,
  type LucideIcon
} from 'lucide-react'

/**
 * Maps module types to their corresponding Lucide icons
 */
export function getModuleIconComponent(type?: string, category?: string): LucideIcon {
  if (!type && !category) return Settings

  // Category-based icon mapping
  const categoryIconMap: Record<string, LucideIcon> = {
    source_water: Waves,
    physical_treatment: Wrench,
    fluid_handling: Zap,
    primary_treatment: TestTube,
    chemical_feed: Droplet,
    solids_separation: Disc,
    tertiary_treatment: Filter,
    advanced_treatment: ShieldCheck,
    final_treatment: Sparkles,
    public_health: Hospital,
    distribution: Building,
    intake: Waves,
    pumps: Zap,
    treatment: TestTube,
    chemical: Droplet,
    filtration: Filter,
    disinfection: ShieldCheck,
    storage: Building
  }

  // Type-based icon mapping
  const typeIconMap: Record<string, LucideIcon> = {
    intake: Waves,
    pretreatment: Wrench,
    pump: Zap,
    chemical_treatment: TestTube,
    chemical_dosing: Droplet,
    sedimentation: Disc,
    filtration: Filter,
    disinfection: ShieldCheck,
    storage: Building,
    flocculation: CircleDot,
    construction: Construction,
    other: Settings
  }

  return categoryIconMap[category || ''] || typeIconMap[type || ''] || Settings
}

/**
 * Infers module type from module ID for icon selection
 */
export function inferModuleTypeForIcon(moduleId: string): LucideIcon {
  const typeMap: Record<string, LucideIcon> = {
    intake: Waves,
    pump: Zap,
    tank: Building,
    dosing: Droplet,
    coagulation: TestTube,
    clarifier: Disc,
    filter: Filter,
    chlorination: ShieldCheck,
    finished_water: Building,
    flocculation: CircleDot
  }

  const lowerModuleId = moduleId.toLowerCase()
  for (const [keyword, icon] of Object.entries(typeMap)) {
    if (lowerModuleId.includes(keyword)) {
      return icon
    }
  }

  return Settings
}

/**
 * React component for rendering module icons with consistent styling
 */
interface ModuleIconProps {
  type?: string
  category?: string
  className?: string
  size?: number
}

export const ModuleIcon: React.FC<ModuleIconProps> = ({
  type,
  category,
  className = 'w-6 h-6 text-blue-600',
  size
}) => {
  const IconComponent = getModuleIconComponent(type, category)
  const sizeClass = size ? `w-${size} h-${size}` : className

  return <IconComponent className={sizeClass} />
}

/**
 * Returns icon component for specific module types (for inline conditionals)
 */
export const getIconByType = (type: string): LucideIcon => {
  const iconMap: Record<string, LucideIcon> = {
    intake: Waves,
    pump: Zap,
    chemical_treatment: TestTube,
    chemical_dosing: Droplet,
    sedimentation: Disc,
    filtration: Filter,
    disinfection: ShieldCheck,
    storage: Building,
    flocculation: CircleDot,
    construction: Construction
  }

  return iconMap[type] || Settings
}
