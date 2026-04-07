import { useEffect, useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
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
import {
  HUMIDITY_CONDITION_OPTIONS,
  LIGHT_CONDITION_OPTIONS,
  PLANT_GUIDE,
} from '@/constants/plantGuide';
import { DEFAULT_PLANT_FORM_VALUES } from '@/constants/defaultValues';
import { todayString } from '@/lib/date';
import { pickImageFromLibraryAsync } from '@/lib/image-picker';
import { normalizePlantFormValues, validatePlantForm } from '@/lib/validators';
import type { PlantFormValues } from '@/types/plant';

type PlantFormProps = {
  initialValues?: PlantFormValues;
  submitLabel: string;
  loading?: boolean;
  errorMessage?: string | null;
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

export function PlantForm({
  initialValues = DEFAULT_PLANT_FORM_VALUES,
  submitLabel,
  loading = false,
  errorMessage,
  onSubmit,
}: PlantFormProps) {
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

  const handlePickPhoto = async () => {
    const selectedUri = await pickImageFromLibraryAsync();

    if (selectedUri) {
      setPhotoUri(selectedUri);
    }
  };

  const handleGuideSpeciesSelect = (guideName: string) => {
    setSpecies(guideName);

    const guideEntry = PLANT_GUIDE.find((item) => item.name === guideName);

    if (!guideEntry) {
      return;
    }

    setWateringIntervalDays(String(guideEntry.recommendedWateringIntervalDays));
    setLightCondition((currentValue) => currentValue || guideEntry.lightLevel);
    setHumidityCondition((currentValue) => currentValue || guideEntry.humidityLevel);
  };

  const handleSubmit = async () => {
    const values = normalizePlantFormValues({
      name,
      species,
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
          placeholder="Например, Зелёный уголок"
          value={name}
        />

        <View style={styles.guideCard}>
          <Text style={styles.guideTitle}>Вид из локального справочника</Text>
          <Text style={styles.guideSubtitle}>
            Можно выбрать распространённый вид, чтобы сразу подставить базовые ориентиры по
            поливу и условиям.
          </Text>

          <View style={styles.optionsWrap}>
            {PLANT_GUIDE.map((item) => {
              const selected = species === item.name;

              return (
                <Pressable
                  key={item.id}
                  onPress={() => handleGuideSpeciesSelect(item.name)}
                  style={({ pressed }) => [
                    styles.optionChip,
                    selected && styles.optionChipSelected,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={[styles.optionChipText, selected && styles.optionChipTextSelected]}>
                    {item.name}
                  </Text>
                </Pressable>
              );
            })}
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
  pressed: {
    opacity: 0.9,
  },
});
