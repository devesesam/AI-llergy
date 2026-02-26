'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import EquipmentList from './EquipmentList'
import MenuTable from './MenuTable'
import VenueSettings from './VenueSettings'
import { Settings } from 'lucide-react'

interface VenueTabsProps {
    venueId: string
    venueName: string
    venueSlug?: string
    menuItems: any[]
}

export default function VenueTabs({ venueId, venueName, venueSlug, menuItems }: VenueTabsProps) {
    const [activeTab, setActiveTab] = useState<'info' | 'menu' | 'settings'>('info')

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
                    <button
                        onClick={() => setActiveTab('settings')}
                        className={`pb-3 px-1 text-sm font-medium transition-all relative flex items-center gap-1.5 ${activeTab === 'settings' ? 'text-primary' : 'text-text-muted hover:text-text'
                            }`}
                    >
                        <Settings className="w-4 h-4" />
                        Settings
                        {activeTab === 'settings' && (
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
                    {activeTab === 'info' && (
                        <EquipmentList venueId={venueId} />
                    )}
                    {activeTab === 'menu' && (
                        <MenuTable venueId={venueId} menuItems={menuItems} />
                    )}
                    {activeTab === 'settings' && (
                        <VenueSettings venueId={venueId} venueName={venueName} venueSlug={venueSlug} />
                    )}
                </motion.div>
            </AnimatePresence>
        </div>
    )
}
