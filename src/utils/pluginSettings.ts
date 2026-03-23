// Plugin settings stored in localStorage

const STORAGE_KEY = 'headlamp-kubevirt-settings';

export interface LabelColumn {
  label: string; // Display name
  labelKey: string; // Kubernetes label key (e.g., 'app.kubernetes.io/name')
}

export interface PluginSettings {
  customLabelColumns: LabelColumn[];
}

const defaultSettings: PluginSettings = {
  customLabelColumns: [],
};

export function getPluginSettings(): PluginSettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...defaultSettings, ...JSON.parse(stored) };
    }
  } catch (error) {
    console.error('Failed to load plugin settings:', error);
  }
  return defaultSettings;
}

export function savePluginSettings(settings: PluginSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('Failed to save plugin settings:', error);
  }
}

export function addLabelColumn(column: LabelColumn): void {
  const settings = getPluginSettings();
  // Avoid duplicates
  if (!settings.customLabelColumns.find(c => c.labelKey === column.labelKey)) {
    settings.customLabelColumns.push(column);
    savePluginSettings(settings);
  }
}

export function removeLabelColumn(labelKey: string): void {
  const settings = getPluginSettings();
  settings.customLabelColumns = settings.customLabelColumns.filter(c => c.labelKey !== labelKey);
  savePluginSettings(settings);
}

export function getLabelColumns(): LabelColumn[] {
  return getPluginSettings().customLabelColumns;
}
