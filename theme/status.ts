import { colors } from '@/theme/colors';

export const status = {
  success: {
    background: colors.successSoft,
    border: '#cfe5d7',
    text: colors.success,
  },
  warning: {
    background: colors.warningSoft,
    border: '#efd49c',
    text: '#9d6f27',
  },
  danger: {
    background: colors.dangerSoft,
    border: '#efc2bb',
    text: '#9e463e',
  },
  info: {
    background: colors.infoSoft,
    border: '#c8dce3',
    text: colors.info,
  },
  risk: {
    low: {
      background: colors.successSoft,
      border: '#cfe5d7',
      text: colors.success,
    },
    medium: {
      background: colors.warningSoft,
      border: '#efd49c',
      text: '#9d6f27',
    },
    high: {
      background: colors.dangerSoft,
      border: '#efc2bb',
      text: '#9e463e',
    },
  },
} as const;
