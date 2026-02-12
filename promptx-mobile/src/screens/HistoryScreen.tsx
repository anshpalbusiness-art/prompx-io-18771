/**
 * HistoryScreen — Shows enhancement history with copy/delete actions.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    FlatList,
    StyleSheet,
    Alert,
    StatusBar,
    Platform,
} from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { Colors, Spacing, FontSize, BorderRadius } from '../theme/cosmic';
import { getHistory, clearHistory } from '../services/storage';
import { getCategoryColor, getCategoryEmoji } from '../services/categoryDetector';
import type { EnhancementResult } from '../services/enhancer';

export default function HistoryScreen() {
    const [history, setHistory] = useState<EnhancementResult[]>([]);
    const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

    const loadHistory = useCallback(async () => {
        const items = await getHistory();
        setHistory(items);
    }, []);

    useEffect(() => {
        loadHistory();
    }, [loadHistory]);

    // Refresh on focus
    useEffect(() => {
        const interval = setInterval(loadHistory, 3000);
        return () => clearInterval(interval);
    }, [loadHistory]);

    const handleCopy = (text: string, idx: number) => {
        Clipboard.setString(text);
        setCopiedIdx(idx);
        setTimeout(() => setCopiedIdx(null), 2000);
    };

    const handleClearAll = () => {
        Alert.alert('Clear History', 'Delete all enhancement history?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Clear All',
                style: 'destructive',
                onPress: async () => {
                    await clearHistory();
                    setHistory([]);
                },
            },
        ]);
    };

    const formatTime = (ts: number) => {
        const d = new Date(ts);
        const now = new Date();
        const diff = now.getTime() - d.getTime();
        if (diff < 60000) return 'Just now';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
        return d.toLocaleDateString();
    };

    const renderItem = ({ item, index }: { item: EnhancementResult; index: number }) => (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <View
                    style={[
                        styles.categoryBadge,
                        { backgroundColor: getCategoryColor(item.category as any) + '20' },
                    ]}>
                    <Text
                        style={[
                            styles.categoryText,
                            { color: getCategoryColor(item.category as any) },
                        ]}>
                        {getCategoryEmoji(item.category as any)} {item.category}
                    </Text>
                </View>
                <Text style={styles.timeText}>{formatTime(item.timestamp)}</Text>
            </View>

            <Text style={styles.enhancedText} numberOfLines={4}>
                {item.enhanced}
            </Text>

            <View style={styles.cardActions}>
                <TouchableOpacity
                    style={styles.copyBtn}
                    onPress={() => handleCopy(item.enhanced, index)}>
                    <Text style={styles.copyBtnText}>
                        {copiedIdx === index ? '✅ Copied!' : '📋 Copy'}
                    </Text>
                </TouchableOpacity>
                <Text style={styles.improvementText}>💡 {item.improvement}</Text>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={Colors.bg.primary} />
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.title}>📜 History</Text>
                {history.length > 0 && (
                    <TouchableOpacity onPress={handleClearAll} style={styles.clearBtn}>
                        <Text style={styles.clearBtnText}>Clear All</Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Stats */}
            <View style={styles.statsBar}>
                <Text style={styles.statsText}>{history.length} enhancements</Text>
            </View>

            {history.length === 0 ? (
                <View style={styles.emptyState}>
                    <Text style={styles.emptyEmoji}>🕐</Text>
                    <Text style={styles.emptyTitle}>No History Yet</Text>
                    <Text style={styles.emptySubtitle}>
                        Enhanced prompts will appear here
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={history}
                    renderItem={renderItem}
                    keyExtractor={(_, i) => i.toString()}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.bg.primary,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: Spacing.lg,
        paddingTop: Platform.OS === 'android' ? Spacing.xxl : Spacing.xxxl + 20,
        paddingBottom: Spacing.md,
    },
    title: {
        fontSize: FontSize.xxl,
        fontWeight: '800',
        color: Colors.text.primary,
    },
    clearBtn: {
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        backgroundColor: Colors.accent.error + '15',
        borderRadius: BorderRadius.sm,
        borderWidth: 1,
        borderColor: Colors.accent.error + '30',
    },
    clearBtnText: {
        fontSize: FontSize.sm,
        color: Colors.accent.error,
        fontWeight: '600',
    },
    statsBar: {
        paddingHorizontal: Spacing.lg,
        paddingBottom: Spacing.md,
    },
    statsText: {
        fontSize: FontSize.sm,
        color: Colors.text.muted,
    },
    listContent: {
        padding: Spacing.lg,
        paddingTop: 0,
        paddingBottom: 100,
    },
    card: {
        backgroundColor: Colors.bg.card,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: Colors.border.subtle,
        padding: Spacing.lg,
        marginBottom: Spacing.md,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.md,
    },
    categoryBadge: {
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.xs,
        borderRadius: BorderRadius.full,
    },
    categoryText: {
        fontSize: FontSize.xs,
        fontWeight: '600',
    },
    timeText: {
        fontSize: FontSize.xs,
        color: Colors.text.muted,
    },
    enhancedText: {
        fontSize: FontSize.md,
        color: Colors.text.primary,
        lineHeight: 22,
    },
    cardActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: Spacing.md,
        paddingTop: Spacing.md,
        borderTopWidth: 1,
        borderTopColor: Colors.border.subtle,
    },
    copyBtn: {
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.xs,
        backgroundColor: Colors.accent.primary + '15',
        borderRadius: BorderRadius.sm,
    },
    copyBtnText: {
        fontSize: FontSize.sm,
        color: Colors.accent.primary,
        fontWeight: '600',
    },
    improvementText: {
        fontSize: FontSize.xs,
        color: Colors.text.muted,
        flex: 1,
        textAlign: 'right',
        marginLeft: Spacing.sm,
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingBottom: 100,
    },
    emptyEmoji: {
        fontSize: 48,
        marginBottom: Spacing.lg,
    },
    emptyTitle: {
        fontSize: FontSize.xl,
        fontWeight: '700',
        color: Colors.text.primary,
        marginBottom: Spacing.sm,
    },
    emptySubtitle: {
        fontSize: FontSize.md,
        color: Colors.text.muted,
    },
});
