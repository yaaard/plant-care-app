import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { EmptyState } from '@/components/EmptyState';
import { FormField } from '@/components/FormField';
import { HealthTagSelector } from '@/components/HealthTagSelector';
import { SearchBar } from '@/components/SearchBar';
import { DismissKeyboard } from '@/components/ui/DismissKeyboard';
import {
  HUMIDITY_CONDITION_OPTIONS,
  LIGHT_CONDITION_OPTIONS,
} from '@/constants/plantGuide';
import { DEFAULT_PLANT_FORM_VALUES } from '@/constants/defaultValues';
import { AppTheme } from '@/constants/theme';
import { usePlantCatalog } from '@/hooks/usePlantCatalog';
import { todayString } from '@/lib/date';
import { pickImageFromLibraryAsync } from '@/lib/image-picker';
import { buildPlantFormAutofillFromCatalog } from '@/lib/plant-catalog-repo';
import { normalizePlantFormValues, validatePlantForm } from '@/lib/validators';
import {
  formatCatalogSummary,
  type PlantCatalogPlant,
} from '@/types/plant-catalog';
import type { PlantFormValues } from '@/types/plant';

type PlantFormMode = 'add' | 'edit';

type PlantFormProps = {
  initialValues?: PlantFormValues;
  submitLabel: string;
  loading?: boolean;
  errorMessage?: string | null;
  mode?: PlantFormMode;
  onSubmit: (values: PlantFormValues) => Promise<void> | void;
};

