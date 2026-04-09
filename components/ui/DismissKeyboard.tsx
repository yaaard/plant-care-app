import type { ReactNode } from 'react';
import { Keyboard, TouchableWithoutFeedback } from 'react-native';

type Props = {
  children: ReactNode;
};

export function DismissKeyboard({ children }: Props) {
  return (
    <TouchableWithoutFeedback accessible={false} onPress={Keyboard.dismiss}>
      {children}
    </TouchableWithoutFeedback>
  );
}
