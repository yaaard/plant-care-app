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

import { DEFAULT_PLANT_FORM_VALUES } from '@/constants/defaultValues';
import { EmptyState } from '@/components/EmptyState';
import { FormField } from '@/components/FormField';
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
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  useEffect(() => {
    setName(initialValues.name);
    setSpecies(initialValues.species);
    setPhotoUri(initialValues.photoUri);
    setLastWateringDate(initialValues.lastWateringDate ?? '');
    setWateringIntervalDays(String(initialValues.wateringIntervalDays));
    setNotes(initialValues.notes);
  }, [initialValues]);

  const handlePickPhoto = async () => {
    const selectedUri = await pickImageFromLibraryAsync();

    if (selectedUri) {
      setPhotoUri(selectedUri);
    }
  };

  const handleSubmit = async () => {
    const values = normalizePlantFormValues({
      name,
      species,
      photoUri,
      lastWateringDate,
      wateringIntervalDays: Number(wateringIntervalDays),
      notes,
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
          label="Название"
          onChangeText={setName}
          placeholder="Например, Фикус"
          value={name}
        />

        <FormField
          autoCapitalize="words"
          label="Вид"
          onChangeText={setSpecies}
          placeholder="Например, Ficus elastica"
          value={species}
        />

        <FormField
          helperText="Формат: YYYY-MM-DD. Можно оставить пустым, тогда расчёт пойдёт от сегодняшней даты."
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

        <FormField
          label="Заметки"
          multiline
          onChangeText={setNotes}
          placeholder="Свет, влажность, особенности ухода..."
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
          <Text style={styles.primaryButtonText}>
            {loading ? 'Сохранение...' : submitLabel}
          </Text>
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
