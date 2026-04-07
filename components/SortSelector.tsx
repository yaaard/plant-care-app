import { FilterChips, type FilterChipOption } from '@/components/FilterChips';

type SortSelectorProps<T extends string> = {
  options: FilterChipOption<T>[];
  selectedKey: T;
  onSelect: (key: T) => void;
};

export function SortSelector<T extends string>({
  options,
  selectedKey,
  onSelect,
}: SortSelectorProps<T>) {
  return (
    <FilterChips
      label="Сортировка"
      onSelect={onSelect}
      options={options}
      selectedKey={selectedKey}
    />
  );
}
