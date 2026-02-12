/**
 * SettingsScreen — App configuration, permissions, and about section.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    TextInput,
    Switch,
    TouchableOpacity,
    ScrollView,
    StyleSheet,
    Alert,
    Linking,
    Platform,
    StatusBar,
} from 'react-native';
import { Colors, Spacing, FontSize, BorderRadius } from '../theme/cosmic';
import { getSettings, updateSettings, clearHistory, type Settings } from '../services/storage';

export default function SettingsScreen() {
    const [settings, setSettings] = useState<Settings>({
        autoEnhance: true,
        apiKey: '',
        clipboardMonitor: true,
        hapticFeedback: true,
    });
    const [apiKeyVisible, setApiKeyVisible] = useState(false);

    const loadSettings = useCallback(async () => {
        const s = await getSettings();
        setSettings(s);
    }, []);

    useEffect(() => {
        loadSettings();
    }, [loadSettings]);

    const handleToggle = async (key: keyof Settings, value: boolean) => {
        const updated = await updateSettings({ [key]: value });
        setSettings(updated);
    };

    const handleApiKeyChange = async (text: string) => {
        setSettings(prev => ({ ...prev, apiKey: text }));
        await updateSettings({ apiKey: text });
    };

    const handleClearData = () => {
        Alert.alert(
            'Clear All Data',
            'This will delete all history and settings. This cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Clear Everything',
                    style: 'destructive',
                    onPress: async () => {
                        await clearHistory();
                        Alert.alert('Done', 'All data cleared.');
                    },
                },
            ],
        );
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={Colors.bg.primary} />
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}>
                {/* Title */}
                <Text style={styles.title}>⚙️ Settings</Text>

                {/* Enhancement Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Enhancement</Text>

                    <View style={styles.row}>
                        <View style={styles.rowInfo}>
                            <Text style={styles.rowLabel}>Auto-Enhance</Text>
                            <Text style={styles.rowDesc}>
                                Automatically enhance when text is detected
                            </Text>
                        </View>
                        <Switch
                            value={settings.autoEnhance}
                            onValueChange={v => handleToggle('autoEnhance', v)}
                            trackColor={{ false: Colors.bg.input, true: Colors.accent.primary + '60' }}
                            thumbColor={settings.autoEnhance ? Colors.accent.primary : '#666'}
                        />
                    </View>

                    <View style={styles.row}>
                        <View style={styles.rowInfo}>
                            <Text style={styles.rowLabel}>Clipboard Monitor</Text>
                            <Text style={styles.rowDesc}>
                                Detect prompts from clipboard
                            </Text>
                        </View>
                        <Switch
                            value={settings.clipboardMonitor}
                            onValueChange={v => handleToggle('clipboardMonitor', v)}
                            trackColor={{ false: Colors.bg.input, true: Colors.accent.primary + '60' }}
                            thumbColor={settings.clipboardMonitor ? Colors.accent.primary : '#666'}
                        />
                    </View>

                    <View style={styles.row}>
                        <View style={styles.rowInfo}>
                            <Text style={styles.rowLabel}>Haptic Feedback</Text>
                            <Text style={styles.rowDesc}>
                                Vibrate on enhancement complete
                            </Text>
                        </View>
                        <Switch
                            value={settings.hapticFeedback}
                            onValueChange={v => handleToggle('hapticFeedback', v)}
                            trackColor={{ false: Colors.bg.input, true: Colors.accent.primary + '60' }}
                            thumbColor={settings.hapticFeedback ? Colors.accent.primary : '#666'}
                        />
                    </View>
                </View>

                {/* API Key Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>API Key</Text>
                    <Text style={styles.sectionDesc}>
                        Optional. Connect your PromptX API key for premium enhancements.
                    </Text>

                    <View style={styles.apiKeyRow}>
                        <TextInput
                            style={styles.apiKeyInput}
                            value={settings.apiKey}
                            onChangeText={handleApiKeyChange}
                            placeholder="px_xxxxxxxxxxxxxxxx"
                            placeholderTextColor={Colors.text.muted}
                            secureTextEntry={!apiKeyVisible}
                            autoCapitalize="none"
                            autoCorrect={false}
                        />
                        <TouchableOpacity
                            style={styles.eyeBtn}
                            onPress={() => setApiKeyVisible(!apiKeyVisible)}>
                            <Text style={styles.eyeText}>
                                {apiKeyVisible ? '🙈' : '👁️'}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                        style={styles.getKeyBtn}
                        onPress={() =>
                            Linking.openURL('https://promptx.app/settings')
                        }>
                        <Text style={styles.getKeyBtnText}>🔑 Get API Key →</Text>
                    </TouchableOpacity>
                </View>

                {/* Permissions Section (Android only) */}
                {Platform.OS === 'android' && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Permissions</Text>

                        <TouchableOpacity
                            style={styles.permissionBtn}
                            onPress={() =>
                                Linking.openURL(
                                    'package:com.promptxmobile',
                                )
                            }>
                            <View style={styles.rowInfo}>
                                <Text style={styles.rowLabel}>Display Over Other Apps</Text>
                                <Text style={styles.rowDesc}>
                                    Required for floating overlay bubble
                                </Text>
                            </View>
                            <Text style={styles.arrowText}>→</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.permissionBtn}
                            onPress={() =>
                                Linking.openURL('app-settings:')
                            }>
                            <View style={styles.rowInfo}>
                                <Text style={styles.rowLabel}>Accessibility Service</Text>
                                <Text style={styles.rowDesc}>
                                    Required for text detection in other apps
                                </Text>
                            </View>
                            <Text style={styles.arrowText}>→</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Data Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Data</Text>

                    <TouchableOpacity
                        style={styles.dangerBtn}
                        onPress={handleClearData}>
                        <Text style={styles.dangerBtnText}>🗑️ Clear All Data</Text>
                    </TouchableOpacity>
                </View>

                {/* About */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>About</Text>
                    <View style={styles.aboutCard}>
                        <Text style={styles.aboutLogo}>⚡ PromptX Mobile</Text>
                        <Text style={styles.aboutVersion}>Version 1.0.0</Text>
                        <Text style={styles.aboutDesc}>
                            Phase 3: Mobile overlay for AI prompt enhancement.{'\n'}
                            Works system-wide across any app.
                        </Text>
                        <View style={styles.aboutLinks}>
                            <TouchableOpacity
                                onPress={() => Linking.openURL('https://promptx.app')}>
                                <Text style={styles.linkText}>Website</Text>
                            </TouchableOpacity>
                            <Text style={styles.aboutDot}>•</Text>
                            <TouchableOpacity
                                onPress={() =>
                                    Linking.openURL(
                                        'https://github.com/anshpalbusiness-art/prompx-io-18771',
                                    )
                                }>
                                <Text style={styles.linkText}>GitHub</Text>
                            </TouchableOpacity>
                        </View>
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
    title: {
        fontSize: FontSize.xxl,
        fontWeight: '800',
        color: Colors.text.primary,
        marginBottom: Spacing.xl,
    },
    section: {
        marginBottom: Spacing.xxl,
    },
    sectionTitle: {
        fontSize: FontSize.lg,
        fontWeight: '700',
        color: Colors.text.primary,
        marginBottom: Spacing.sm,
    },
    sectionDesc: {
        fontSize: FontSize.sm,
        color: Colors.text.muted,
        marginBottom: Spacing.md,
        lineHeight: 20,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: Colors.bg.card,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: Colors.border.subtle,
        padding: Spacing.lg,
        marginBottom: Spacing.sm,
    },
    rowInfo: {
        flex: 1,
        marginRight: Spacing.md,
    },
    rowLabel: {
        fontSize: FontSize.md,
        fontWeight: '600',
        color: Colors.text.primary,
    },
    rowDesc: {
        fontSize: FontSize.sm,
        color: Colors.text.muted,
        marginTop: Spacing.xs,
    },
    apiKeyRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
    },
    apiKeyInput: {
        flex: 1,
        backgroundColor: Colors.bg.card,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: Colors.border.subtle,
        padding: Spacing.lg,
        fontSize: FontSize.md,
        color: Colors.text.primary,
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    },
    eyeBtn: {
        padding: Spacing.md,
        backgroundColor: Colors.bg.card,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: Colors.border.subtle,
    },
    eyeText: {
        fontSize: FontSize.lg,
    },
    getKeyBtn: {
        marginTop: Spacing.md,
        alignSelf: 'flex-start',
    },
    getKeyBtnText: {
        fontSize: FontSize.sm,
        color: Colors.accent.primary,
        fontWeight: '600',
    },
    permissionBtn: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: Colors.bg.card,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: Colors.border.subtle,
        padding: Spacing.lg,
        marginBottom: Spacing.sm,
    },
    arrowText: {
        fontSize: FontSize.lg,
        color: Colors.text.muted,
    },
    dangerBtn: {
        backgroundColor: Colors.accent.error + '10',
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: Colors.accent.error + '30',
        padding: Spacing.lg,
        alignItems: 'center',
    },
    dangerBtnText: {
        fontSize: FontSize.md,
        color: Colors.accent.error,
        fontWeight: '600',
    },
    aboutCard: {
        backgroundColor: Colors.bg.card,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: Colors.border.subtle,
        padding: Spacing.xl,
        alignItems: 'center',
    },
    aboutLogo: {
        fontSize: FontSize.xl,
        fontWeight: '800',
        color: Colors.text.primary,
        marginBottom: Spacing.xs,
    },
    aboutVersion: {
        fontSize: FontSize.sm,
        color: Colors.text.muted,
        marginBottom: Spacing.md,
    },
    aboutDesc: {
        fontSize: FontSize.sm,
        color: Colors.text.secondary,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: Spacing.md,
    },
    aboutLinks: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
    },
    linkText: {
        fontSize: FontSize.sm,
        color: Colors.accent.primary,
        fontWeight: '600',
    },
    aboutDot: {
        color: Colors.text.muted,
    },
});