function SelectionGroup({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly string[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <View style={styles.groupBlock}>
      <Text style={styles.groupLabel}>{label}</Text>
      <View style={styles.optionsWrap}>
        {options.map((option) => {
          const selected = value === option;

          return (
            <Pressable
              key={option}
              onPress={() => onChange(option)}
              style={({ pressed }) => [
                styles.optionChip,
                selected && styles.optionChipSelected,
                pressed && styles.pressed,
              ]}
            >
              <Text style={[styles.optionChipText, selected && styles.optionChipTextSelected]}>
                {option}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function CatalogPlantRow({
  plant,
  selected,
  onPress,
}: {
  plant: PlantCatalogPlant;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.catalogRow,
        selected && styles.catalogRowSelected,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.catalogRowHeader}>
        <View style={styles.catalogTitleBlock}>
          <Text style={styles.catalogName}>{plant.nameRu}</Text>
          <Text style={styles.catalogLatin}>{plant.nameLatin}</Text>
        </View>
        {selected ? <Text style={styles.catalogSelectedLabel}>Выбрано</Text> : null}
      </View>

      <Text style={styles.catalogMeta}>{plant.category}</Text>
      <Text numberOfLines={2} style={styles.catalogDescription}>
        {plant.description}
      </Text>
      <Text style={styles.catalogSummary}>{formatCatalogSummary(plant)}</Text>
    </Pressable>
  );
}

export function PlantForm({
  initialValues = DEFAULT_PLANT_FORM_VALUES,
  submitLabel,
  loading = false,
  errorMessage,
  mode = 'add',
  onSubmit,
}: PlantFormProps) {
  const { plants: catalogPlants, loading: catalogLoading, error: catalogError } = usePlantCatalog();

  const [catalogPlantId, setCatalogPlantId] = useState(initialValues.catalogPlantId);
  const [catalogQuery, setCatalogQuery] = useState('');
  const [catalogModalVisible, setCatalogModalVisible] = useState(false);
  const [name, setName] = useState(initialValues.name);
  const [species, setSpecies] = useState(initialValues.species);
  const [photoUri, setPhotoUri] = useState<string | null>(initialValues.photoUri);
  const [lastWateringDate, setLastWateringDate] = useState(initialValues.lastWateringDate ?? '');
  const [wateringIntervalDays, setWateringIntervalDays] = useState(
    String(initialValues.wateringIntervalDays)
  );
  const [notes, setNotes] = useState(initialValues.notes);
  const [lightCondition, setLightCondition] = useState(initialValues.lightCondition);
  const [humidityCondition, setHumidityCondition] = useState(initialValues.humidityCondition);
  const [roomTemperature, setRoomTemperature] = useState(initialValues.roomTemperature);
  const [conditionTags, setConditionTags] = useState(initialValues.conditionTags);
  const [customCareComment, setCustomCareComment] = useState(initialValues.customCareComment);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  useEffect(() => {
    setCatalogPlantId(initialValues.catalogPlantId);
    setCatalogQuery('');
    setCatalogModalVisible(false);
    setName(initialValues.name);
    setSpecies(initialValues.species);
    setPhotoUri(initialValues.photoUri);
    setLastWateringDate(initialValues.lastWateringDate ?? '');
    setWateringIntervalDays(String(initialValues.wateringIntervalDays));
    setNotes(initialValues.notes);
    setLightCondition(initialValues.lightCondition);
    setHumidityCondition(initialValues.humidityCondition);
    setRoomTemperature(initialValues.roomTemperature);
    setConditionTags(initialValues.conditionTags);
    setCustomCareComment(initialValues.customCareComment);
    setValidationErrors([]);
  }, [initialValues]);

  const selectedCatalogPlant = useMemo(
    () => catalogPlants.find((item) => item.id === catalogPlantId) ?? null,
    [catalogPlantId, catalogPlants]
  );

  const filteredCatalogPlants = useMemo(() => {
    const normalizedQuery = catalogQuery.trim().toLowerCase();

    if (!normalizedQuery) {
      return catalogPlants;
    }

    return catalogPlants.filter((item) => {
      const searchValue = `${item.nameRu} ${item.nameLatin} ${item.slug}`.toLowerCase();
      return searchValue.includes(normalizedQuery);
    });
  }, [catalogPlants, catalogQuery]);

  const handlePickPhoto = async () => {
    Keyboard.dismiss();
    const selectedUri = await pickImageFromLibraryAsync();

    if (selectedUri) {
      setPhotoUri(selectedUri);
    }
  };

  const applyCatalogSelection = (
    plant: PlantCatalogPlant,
    overwriteCareFields: boolean
  ) => {
    const autofill = buildPlantFormAutofillFromCatalog(plant);

    setCatalogPlantId(plant.id);
    setSpecies(plant.nameRu);

    if (overwriteCareFields) {
      setWateringIntervalDays(String(autofill.wateringIntervalDays));
      setLightCondition(autofill.lightCondition);
      setHumidityCondition(autofill.humidityCondition);
      setRoomTemperature(autofill.roomTemperature);
    }

    setNotes((currentValue) =>
      currentValue.trim() ? currentValue : autofill.notes
    );

    setCatalogModalVisible(false);
    setCatalogQuery('');
  };

  const handleCatalogSelection = (plant: PlantCatalogPlant) => {
    const hasManualCareValues =
      Boolean(lightCondition.trim()) ||
      Boolean(humidityCondition.trim()) ||
      Boolean(roomTemperature.trim()) ||
      Boolean(notes.trim()) ||
      Number(wateringIntervalDays) !== initialValues.wateringIntervalDays;

    if (
      mode === 'edit' &&
      plant.id !== catalogPlantId &&
      hasManualCareValues
    ) {
      Alert.alert(
        'Обновить типовые параметры?',
        'Можно только связать растение со справочником или сразу обновить базовые параметры ухода по каталогу.',
        [
          {
            text: 'Отмена',
            style: 'cancel',
          },
          {
            text: 'Только связать',
            onPress: () => applyCatalogSelection(plant, false),
          },
          {
            text: 'Обновить поля',
            onPress: () => applyCatalogSelection(plant, true),
          },
        ]
      );
      return;
    }

    applyCatalogSelection(plant, true);
  };

  const handleSubmit = async () => {
    const values = normalizePlantFormValues({
      name,
      species,
      catalogPlantId,
      photoUri,
      lastWateringDate,
      wateringIntervalDays: Number(wateringIntervalDays),
      notes,
      lightCondition,
      humidityCondition,
      roomTemperature,
      conditionTags,
      customCareComment,
    });

    const errors = validatePlantForm(values);
    setValidationErrors(errors);

    if (errors.length > 0) {
      return;
    }

    await onSubmit(values);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.flex}
    >
      <DismissKeyboard>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
        <View style={styles.photoCard}>
          <Text style={styles.photoTitle}>Фото растения</Text>

          {photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.photo} />
          ) : (
            <View style={styles.photoPlaceholder}>
              <Text style={styles.photoPlaceholderText}>Фото пока не выбрано</Text>
            </View>
          )}

          <View style={styles.photoActions}>
            <Pressable
              onPress={handlePickPhoto}
              style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
            >
              <Text style={styles.secondaryButtonText}>Выбрать фото</Text>
            </Pressable>

            {photoUri ? (
              <Pressable
                onPress={() => setPhotoUri(null)}
                style={({ pressed }) => [
                  styles.secondaryButton,
                  styles.secondaryDangerButton,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={[styles.secondaryButtonText, styles.secondaryDangerButtonText]}>
                  Убрать фото
                </Text>
              </Pressable>
            ) : null}
          </View>
        </View>

        <FormField
          autoCapitalize="words"
          label="Название растения"
          onChangeText={setName}
          placeholder="Например, Зеленый уголок"
          value={name}
        />

        <View style={styles.guideCard}>
          <Text style={styles.guideTitle}>Вид из справочника</Text>
          <Text style={styles.guideSubtitle}>
            Выберите растение из каталога, чтобы сразу подставить базовые параметры ухода.
          </Text>

          {selectedCatalogPlant ? (
            <View style={styles.selectedCatalogCard}>
              <Text style={styles.selectedCatalogName}>{selectedCatalogPlant.nameRu}</Text>
              <Text style={styles.selectedCatalogLatin}>{selectedCatalogPlant.nameLatin}</Text>
              <Text style={styles.selectedCatalogSummary}>
                {formatCatalogSummary(selectedCatalogPlant)}
              </Text>
            </View>
          ) : (
            <Text style={styles.selectedCatalogEmpty}>
              Справочная запись пока не выбрана. Можно продолжить и вручную.
            </Text>
          )}

          <View style={styles.catalogActions}>
            <Pressable
              onPress={() => setCatalogModalVisible(true)}
              style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
            >
              <Text style={styles.secondaryButtonText}>
                {selectedCatalogPlant ? 'Изменить вид' : 'Выбрать из справочника'}
              </Text>
            </Pressable>

            {catalogPlantId ? (
              <Pressable
                onPress={() => setCatalogPlantId(null)}
                style={({ pressed }) => [
                  styles.secondaryButton,
                  styles.secondaryDangerButton,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={[styles.secondaryButtonText, styles.secondaryDangerButtonText]}>
                  Убрать связь
                </Text>
              </Pressable>
            ) : null}
          </View>
        </View>

        <FormField
          autoCapitalize="words"
          label="Вид растения"
          onChangeText={setSpecies}
          placeholder="Например, Монстера"
          value={species}
        />

        <FormField
          helperText="Формат: YYYY-MM-DD. Если оставить поле пустым, расчёт стартует от сегодняшней даты."
          label="Дата последнего полива"
          onChangeText={setLastWateringDate}
          placeholder="2026-04-06"
          value={lastWateringDate}
        />

        <Pressable
          onPress={() => setLastWateringDate(todayString())}
          style={({ pressed }) => [styles.linkButton, pressed && styles.pressed]}
        >
          <Text style={styles.linkButtonText}>Подставить сегодняшнюю дату</Text>
        </Pressable>

        <FormField
          keyboardType="number-pad"
          label="Интервал полива, дней"
          onChangeText={setWateringIntervalDays}
          placeholder="7"
          value={wateringIntervalDays}
        />

        <SelectionGroup
          label="Текущее освещение"
          onChange={setLightCondition}
          options={LIGHT_CONDITION_OPTIONS}
          value={lightCondition}
        />

        <SelectionGroup
          label="Текущая влажность воздуха"
          onChange={setHumidityCondition}
          options={HUMIDITY_CONDITION_OPTIONS}
          value={humidityCondition}
        />

        <FormField
          label="Температура в комнате"
          onChangeText={setRoomTemperature}
          placeholder="Например, 22°C"
          value={roomTemperature}
        />

        <HealthTagSelector
          helperText="Отмечайте только те признаки, которые реально наблюдаете сейчас."
          label="Признаки состояния растения"
          onChange={setConditionTags}
          selectedTags={conditionTags}
        />

        <FormField
          label="Дополнительный комментарий для анализа"
          multiline
          onChangeText={setCustomCareComment}
          placeholder="Например, растение стоит у батареи или недавно было переставлено."
          value={customCareComment}
        />

        <FormField
          label="Общие заметки"
          multiline
          onChangeText={setNotes}
          placeholder="Свет, режим ухода, напоминания для себя."
          value={notes}
        />

        {validationErrors.length > 0 ? (
          <View style={styles.errorBox}>
            {validationErrors.map((error) => (
              <Text key={error} style={styles.errorText}>
                • {error}
              </Text>
            ))}
          </View>
        ) : null}

        {errorMessage ? (
          <EmptyState description={errorMessage} title="Не удалось сохранить данные" />
        ) : null}

        <Pressable
          disabled={loading}
          onPress={() => {
            void handleSubmit();
          }}
          style={({ pressed }) => [
            styles.primaryButton,
            (pressed || loading) && styles.pressed,
            loading && styles.disabledButton,
          ]}
        >
          <Text style={styles.primaryButtonText}>{loading ? 'Сохранение...' : submitLabel}</Text>
        </Pressable>
        </ScrollView>
      </DismissKeyboard>

      <Modal
        animationType="slide"
        onRequestClose={() => setCatalogModalVisible(false)}
        transparent
        visible={catalogModalVisible}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderText}>
                <Text style={styles.modalTitle}>Выбор из справочника</Text>
                <Text style={styles.modalSubtitle}>
                  Поиск по русскому и латинскому названию.
                </Text>
              </View>

              <Pressable
                onPress={() => setCatalogModalVisible(false)}
                style={({ pressed }) => [styles.modalCloseButton, pressed && styles.pressed]}
              >
                <Text style={styles.modalCloseText}>Закрыть</Text>
              </Pressable>
            </View>

            <SearchBar
              onChangeText={setCatalogQuery}
              placeholder="Например, монстера или monstera"
              value={catalogQuery}
            />

            <ScrollView
              contentContainerStyle={styles.modalList}
              keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
              keyboardShouldPersistTaps="handled"
              onScrollBeginDrag={Keyboard.dismiss}
              showsVerticalScrollIndicator={false}
            >
              {catalogLoading ? (
                <Text style={styles.helperText}>Загружаем каталог растений...</Text>
              ) : null}

              {catalogError ? (
                <EmptyState
                  description={catalogError}
                  title="Справочник временно недоступен"
                />
              ) : null}

              {!catalogLoading && !catalogError && filteredCatalogPlants.length === 0 ? (
                <EmptyState
                  description={
                    catalogPlants.length === 0
                      ? 'Каталог пока пуст. Попробуйте обновить данные немного позже.'
                      : 'По вашему запросу ничего не найдено.'
                  }
                  title={catalogPlants.length === 0 ? 'Каталог ещё не загружен' : 'Ничего не найдено'}
                />
              ) : null}

              {!catalogLoading && !catalogError
                ? filteredCatalogPlants.map((plant) => (
                    <CatalogPlantRow
                      key={plant.id}
                      onPress={() => handleCatalogSelection(plant)}
                      plant={plant}
                      selected={plant.id === catalogPlantId}
                    />
                  ))
                : null}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    backgroundColor: AppTheme.colors.page,
    padding: 16,
    paddingBottom: 36,
  },
  photoCard: {
    ...AppTheme.shadow.card,
    backgroundColor: AppTheme.colors.surface,
    borderColor: AppTheme.colors.stroke,
    borderRadius: AppTheme.radius.xl,
    borderWidth: 1,
    marginBottom: 20,
    padding: 16,
  },
  photoTitle: {
    color: AppTheme.colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  photo: {
    borderRadius: AppTheme.radius.md,
    height: 220,
    marginBottom: 12,
    width: '100%',
  },
  photoPlaceholder: {
    alignItems: 'center',
    backgroundColor: AppTheme.colors.surfaceMuted,
    borderRadius: AppTheme.radius.md,
    height: 220,
    justifyContent: 'center',
    marginBottom: 12,
  },
  photoPlaceholderText: {
    color: AppTheme.colors.textMuted,
    fontSize: 15,
  },
  photoActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  secondaryButton: {
    backgroundColor: AppTheme.colors.primarySoft,
    borderRadius: AppTheme.radius.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  secondaryButtonText: {
    color: AppTheme.colors.primaryStrong,
    fontSize: 14,
    fontWeight: '700',
  },
  secondaryDangerButton: {
    backgroundColor: AppTheme.colors.accentSoft,
  },
  secondaryDangerButtonText: {
    color: '#c2410c',
  },
  guideCard: {
    ...AppTheme.shadow.card,
    backgroundColor: AppTheme.colors.surface,
    borderColor: AppTheme.colors.stroke,
    borderRadius: AppTheme.radius.xl,
    borderWidth: 1,
    marginBottom: 16,
    padding: 16,
  },
  guideTitle: {
    color: AppTheme.colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  guideSubtitle: {
    color: AppTheme.colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 12,
  },
  selectedCatalogCard: {
    backgroundColor: AppTheme.colors.surfaceMuted,
    borderRadius: AppTheme.radius.md,
    marginBottom: 12,
    padding: 12,
  },
  selectedCatalogName: {
    color: AppTheme.colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  selectedCatalogLatin: {
    color: AppTheme.colors.textMuted,
    fontSize: 13,
    marginBottom: 8,
  },
  selectedCatalogSummary: {
    color: AppTheme.colors.primaryStrong,
    fontSize: 13,
    fontWeight: '600',
  },
  selectedCatalogEmpty: {
    color: AppTheme.colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  catalogActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  optionsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionChip: {
    backgroundColor: AppTheme.colors.surface,
    borderColor: AppTheme.colors.stroke,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  optionChipSelected: {
    backgroundColor: AppTheme.colors.primarySoft,
    borderColor: AppTheme.colors.primary,
  },
  optionChipText: {
    color: AppTheme.colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  optionChipTextSelected: {
    color: AppTheme.colors.primaryStrong,
  },
  groupBlock: {
    marginBottom: 16,
  },
  groupLabel: {
    color: AppTheme.colors.text,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  linkButton: {
    alignSelf: 'flex-start',
    marginBottom: 16,
    marginTop: -6,
  },
  linkButtonText: {
    color: AppTheme.colors.primaryStrong,
    fontSize: 13,
    fontWeight: '600',
  },
  errorBox: {
    backgroundColor: AppTheme.colors.accentSoft,
    borderRadius: AppTheme.radius.md,
    marginBottom: 16,
    padding: 14,
  },
  errorText: {
    color: '#9a3412',
    fontSize: 14,
    lineHeight: 20,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: AppTheme.colors.primary,
    borderRadius: AppTheme.radius.lg,
    justifyContent: 'center',
    minHeight: 52,
    marginTop: 8,
    paddingHorizontal: 18,
  },
  primaryButtonText: {
    color: AppTheme.colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  disabledButton: {
    backgroundColor: '#7fa48a',
  },
  modalOverlay: {
    backgroundColor: 'rgba(23, 49, 38, 0.34)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: AppTheme.colors.page,
    borderTopLeftRadius: AppTheme.radius.xl,
    borderTopRightRadius: AppTheme.radius.xl,
    maxHeight: '86%',
    padding: 16,
    paddingBottom: 24,
  },
  modalHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modalHeaderText: {
    flex: 1,
    marginRight: 12,
  },
  modalTitle: {
    color: AppTheme.colors.text,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  modalSubtitle: {
    color: AppTheme.colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
  },
  modalCloseButton: {
    paddingVertical: 4,
  },
  modalCloseText: {
    color: AppTheme.colors.primaryStrong,
    fontSize: 14,
    fontWeight: '700',
  },
  modalList: {
    paddingBottom: 20,
  },
  catalogRow: {
    ...AppTheme.shadow.card,
    backgroundColor: AppTheme.colors.surface,
    borderColor: AppTheme.colors.stroke,
    borderRadius: AppTheme.radius.lg,
    borderWidth: 1,
    marginBottom: 10,
    padding: 14,
  },
  catalogRowSelected: {
    borderColor: AppTheme.colors.primary,
    backgroundColor: AppTheme.colors.primarySoft,
  },
  catalogRowHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  catalogTitleBlock: {
    flex: 1,
    marginRight: 12,
  },
  catalogName: {
    color: AppTheme.colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  catalogLatin: {
    color: AppTheme.colors.textMuted,
    fontSize: 13,
    marginBottom: 6,
  },
  catalogSelectedLabel: {
    color: AppTheme.colors.primaryStrong,
    fontSize: 12,
    fontWeight: '700',
  },
  catalogMeta: {
    color: AppTheme.colors.primaryStrong,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  catalogDescription: {
    color: AppTheme.colors.text,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 8,
  },
  catalogSummary: {
    color: AppTheme.colors.textMuted,
    fontSize: 12,
  },
  helperText: {
    color: AppTheme.colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.9,
  },
});
