import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { type Href, useRouter } from 'expo-router';

import { CareTaskCard } from '@/components/CareTaskCard';
import { EmptyState } from '@/components/EmptyState';
import { FilterChips, type FilterChipOption } from '@/components/FilterChips';
import { AppTheme } from '@/constants/theme';
import { CARE_TYPE_VALUES, type CareType, getCareTypeLabel } from '@/constants/careTypes';
import { useTasks } from '@/hooks/useTasks';
import { addDays, compareDateStrings, formatDate, parseDateString, todayString } from '@/lib/date';
import { completePlantTask } from '@/lib/plants-repo';
import { getErrorMessage } from '@/lib/validators';

type TaskFilterKey = 'all' | CareType;

type CalendarCell = {
  date: string;
  inCurrentMonth: boolean;
  isToday: boolean;
};

const FILTER_OPTIONS: FilterChipOption<TaskFilterKey>[] = [
  { key: 'all', label: 'Все' },
  ...CARE_TYPE_VALUES.map((type) => ({
    key: type,
    label: getCareTypeLabel(type),
  })),
];

const WEEKDAY_LABELS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

const MONTH_FORMATTER = new Intl.DateTimeFormat('ru-RU', {
  month: 'long',
  year: 'numeric',
});

const DATE_TITLE_FORMATTER = new Intl.DateTimeFormat('ru-RU', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});

function getMonthStart(dateString: string) {
  const date = parseDateString(dateString);
  date.setDate(1);
  return formatDate(date);
}

function addMonths(dateString: string, months: number) {
  const date = parseDateString(getMonthStart(dateString));
  date.setMonth(date.getMonth() + months, 1);
  return formatDate(date);
}

function buildCalendarCells(monthStart: string, today: string): CalendarCell[] {
  const monthDate = parseDateString(getMonthStart(monthStart));
  const monthIndex = monthDate.getMonth();
  const start = new Date(monthDate);
  const weekdayOffset = (monthDate.getDay() + 6) % 7;
  start.setDate(monthDate.getDate() - weekdayOffset);

  const cells: CalendarCell[] = [];

  for (let index = 0; index < 42; index += 1) {
    const cellDate = new Date(start);
    cellDate.setDate(start.getDate() + index);
    const formattedDate = formatDate(cellDate);

    cells.push({
      date: formattedDate,
      inCurrentMonth: cellDate.getMonth() === monthIndex,
      isToday: formattedDate === today,
    });
  }

  return cells;
}

function getPreferredTaskDate(taskDates: string[], today: string) {
  const uniqueDates = Array.from(new Set(taskDates)).sort(compareDateStrings);
  const nearWindowEnd = addDays(today, 2);

  const preferredNearDate = uniqueDates.find(
    (date) =>
      compareDateStrings(date, today) >= 0 && compareDateStrings(date, nearWindowEnd) <= 0
  );

  if (preferredNearDate) {
    return preferredNearDate;
  }

  const nextUpcomingDate = uniqueDates.find((date) => compareDateStrings(date, today) >= 0);

  return nextUpcomingDate ?? uniqueDates[0] ?? today;
}

function formatSelectedDateLabel(dateString: string) {
  return DATE_TITLE_FORMATTER.format(parseDateString(dateString));
}

