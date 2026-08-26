// 自訂問事類別管理元件
// 使用者可以新增、編輯、刪除自訂的問事類別標籤，
// 包括名稱與圖示選擇。自訂類別會自動合併到抽棋/棋盤頁面的類別選單。

import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, Modal,
} from 'react-native';
import { Icon } from '@/components/icons';
import type { IconName } from '@/components/icons/Icon';
import type { CustomCategory } from '@/services/storage';
import { getSettings, saveSettings, deleteCustomCategory } from '@/services/storage';
import { confirmAction } from '@/services/dialog';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useI18n } from '@/hooks/useI18n';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import type { ThemeColors } from '@/constants/theme';
import { Spacing, FontSize } from '@/constants/theme';

// 可供選擇的圖示清單（不包含已用作其他用途的系統圖示）
const AVAILABLE_ICONS: IconName[] = [
  'crystal-ball', 'love', 'career', 'wealth', 'health', 'study', 'travel',
  'star', 'flame', 'lantern', 'location', 'lightbulb', 'home', 'heart',
  'trophy', 'graduation', 'fire', 'scroll', 'folder',
];

interface Props {
  onChanged?: () => void;
}

export default function CustomCategoriesSection({ onChanged }: Props) {
  const { theme } = useAppTheme();
  const styles = useThemedStyles(makeStyles);
  const { t } = useI18n();
  const [categories, setCategories] = useState<CustomCategory[]>([]);
  const [showEditor, setShowEditor] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editIcon, setEditIcon] = useState<IconName>('star');
  const [showIconPicker, setShowIconPicker] = useState(false);

  useEffect(() => { loadCategories(); }, []);

  async function loadCategories() {
    const s = await getSettings();
    setCategories(s.customCategories || []);
  }

  async function saveCategories(updated: CustomCategory[]) {
    await saveSettings({ customCategories: updated });
    setCategories(updated);
    onChanged?.();
  }

  function openAdd() {
    setEditingIndex(null);
    setEditLabel('');
    setEditIcon('star');
    setShowEditor(true);
  }

  function openEdit(index: number) {
    setEditingIndex(index);
    setEditLabel(categories[index].label);
    setEditIcon(categories[index].icon as IconName);
    setShowEditor(true);
  }

  async function handleSave() {
    if (!editLabel.trim()) return;
    const key = `custom-${Date.now()}`;
    const entry: CustomCategory = {
      key: editingIndex !== null ? categories[editingIndex].key : key,
      label: editLabel.trim(),
      icon: editIcon,
    };

    let updated: CustomCategory[];
    if (editingIndex !== null) {
      updated = [...categories];
      updated[editingIndex] = entry;
    } else {
      updated = [...categories, entry];
    }
    await saveCategories(updated);
    setShowEditor(false);
  }

  async function handleDelete(index: number) {
    const confirmed = await confirmAction({
      title: t('category.deleteTitle'),
      message: t('category.deleteDesc', { name: categories[index].label }),
      confirmLabel: t('common.delete'),
      cancelLabel: t('common.cancel'),
      destructive: true,
    });
    if (!confirmed) return;
    // 走 deleteCustomCategory 而非直接寫回剩下的類別：刪除要留墓碑，
    // 否則另一台裝置的舊副本會在下次同步時把它復活
    const remaining = await deleteCustomCategory(categories[index].key);
    setCategories(remaining);
    onChanged?.();
  }

  return (
    <View style={[styles.section, { backgroundColor: theme.bgDark, borderColor: theme.bgMedium }]}>
      <Text style={[styles.sectionTitle, { color: theme.textGold }]}>{t('category.title')}</Text>
      <Text style={[styles.hint, { color: theme.textMuted }]}>
        {t('category.desc')}
      </Text>

      {categories.map((cat, i) => (
        <View key={cat.key} style={styles.catRow}>
          <Icon name={cat.icon as IconName} size={18} color={theme.gold} />
          <Text style={[styles.catLabel, { color: theme.textPrimary }]}>{cat.label}</Text>
          <TouchableOpacity onPress={() => openEdit(i)} style={styles.actionBtn}>
            <Text style={{ color: theme.textMuted, fontSize: 12 }}>{t('common.edit')}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleDelete(i)} style={styles.actionBtn}>
            <Icon name="trash" size={14} color={theme.textRed} />
          </TouchableOpacity>
        </View>
      ))}

      {categories.length === 0 && (
        <Text style={[styles.emptyHint, { color: theme.textMuted }]}>
          {t('category.empty')}
        </Text>
      )}

      <TouchableOpacity style={[styles.addBtn, { borderColor: theme.textGold }]} onPress={openAdd}>
        <Text style={{ color: theme.textGold }}>＋ {t('category.add')}</Text>
      </TouchableOpacity>

      {/* 編輯 Modal */}
      <Modal visible={showEditor} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.bgDark, borderColor: theme.bgMedium }]}>
            <Text style={[styles.modalTitle, { color: theme.textGold }]}>
              {editingIndex !== null ? t('category.edit') : t('category.add')}
            </Text>

            <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>{t('common.name')}</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.bgInk, borderColor: theme.bgMedium, color: theme.textPrimary }]}
              value={editLabel}
              onChangeText={setEditLabel}
              placeholder={t('category.namePlaceholder')}
              placeholderTextColor={theme.textMuted}
              maxLength={8}
              autoFocus
            />

            <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>{t('common.icon')}</Text>
            <TouchableOpacity
              style={[styles.iconSelectBtn, { backgroundColor: theme.bgCard, borderColor: theme.bgMedium }]}
              onPress={() => setShowIconPicker(!showIconPicker)}
            >
              <Icon name={editIcon} size={20} color={theme.gold} />
              <Text style={[styles.iconSelectLabel, { color: theme.textPrimary }]}> {editIcon}</Text>
            </TouchableOpacity>

            {showIconPicker && (
              <View style={[styles.iconGrid, { backgroundColor: theme.bgCard, borderColor: theme.bgMedium }]}>
                <ScrollView style={{ maxHeight: 160 }} showsVerticalScrollIndicator={false}>
                  <View style={styles.iconGridInner}>
                    {AVAILABLE_ICONS.map((name) => (
                      <TouchableOpacity
                        key={name}
                        style={[styles.iconCell, editIcon === name && { borderColor: theme.gold, backgroundColor: theme.bgMedium }]}
                        onPress={() => { setEditIcon(name); setShowIconPicker(false); }}
                      >
                        <Icon name={name} size={20} color={editIcon === name ? theme.gold : theme.textMuted} />
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setShowEditor(false)} style={[styles.modalBtn, { borderColor: theme.bgMedium }]}>
                <Text style={{ color: theme.textMuted }}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSave} style={[styles.modalBtn, { backgroundColor: theme.gold }]}>
                <Text style={{ color: theme.textInverse, fontWeight: '600' }}>{t('common.save')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const makeStyles = (t: ThemeColors) => StyleSheet.create({
  section: {
    borderRadius: 12, borderWidth: 1, padding: Spacing.md, marginBottom: Spacing.md,
  },
  sectionTitle: { fontSize: FontSize.small, fontWeight: '600', marginBottom: Spacing.xs },
  hint: { fontSize: 12, marginBottom: Spacing.sm, lineHeight: 18 },
  catRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: Spacing.sm, borderTopWidth: 1, borderTopColor: t.bgMedium,
    gap: 8,
  },
  catLabel: { fontSize: FontSize.body, flex: 1 },
  actionBtn: { padding: 4 },
  emptyHint: { fontSize: 13, textAlign: 'center', paddingVertical: Spacing.md },
  addBtn: {
    borderWidth: 1, borderStyle: 'dashed', borderRadius: 10,
    padding: Spacing.sm, alignItems: 'center', marginTop: Spacing.sm,
  },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center', justifyContent: 'center',
    padding: Spacing.lg,
  },
  modalContent: {
    width: '100%', maxWidth: 400,
    borderRadius: 16, borderWidth: 1,
    padding: Spacing.lg,
  },
  modalTitle: { fontSize: FontSize.subtitle, fontWeight: '700', marginBottom: Spacing.md, textAlign: 'center' },
  fieldLabel: { fontSize: FontSize.small, marginBottom: 6, marginTop: Spacing.sm },
  input: {
    borderRadius: 8, borderWidth: 1,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: FontSize.body,
  },
  iconSelectBtn: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 8, borderWidth: 1,
    paddingHorizontal: 12, paddingVertical: 10, gap: 8,
  },
  iconSelectLabel: { fontSize: FontSize.body },
  iconGrid: {
    borderRadius: 8, borderWidth: 1, marginTop: 8,
    padding: 8,
  },
  iconGridInner: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 6,
  },
  iconCell: {
    width: 40, height: 40, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: t.bgMedium, borderWidth: 1, borderColor: 'transparent',
  },
  modalActions: {
    flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.lg,
  },
  modalBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 8,
    borderWidth: 1, borderColor: t.bgMedium,
    alignItems: 'center',
  },
});
