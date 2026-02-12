/**
 * HomeScreen — Main dashboard with prompt enhancement input.
 */
import React, { useState, useRef, useCallback } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    StyleSheet,
    ActivityIndicator,
    Animated,
    StatusBar,
    Platform,
} from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { Colors, Spacing, FontSize, BorderRadius } from '../theme/cosmic';
import { enhancePrompt, type EnhancementResult } from '../services/enhancer';
import { detectCategory, getCategoryColor, getCategoryEmoji } from '../services/categoryDetector';
import { addToHistory } from '../services/storage';

export default function HomeScreen() {
    const [prompt, setPrompt] = useState('');
    const [result, setResult] = useState<EnhancementResult | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [copied, setCopied] = useState(false);
    const [stats, setStats] = useState({ enhanced: 0, saved: 0 });
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.95)).current;

    const handleEnhance = useCallback(async () => {
        if (!prompt.trim() || prompt.trim().length < 5) return;

        setIsLoading(true);
        setResult(null);

        try {
            const detected = detectCategory(prompt);
            const enhanced = await enhancePrompt(prompt, detected.category);
            setResult(enhanced);
            await addToHistory(enhanced);
            setStats(prev => ({
                enhanced: prev.enhanced + 1,
                saved: prev.saved + Math.floor(Math.random() * 3 + 1),
            }));

            // Animate result in
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 400,
                    useNativeDriver: true,
                }),
                Animated.spring(scaleAnim, {
                    toValue: 1,
                    tension: 50,
                    friction: 7,
                    useNativeDriver: true,
                }),
            ]).start();
        } catch (error) {
            console.error('Enhancement failed:', error);
        } finally {
            setIsLoading(false);
        }
    }, [prompt, fadeAnim, scaleAnim]);

    const handleCopy = useCallback(() => {
        if (!result) return;
        Clipboard.setString(result.enhanced);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }, [result]);

    const handlePaste = useCallback(async () => {
        const text = await Clipboard.getString();
        if (text) setPrompt(text);
    }, []);

    const detected = prompt.length >= 5 ? detectCategory(prompt) : null;

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={Colors.bg.primary} />
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.logo}>⚡ PromptX</Text>
                    <Text style={styles.subtitle}>AI Prompt Enhancement</Text>
                </View>

                {/* Stats Row */}
                <View style={styles.statsRow}>
                    <View style={styles.statCard}>
                        <Text style={styles.statNumber}>{stats.enhanced}</Text>
                        <Text style={styles.statLabel}>Enhanced</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statNumber}>{stats.saved}m</Text>
                        <Text style={styles.statLabel}>Time Saved</Text>
                    </View>
                    <View style={[styles.statCard, { borderRightWidth: 0 }]}>
                        <Text style={styles.statNumber}>
                            {detected ? getCategoryEmoji(detected.category) : '✨'}
                        </Text>
                        <Text style={styles.statLabel}>
                            {detected ? detected.category : 'Ready'}
                        </Text>
                    </View>
                </View>

                {/* Input Card */}
                <View style={styles.inputCard}>
                    <View style={styles.inputHeader}>
                        <Text style={styles.inputLabel}>Your Prompt</Text>
                        <TouchableOpacity onPress={handlePaste} style={styles.pasteBtn}>
                            <Text style={styles.pasteBtnText}>📋 Paste</Text>
                        </TouchableOpacity>
                    </View>
                    <TextInput
                        style={styles.textInput}
                        value={prompt}
                        onChangeText={setPrompt}
                        placeholder="Type or paste your prompt here..."
                        placeholderTextColor={Colors.text.muted}
                        multiline
                        textAlignVertical="top"
                    />

                    {/* Category Badge */}
                    {detected && detected.score >= 2 && (
                        <View
                            style={[
                                styles.categoryBadge,
                                { backgroundColor: getCategoryColor(detected.category) + '20' },
                            ]}>
                            <Text
                                style={[
                                    styles.categoryText,
                                    { color: getCategoryColor(detected.category) },
                                ]}>
                                {getCategoryEmoji(detected.category)} {detected.category} detected
                            </Text>
                        </View>
                    )}

                    {/* Enhance Button */}
                    <TouchableOpacity
                        style={[
                            styles.enhanceBtn,
                            (!prompt.trim() || prompt.trim().length < 5) &&
                            styles.enhanceBtnDisabled,
                        ]}
                        onPress={handleEnhance}
                        disabled={!prompt.trim() || prompt.trim().length < 5 || isLoading}
                        activeOpacity={0.8}>
                        {isLoading ? (
                            <ActivityIndicator color="#FFF" size="small" />
                        ) : (
                            <Text style={styles.enhanceBtnText}>⚡ Enhance Prompt</Text>
                        )}
                    </TouchableOpacity>
                </View>

                {/* Result Card */}
                {result && (
                    <Animated.View
                        style={[
                            styles.resultCard,
                            { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
                        ]}>
                        <View style={styles.resultHeader}>
                            <Text style={styles.resultLabel}>✨ Enhanced Prompt</Text>
                            <TouchableOpacity onPress={handleCopy} style={styles.copyBtn}>
                                <Text style={styles.copyBtnText}>
                                    {copied ? '✅ Copied!' : '📋 Copy'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.resultText}>{result.enhanced}</Text>

                        {/* Improvement Summary */}
                        <View style={styles.improvementBadge}>
                            <Text style={styles.improvementText}>
                                💡 {result.improvement}
                            </Text>
                        </View>

                        {/* Tips */}
                        {result.tips.length > 0 && (
                            <View style={styles.tipsContainer}>
                                {result.tips.map((tip, i) => (
                                    <View key={i} style={styles.tipRow}>
                                        <Text style={styles.tipDot}>•</Text>
                                        <Text style={styles.tipText}>{tip}</Text>
                                    </View>
                                ))}
                            </View>
                        )}
                    </Animated.View>
                )}

                {/* Quick Actions */}
                <View style={styles.quickActions}>
                    <Text style={styles.quickTitle}>Quick Actions</Text>
                    <View style={styles.quickGrid}>
                        {[
                            { emoji: '📋', label: 'From Clipboard', action: handlePaste },
                            {
                                emoji: '🔄',
                                label: 'Re-enhance',
                                action: result ? handleEnhance : undefined,
                            },
                            { emoji: '📤', label: 'Copy Result', action: result ? handleCopy : undefined },
                            {
                                emoji: '🗑️',
                                label: 'Clear',
                                action: () => {
                                    setPrompt('');
                                    setResult(null);
                                },
                            },
                        ].map((item, i) => (
                            <TouchableOpacity
                                key={i}
                                style={[styles.quickBtn, !item.action && styles.quickBtnDisabled]}
                                onPress={item.action}
                                disabled={!item.action}>
                                <Text style={styles.quickEmoji}>{item.emoji}</Text>
                                <Text style={styles.quickLabel}>{item.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.bg.primary,
    },
    scrollContent: {
        padding: Spacing.lg,
        paddingTop: Platform.OS === 'android' ? Spacing.xxl : Spacing.xxxl + 20,
        paddingBottom: 100,
    },
    header: {
        alignItems: 'center',
        marginBottom: Spacing.xxl,
    },
    logo: {
        fontSize: FontSize.xxxl,
        fontWeight: '800',
        color: Colors.text.primary,
        letterSpacing: -1,
    },
    subtitle: {
        fontSize: FontSize.md,
        color: Colors.text.muted,
        marginTop: Spacing.xs,
    },
    statsRow: {
        flexDirection: 'row',
        backgroundColor: Colors.bg.card,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: Colors.border.subtle,
        marginBottom: Spacing.xl,
        overflow: 'hidden',
    },
    statCard: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: Spacing.lg,
        borderRightWidth: 1,
        borderRightColor: Colors.border.subtle,
    },
    statNumber: {
        fontSize: FontSize.xl,
        fontWeight: '700',
        color: Colors.text.primary,
    },
    statLabel: {
        fontSize: FontSize.xs,
        color: Colors.text.muted,
        marginTop: Spacing.xs,
        textTransform: 'capitalize',
    },
    inputCard: {
        backgroundColor: Colors.bg.card,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: Colors.border.subtle,
        padding: Spacing.lg,
        marginBottom: Spacing.xl,
    },
    inputHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.md,
    },
    inputLabel: {
        fontSize: FontSize.md,
        fontWeight: '600',
        color: Colors.text.primary,
    },
    pasteBtn: {
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.xs,
        backgroundColor: Colors.bg.input,
        borderRadius: BorderRadius.sm,
        borderWidth: 1,
        borderColor: Colors.border.subtle,
    },
    pasteBtnText: {
        fontSize: FontSize.sm,
        color: Colors.text.secondary,
    },
    textInput: {
        backgroundColor: Colors.bg.input,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: Colors.border.subtle,
        padding: Spacing.lg,
        fontSize: FontSize.md,
        color: Colors.text.primary,
        minHeight: 120,
        maxHeight: 200,
        lineHeight: 22,
    },
    categoryBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.xs,
        borderRadius: BorderRadius.full,
        marginTop: Spacing.md,
    },
    categoryText: {
        fontSize: FontSize.sm,
        fontWeight: '600',
    },
    enhanceBtn: {
        backgroundColor: Colors.accent.primary,
        borderRadius: BorderRadius.md,
        paddingVertical: Spacing.lg,
        alignItems: 'center',
        marginTop: Spacing.lg,
    },
    enhanceBtnDisabled: {
        opacity: 0.4,
    },
    enhanceBtnText: {
        fontSize: FontSize.lg,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    resultCard: {
        backgroundColor: Colors.bg.card,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: Colors.accent.primary + '30',
        padding: Spacing.lg,
        marginBottom: Spacing.xl,
    },
    resultHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.md,
    },
    resultLabel: {
        fontSize: FontSize.md,
        fontWeight: '600',
        color: Colors.accent.primary,
    },
    copyBtn: {
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.xs,
        backgroundColor: Colors.accent.primary + '15',
        borderRadius: BorderRadius.sm,
        borderWidth: 1,
        borderColor: Colors.accent.primary + '30',
    },
    copyBtnText: {
        fontSize: FontSize.sm,
        color: Colors.accent.primary,
        fontWeight: '600',
    },
    resultText: {
        fontSize: FontSize.md,
        color: Colors.text.primary,
        lineHeight: 24,
        letterSpacing: 0.2,
    },
    improvementBadge: {
        backgroundColor: Colors.accent.success + '15',
        borderRadius: BorderRadius.sm,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        marginTop: Spacing.lg,
        alignSelf: 'flex-start',
    },
    improvementText: {
        fontSize: FontSize.sm,
        color: Colors.accent.success,
        fontWeight: '500',
    },
    tipsContainer: {
        marginTop: Spacing.md,
        paddingTop: Spacing.md,
        borderTopWidth: 1,
        borderTopColor: Colors.border.subtle,
    },
    tipRow: {
        flexDirection: 'row',
        marginBottom: Spacing.xs,
    },
    tipDot: {
        color: Colors.text.muted,
        marginRight: Spacing.sm,
        marginTop: 2,
    },
    tipText: {
        flex: 1,
        fontSize: FontSize.sm,
        color: Colors.text.secondary,
        lineHeight: 20,
    },
    quickActions: {
        marginBottom: Spacing.xxl,
    },
    quickTitle: {
        fontSize: FontSize.md,
        fontWeight: '600',
        color: Colors.text.primary,
        marginBottom: Spacing.md,
    },
    quickGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.md,
    },
    quickBtn: {
        flex: 1,
        minWidth: '45%',
        backgroundColor: Colors.bg.card,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: Colors.border.subtle,
        padding: Spacing.lg,
        alignItems: 'center',
    },
    quickBtnDisabled: {
        opacity: 0.35,
    },
    quickEmoji: {
        fontSize: FontSize.xl,
        marginBottom: Spacing.xs,
    },
    quickLabel: {
        fontSize: FontSize.sm,
        color: Colors.text.secondary,
        fontWeight: '500',
    },
});
