import { Pressable, StyleSheet, Text, View } from 'react-native';

type SectionTitleProps = {
  title: string;
  actionLabel?: string;
  onActionPress?: () => void;
};

export function SectionTitle({ title, actionLabel, onActionPress }: SectionTitleProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>

      {actionLabel && onActionPress ? (
        <Pressable onPress={onActionPress}>
          <Text style={styles.action}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: {
    color: '#163020',
    fontSize: 20,
    fontWeight: '700',
  },
  action: {
    color: '#2f6f3e',
    fontSize: 14,
    fontWeight: '600',
  },
});