export default function ScheduleScreen() {
  const router = useRouter();
  const { tasks, loading, error, reload } = useTasks();
  const [busyTaskId, setBusyTaskId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [filterKey, setFilterKey] = useState<TaskFilterKey>('all');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [visibleMonth, setVisibleMonth] = useState<string>(getMonthStart(todayString()));

  const today = todayString();

  const filteredTasks = useMemo(() => {
    return tasks
      .filter((task) => (filterKey === 'all' ? true : task.type === filterKey))
      .sort((left, right) => compareDateStrings(left.scheduledDate, right.scheduledDate));
  }, [filterKey, tasks]);

  useEffect(() => {
    if (selectedDate) {
      return;
    }

    const preferredDate = getPreferredTaskDate(
      filteredTasks.map((task) => task.scheduledDate),
      today
    );

    setSelectedDate(preferredDate);
    setVisibleMonth(getMonthStart(preferredDate));
  }, [filteredTasks, selectedDate, today]);

  const taskDatesWithTasks = useMemo(() => {
    return new Set(tasks.map((task) => task.scheduledDate));
  }, [tasks]);

  const selectedDateValue = selectedDate ?? today;
  const selectedDateTasks = useMemo(
    () =>
      filteredTasks.filter((task) => task.scheduledDate === selectedDateValue),
    [filteredTasks, selectedDateValue]
  );

  const calendarCells = useMemo(
    () => buildCalendarCells(visibleMonth, today),
    [today, visibleMonth]
  );

  const overdueCount = filteredTasks.filter((task) => compareDateStrings(task.scheduledDate, today) < 0)
    .length;
  const todayCount = filteredTasks.filter((task) => task.scheduledDate === today).length;
  const nearCount = filteredTasks.filter((task) => {
    const diffFromToday = compareDateStrings(task.scheduledDate, today);
    return diffFromToday >= 0 && diffFromToday <= 2 * 24 * 60 * 60 * 1000;
  }).length;

  const handleCompleteTask = async (taskId: string) => {
    setBusyTaskId(taskId);

    try {
      await completePlantTask(taskId);
      setActionError(null);
      await reload();
    } catch (taskError) {
      setActionError(getErrorMessage(taskError, 'Не удалось отметить задачу выполненной.'));
    } finally {
      setBusyTaskId(null);
    }
  };

  const handleSelectDate = (date: string) => {
    setSelectedDate(date);
    setVisibleMonth(getMonthStart(date));
  };

  if (loading && tasks.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <ActivityIndicator color={AppTheme.colors.primary} size="large" />
          <Text style={styles.centeredText}>Загружаем календарь ухода...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        contentContainerStyle={styles.listContent}
        data={selectedDateTasks}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          tasks.length === 0 ? (
            <EmptyState
              description="Когда вы добавите растения, здесь появятся даты и задачи по уходу."
              title="Задач пока нет"
            />
          ) : (
            <EmptyState
              description="Выберите другую дату в календаре или поменяйте фильтр ухода."
              title="На эту дату задач нет"
            />
          )
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <View style={styles.titleCopy}>
                <Text style={styles.title}>Календарь ухода</Text>
                <Text style={styles.subtitle}>Выберите дату и посмотрите задачи на день</Text>
              </View>

              <Pressable
                onPress={() => handleSelectDate(today)}
                style={({ pressed }) => [styles.todayPill, pressed && styles.pressed]}
              >
                <Text style={styles.todayPillText}>Сегодня</Text>
              </Pressable>
            </View>

            <View style={styles.summaryRow}>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryValue}>{todayCount}</Text>
                <Text style={styles.summaryLabel}>На сегодня</Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryValue}>{nearCount}</Text>
                <Text style={styles.summaryLabel}>Ближайшие 3 дня</Text>
              </View>
              <View style={[styles.summaryCard, overdueCount > 0 && styles.summaryCardWarning]}>
                <Text style={[styles.summaryValue, overdueCount > 0 && styles.summaryValueWarning]}>
                  {overdueCount}
                </Text>
                <Text
                  style={[styles.summaryLabel, overdueCount > 0 && styles.summaryLabelWarning]}
                >
                  Просрочено
                </Text>
              </View>
            </View>

            <FilterChips
              label="Тип ухода"
              onSelect={setFilterKey}
              options={FILTER_OPTIONS}
              selectedKey={filterKey}
            />

            <View style={styles.calendarCard}>
              <View style={styles.calendarHeader}>
                <Pressable
                  onPress={() => setVisibleMonth((current) => addMonths(current, -1))}
                  style={({ pressed }) => [styles.monthNavButton, pressed && styles.pressed]}
                >
                  <Ionicons color={AppTheme.colors.text} name="chevron-back-outline" size={18} />
                </Pressable>

                <Text style={styles.monthTitle}>
                  {MONTH_FORMATTER.format(parseDateString(visibleMonth))}
                </Text>

                <Pressable
                  onPress={() => setVisibleMonth((current) => addMonths(current, 1))}
                  style={({ pressed }) => [styles.monthNavButton, pressed && styles.pressed]}
                >
                  <Ionicons color={AppTheme.colors.text} name="chevron-forward-outline" size={18} />
                </Pressable>
              </View>

              <View style={styles.weekRow}>
                {WEEKDAY_LABELS.map((label) => (
                  <Text key={label} style={styles.weekdayLabel}>
                    {label}
                  </Text>
                ))}
              </View>

              <View style={styles.calendarGrid}>
                {calendarCells.map((cell) => {
                  const hasTasks = taskDatesWithTasks.has(cell.date);
                  const selected = cell.date === selectedDateValue;

                  return (
                    <Pressable
                      key={cell.date}
                      onPress={() => handleSelectDate(cell.date)}
                      style={({ pressed }) => [
                        styles.dayCell,
                        !cell.inCurrentMonth && styles.dayCellMuted,
                        hasTasks && styles.dayCellHasTasks,
                        cell.isToday && styles.dayCellToday,
                        selected && styles.dayCellSelected,
                        selected && hasTasks && styles.dayCellSelectedWithTasks,
                        pressed && styles.pressed,
                      ]}
                    >
                      <Text
                        style={[
                          styles.dayText,
                          !cell.inCurrentMonth && styles.dayTextMuted,
                          hasTasks && styles.dayTextHasTasks,
                          cell.isToday && styles.dayTextToday,
                          selected && !hasTasks && styles.dayTextSelectedLight,
                          selected && hasTasks && styles.dayTextSelected,
                        ]}
                      >
                        {parseDateString(cell.date).getDate()}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>{formatSelectedDateLabel(selectedDateValue)}</Text>
                <Text style={styles.sectionMeta}>
                  {selectedDateTasks.length === 0
                    ? 'Задач на выбранную дату нет'
                    : `${selectedDateTasks.length} задач(и) на этот день`}
                </Text>
              </View>
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            {actionError ? <Text style={styles.errorText}>{actionError}</Text> : null}
          </View>
        }
        onRefresh={() => {
          void reload();
        }}
        refreshing={loading}
        renderItem={({ item }) => (
          <CareTaskCard
            completing={busyTaskId === item.id}
            onComplete={() => {
              void handleCompleteTask(item.id);
            }}
            onPress={() =>
              router.push({
                pathname: '/plant/[id]',
                params: { id: item.plantId },
              } as unknown as Href)
            }
            task={item}
          />
        )}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: AppTheme.colors.page,
    flex: 1,
  },
  listContent: {
    padding: 20,
    paddingBottom: 120,
  },
  header: {
    marginBottom: 12,
  },
  titleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  titleCopy: {
    flex: 1,
    marginRight: 12,
  },
  title: {
    color: AppTheme.colors.text,
    fontSize: 28,
    fontWeight: '700',
  },
  subtitle: {
    color: AppTheme.colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
  todayPill: {
    alignItems: 'center',
    backgroundColor: AppTheme.colors.primarySoft,
    borderRadius: AppTheme.radius.pill,
    justifyContent: 'center',
    minHeight: 38,
    paddingHorizontal: 14,
  },
  todayPillText: {
    color: AppTheme.colors.primaryStrong,
    fontSize: 13,
    fontWeight: '700',
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 18,
  },
  summaryCard: {
    backgroundColor: AppTheme.colors.surfaceElevated,
    borderColor: AppTheme.colors.stroke,
    borderRadius: 20,
    borderWidth: 1,
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  summaryCardWarning: {
    backgroundColor: AppTheme.colors.accentSoft,
    borderColor: '#f1d6bc',
  },
  summaryValue: {
    color: AppTheme.colors.text,
    fontSize: 22,
    fontWeight: '800',
  },
  summaryValueWarning: {
    color: AppTheme.colors.accent,
  },
  summaryLabel: {
    color: AppTheme.colors.textMuted,
    fontSize: 12,
    marginTop: 4,
  },
  summaryLabelWarning: {
    color: AppTheme.colors.accent,
  },
  calendarCard: {
    ...AppTheme.shadow.card,
    backgroundColor: AppTheme.colors.surfaceElevated,
    borderColor: AppTheme.colors.stroke,
    borderRadius: 24,
    borderWidth: 1,
    marginTop: 14,
    padding: 16,
  },
  calendarHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  monthNavButton: {
    alignItems: 'center',
    backgroundColor: AppTheme.colors.surfaceSoft,
    borderRadius: AppTheme.radius.pill,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  monthTitle: {
    color: AppTheme.colors.text,
    fontSize: 17,
    fontWeight: '800',
    textTransform: 'capitalize',
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  weekdayLabel: {
    color: AppTheme.colors.textSoft,
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    alignItems: 'center',
    backgroundColor: AppTheme.colors.surfaceSoft,
    borderColor: 'transparent',
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: 'center',
    marginBottom: 8,
    minHeight: 46,
    paddingHorizontal: 8,
    paddingVertical: 8,
    width: '14.2857%',
  },
  dayCellMuted: {
    opacity: 0.45,
  },
  dayCellHasTasks: {
    backgroundColor: '#dff0e2',
    borderColor: '#9bc9a5',
  },
  dayCellToday: {
    borderColor: AppTheme.colors.primary,
  },
  dayCellSelected: {
    backgroundColor: AppTheme.colors.surfaceElevated,
    borderColor: AppTheme.colors.primary,
    borderWidth: 2,
  },
  dayCellSelectedWithTasks: {
    backgroundColor: AppTheme.colors.primaryStrong,
    borderColor: AppTheme.colors.primaryStrong,
  },
  dayText: {
    color: AppTheme.colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  dayTextMuted: {
    color: AppTheme.colors.textSoft,
  },
  dayTextHasTasks: {
    color: AppTheme.colors.primaryStrong,
  },
  dayTextToday: {
    color: AppTheme.colors.primaryStrong,
  },
  dayTextSelectedLight: {
    color: AppTheme.colors.primaryStrong,
  },
  dayTextSelected: {
    color: AppTheme.colors.white,
  },
  sectionHeader: {
    marginBottom: 12,
    marginTop: 18,
  },
  sectionTitle: {
    color: AppTheme.colors.text,
    fontSize: 20,
    fontWeight: '800',
    textTransform: 'capitalize',
  },
  sectionMeta: {
    color: AppTheme.colors.textMuted,
    fontSize: 13,
    marginTop: 4,
  },
  errorText: {
    color: AppTheme.colors.danger,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 8,
  },
  centered: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  centeredText: {
    color: AppTheme.colors.text,
    fontSize: 15,
    marginTop: 12,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.92,
  },
});
