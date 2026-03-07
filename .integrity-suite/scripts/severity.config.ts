export type Severity = 'critical' | 'high' | 'medium' | 'low';

// Severity map used by report generator. Keys are substrings matched
// case-insensitively against title+ancestors; the first hit wins.  Adjust
// or extend as needed.

export const severityMap: Record<string, Severity> = {
  '@core-protection': 'critical',
  '@security': 'critical',

  '@workflow': 'high',

  '@accessibility': 'medium',
  '@dependency': 'medium',
  '@hygiene': 'medium',

  '@docs': 'low',
  '@style': 'low',
};
