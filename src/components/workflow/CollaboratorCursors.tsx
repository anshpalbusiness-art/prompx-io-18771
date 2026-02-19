import { motion } from 'framer-motion';
import type { Peer } from '@/hooks/useCollaborativeWorkflow';

interface CollaboratorCursorsProps {
    peers: Peer[];
}

/** SVG cursor overlay rendered on top of the workflow canvas */
export function CollaboratorCursors({ peers }: CollaboratorCursorsProps) {
    const activePeers = peers.filter(p => p.cursor !== null);

    if (activePeers.length === 0) return null;

    return (
        <div className="pointer-events-none absolute inset-0 z-30 overflow-hidden">
            {activePeers.map(peer => (
                <motion.div
                    key={peer.userId}
                    initial={{ opacity: 0, scale: 0.6 }}
                    animate={{
                        opacity: 1,
                        scale: 1,
                        x: peer.cursor!.x,
                        y: peer.cursor!.y,
                    }}
                    transition={{ type: 'spring', damping: 30, stiffness: 350, mass: 0.4 }}
                    className="absolute top-0 left-0"
                    style={{ willChange: 'transform' }}
                >
                    {/* Cursor Arrow SVG */}
                    <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill={peer.color}
                        className="drop-shadow-lg"
                    >
                        <path d="M5.65 2.093a.5.5 0 0 0-.756.548l3.12 17.387a.5.5 0 0 0 .927.1l3.536-6.19a.25.25 0 0 1 .148-.12l6.65-1.88a.5.5 0 0 0 .036-.944L5.65 2.093Z" />
                    </svg>

                    {/* Name Tag */}
                    <div
                        className="ml-4 -mt-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-semibold text-white shadow-lg"
                        style={{ backgroundColor: peer.color }}
                    >
                        {peer.email.split('@')[0]}
                    </div>
                </motion.div>
            ))}
        </div>
    );
}
