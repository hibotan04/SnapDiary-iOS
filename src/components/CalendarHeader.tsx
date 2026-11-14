import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { ThemeColors } from '../types';
import { Language } from '../i18n';

interface CalendarHeaderProps {
  currentDate: Date;
  colors: ThemeColors;
  lang: Language;
}

const BASE_FONT_FAMILY = Platform.OS === 'ios' ? 'Georgia' : 'serif';

export const CalendarHeader: React.FC<CalendarHeaderProps> = ({ currentDate, colors, lang }) => {
  const year = currentDate.getFullYear();
  const monthLabel = lang === 'ja'
    ? `${currentDate.getMonth() + 1}月`
    : currentDate.toLocaleString('en-US', { month: 'long' });

  return (
    <View style={[styles.header, { borderBottomColor: colors.border }]}>
      <View style={styles.headerTitleContainer}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {monthLabel}
        </Text>
        <Text style={[styles.headerYear, { color: colors.subText }]}>{year}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16
  },
  headerTitleContainer: {
    alignItems: 'center'
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: BASE_FONT_FAMILY,
    letterSpacing: 2,
    textTransform: 'uppercase'
  },
  headerYear: {
    fontSize: 12,
    fontFamily: BASE_FONT_FAMILY,
    letterSpacing: 2,
    marginTop: 4
  },
});
