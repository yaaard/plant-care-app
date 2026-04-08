import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Image,
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
import {
  HUMIDITY_CONDITION_OPTIONS,
  LIGHT_CONDITION_OPTIONS,
} from '@/constants/plantGuide';
import { DEFAULT_PLANT_FORM_VALUES } from '@/constants/defaultValues';
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
      <ScrollView
        contentContainerStyle={styles.content}
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
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {catalogLoading ? (
                <Text style={styles.helperText}>Загружаем локальный каталог...</Text>
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
                      ? 'Локальный каталог пока пуст. После синхронизации он появится и будет доступен офлайн.'
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
    backgroundColor: '#f6f7f2',
    padding: 16,
    paddingBottom: 32,
  },
  photoCard: {
    backgroundColor: '#ffffff',
    borderColor: '#d5ddd2',
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 20,
    padding: 16,
  },
  photoTitle: {
    color: '#163020',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  photo: {
    borderRadius: 14,
    height: 220,
    marginBottom: 12,
    width: '100%',
  },
  photoPlaceholder: {
    alignItems: 'center',
    backgroundColor: '#f0f3ef',
    borderRadius: 14,
    height: 220,
    justifyContent: 'center',
    marginBottom: 12,
  },
  photoPlaceholderText: {
    color: '#667085',
    fontSize: 15,
  },
  photoActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  secondaryButton: {
    backgroundColor: '#edf7ef',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  secondaryButtonText: {
    color: '#2f6f3e',
    fontSize: 14,
    fontWeight: '700',
  },
  secondaryDangerButton: {
    backgroundColor: '#fff1e8',
  },
  secondaryDangerButtonText: {
    color: '#c2410c',
  },
  guideCard: {
    backgroundColor: '#ffffff',
    borderColor: '#d5ddd2',
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 16,
    padding: 16,
  },
  guideTitle: {
    color: '#163020',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  guideSubtitle: {
    color: '#667085',
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 12,
  },
  selectedCatalogCard: {
    backgroundColor: '#f7faf7',
    borderRadius: 14,
    marginBottom: 12,
    padding: 12,
  },
  selectedCatalogName: {
    color: '#163020',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  selectedCatalogLatin: {
    color: '#667085',
    fontSize: 13,
    marginBottom: 8,
  },
  selectedCatalogSummary: {
    color: '#2f6f3e',
    fontSize: 13,
    fontWeight: '600',
  },
  selectedCatalogEmpty: {
    color: '#667085',
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
    backgroundColor: '#ffffff',
    borderColor: '#d5ddd2',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  optionChipSelected: {
    backgroundColor: '#edf7ef',
    borderColor: '#2f6f3e',
  },
  optionChipText: {
    color: '#435249',
    fontSize: 13,
    fontWeight: '600',
  },
  optionChipTextSelected: {
    color: '#2f6f3e',
  },
  groupBlock: {
    marginBottom: 16,
  },
  groupLabel: {
    color: '#163020',
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
    color: '#2f6f3e',
    fontSize: 13,
    fontWeight: '600',
  },
  errorBox: {
    backgroundColor: '#fff1e8',
    borderRadius: 14,
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
    backgroundColor: '#2f6f3e',
    borderRadius: 14,
    justifyContent: 'center',
    minHeight: 52,
    marginTop: 8,
    paddingHorizontal: 18,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  disabledButton: {
    backgroundColor: '#7fa48a',
  },
  modalOverlay: {
    backgroundColor: 'rgba(22, 48, 32, 0.36)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#f6f7f2',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
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
    color: '#163020',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  modalSubtitle: {
    color: '#667085',
    fontSize: 13,
    lineHeight: 19,
  },
  modalCloseButton: {
    paddingVertical: 4,
  },
  modalCloseText: {
    color: '#2f6f3e',
    fontSize: 14,
    fontWeight: '700',
  },
  modalList: {
    paddingBottom: 20,
  },
  catalogRow: {
    backgroundColor: '#ffffff',
    borderColor: '#d5ddd2',
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 10,
    padding: 14,
  },
  catalogRowSelected: {
    borderColor: '#2f6f3e',
    backgroundColor: '#edf7ef',
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
    color: '#163020',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  catalogLatin: {
    color: '#667085',
    fontSize: 13,
    marginBottom: 6,
  },
  catalogSelectedLabel: {
    color: '#2f6f3e',
    fontSize: 12,
    fontWeight: '700',
  },
  catalogMeta: {
    color: '#2f6f3e',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  catalogDescription: {
    color: '#163020',
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 8,
  },
  catalogSummary: {
    color: '#667085',
    fontSize: 12,
  },
  helperText: {
    color: '#667085',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.9,
  },
});
