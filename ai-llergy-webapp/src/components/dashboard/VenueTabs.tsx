'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import EquipmentList from './EquipmentList'
import MenuTable from './MenuTable'

interface VenueTabsProps {
    venueId: string
    venueName: string
    menuItems: any[]
}

export default function VenueTabs({ venueId, venueName, menuItems }: VenueTabsProps) {
    const [activeTab, setActiveTab] = useState<'info' | 'menu'>('info')

    return (
        <div className="w-full">
            <div className="mb-8">
                <h1 className="text-3xl font-heading text-text mb-2">{venueName}</h1>
                <div className="flex gap-4 border-b border-light">
                    <button
                        onClick={() => setActiveTab('info')}
                        className={`pb-3 px-1 text-sm font-medium transition-all relative ${activeTab === 'info' ? 'text-primary' : 'text-text-muted hover:text-text'
                            }`}
                    >
                        Venue Information
                        {activeTab === 'info' && (
                            <motion.div
                                layoutId="activeTab"
                                className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                            />
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('menu')}
                        className={`pb-3 px-1 text-sm font-medium transition-all relative ${activeTab === 'menu' ? 'text-primary' : 'text-text-muted hover:text-text'
                            }`}
                    >
                        Menu & Ingredients
                        {activeTab === 'menu' && (
                            <motion.div
                                layoutId="activeTab"
                                className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                            />
                        )}
                    </button>
                </div>
            </div>

            <AnimatePresence mode="wait">
                <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                >
                    {activeTab === 'info' ? (
                        <EquipmentList venueId={venueId} />
                    ) : (
                        <MenuTable venueId={venueId} menuItems={menuItems} />
                    )}
                </motion.div>
            </AnimatePresence>
        </div>
    )
}
