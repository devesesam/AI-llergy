'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { AlertTriangle, Plus, Info } from 'lucide-react'

interface Equipment {
    id: string
    name: string
    type: string
    allergens: string[]
    riskLevel: 'High' | 'Medium' | 'Low'
}

interface EquipmentListProps {
    venueId: string
}

export default function EquipmentList({ venueId }: EquipmentListProps) {
    // TODO: Fetch from Supabase - currently empty by default
    const equipment: Equipment[] = []

    const getRiskBadgeClasses = (level: string) => {
        switch (level) {
            case 'High':
                return 'badge badge-danger'
            case 'Medium':
                return 'badge badge-warning'
            default:
                return 'badge badge-success'
        }
    }

    // Check if there are any high-risk equipment items
    const highRiskEquipment = equipment.filter(e => e.riskLevel === 'High')

    return (
        <div className="space-y-8">
            {/* Risk Warning Banner - only show if there's high risk equipment */}
            {highRiskEquipment.length > 0 && (
                <div className="p-5 rounded-2xl bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 flex items-start gap-4 shadow-sm">
                    <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center flex-shrink-0">
                        <AlertTriangle className="w-5 h-5 text-orange-600" />
                    </div>
                    <div>
                        <h3 className="text-orange-800 font-semibold text-sm uppercase tracking-wide mb-1">Cross-Contamination Risk</h3>
                        <p className="text-orange-700 text-sm leading-relaxed">
                            High risk detected in <strong>{highRiskEquipment[0].name}</strong>. Review allergen handling procedures.
                        </p>
                    </div>
                </div>
            )}

            {/* Venue Information Grid */}
            <div>
                <h2 className="text-xl font-heading text-gray-900 mb-6">Venue Information</h2>

                {equipment.length === 0 ? (
                    /* Empty State */
                    <div className="flex flex-col items-center justify-center py-16 px-8 bg-white rounded-2xl shadow-card">
                        <div className="w-16 h-16 mb-6 rounded-full bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center">
                            <Info className="w-8 h-8 text-gray-400" />
                        </div>
                        <h3 className="text-xl font-heading text-gray-900 mb-2">No venue information added</h3>
                        <p className="text-gray-500 mb-6 max-w-sm text-center">
                            Add details about your venue, equipment, and allergen handling procedures.
                        </p>
                        <Link href={`/dashboard/venues/${venueId}/info/new`} className="btn-base btn-md bg-primary text-white hover:bg-primary/90 shadow-sm">
                            <Plus className="w-5 h-5" />
                            Add Venue Information
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {equipment.map((item, index) => (
                            <motion.div
                                key={item.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                                className="p-6 bg-white rounded-2xl shadow-card hover:shadow-card-hover transition-all group"
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-900 group-hover:text-primary transition-colors">{item.name}</h3>
                                        <p className="text-sm text-gray-500 mt-1">{item.type}</p>
                                    </div>
                                    <span className={getRiskBadgeClasses(item.riskLevel)}>
                                        {item.riskLevel} Risk
                                    </span>
                                </div>

                                <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-100">
                                    {item.allergens.map(allergen => (
                                        <span key={allergen} className="tag">
                                            {allergen}
                                        </span>
                                    ))}
                                </div>
                            </motion.div>
                        ))}

                        {/* Add New Card */}
                        <Link href={`/dashboard/venues/${venueId}/info/new`} className="flex flex-col items-center justify-center p-6 bg-gray-50/50 border-2 border-dashed border-gray-200 rounded-2xl text-gray-500 hover:text-primary hover:border-primary hover:bg-primary/5 transition-all min-h-[180px] group">
                            <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center mb-3 group-hover:shadow-md transition-shadow">
                                <Plus className="w-6 h-6" />
                            </div>
                            <span className="font-medium">Add Venue Information</span>
                        </Link>
                    </div>
                )}
            </div>
        </div>
    )
}
