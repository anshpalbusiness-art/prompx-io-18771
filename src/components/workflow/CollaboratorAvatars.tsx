import { motion, AnimatePresence } from 'framer-motion';
import { Users, Wifi, WifiOff, Loader2 } from 'lucide-react';
import type { Peer } from '@/hooks/useCollaborativeWorkflow';
import type { ConnectionStatus } from '@/hooks/useCollaborativeWorkflow';

interface CollaboratorAvatarsProps {
    peers: Peer[];
    connectionStatus: ConnectionStatus;
}

/** Avatar stack displayed in the workflow toolbar showing who else is online */
export function CollaboratorAvatars({ peers, connectionStatus }: CollaboratorAvatarsProps) {
    // If offline/error and no peers, don't show the collaboration widget at all (cleaner UI)
    if ((connectionStatus === 'disconnected' || connectionStatus === 'error') && peers.length === 0) {
        return null;
    }

    return (
        <div className="bg-zinc-900/80 backdrop-blur-xl border border-zinc-800/50 rounded-xl px-3 py-2 flex items-center gap-2">
            {/* Connection Status */}
            {connectionStatus === 'connected' && (
                <div className="flex items-center gap-1.5 text-xs text-emerald-400">
                    <Wifi className="w-3.5 h-3.5" />
                    <span className="font-medium">Live</span>
                </div>
            )}
            {connectionStatus === 'connecting' && (
                <div className="flex items-center gap-1.5 text-xs text-amber-400">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span className="font-medium">Connecting</span>
                </div>
            )}

            {/* Peer Count */}
            {peers.length > 0 && (
                <>
                    <div className="w-px h-4 bg-zinc-700/50" />
                    <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                        <Users className="w-3.5 h-3.5" />
                        <span className="font-medium">{peers.length + 1}</span>
                    </div>

                    {/* Avatar Stack */}
                    <div className="flex -space-x-2">
                        <AnimatePresence>
                            {peers.slice(0, 5).map((peer, i) => (
                                <motion.div
                                    key={peer.userId}
                                    initial={{ opacity: 0, scale: 0.5, x: -8 }}
                                    animate={{ opacity: 1, scale: 1, x: 0 }}
                                    exit={{ opacity: 0, scale: 0.5, x: -8 }}
                                    transition={{ delay: i * 0.05 }}
                                    className="relative group"
                                >
                                    <div
                                        className="w-7 h-7 rounded-full border-2 border-zinc-900 flex items-center justify-center text-[10px] font-bold text-white shadow-md"
                                        style={{ backgroundColor: peer.color }}
                                    >
                                        {peer.email.charAt(0).toUpperCase()}
                                    </div>

                                    {/* Tooltip */}
                                    <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                                        <div className="bg-zinc-800 border border-zinc-700/50 rounded-lg px-2.5 py-1.5 text-[11px] text-zinc-200 whitespace-nowrap shadow-xl">
                                            {peer.email}
                                            <div className="flex items-center gap-1 mt-0.5">
                                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                                <span className="text-[10px] text-zinc-500">Online</span>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>

                        {/* Overflow indicator */}
                        {peers.length > 5 && (
                            <div className="w-7 h-7 rounded-full border-2 border-zinc-900 bg-zinc-700 flex items-center justify-center text-[10px] font-bold text-zinc-300">
                                +{peers.length - 5}
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* Solo text when connected but no peers */}
            {peers.length === 0 && connectionStatus === 'connected' && (
                <>
                    <div className="w-px h-4 bg-zinc-700/50" />
                    <span className="text-[10px] text-zinc-500 font-medium">Only you</span>
                </>
            )}
        </div>
    );
}
