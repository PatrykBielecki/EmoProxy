'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import {
  analyticsSettingsSchema,
  createUserSchema,
  surveyConfigSchema,
  type SurveyConfig,
  HARDCODED_MIN_SIZE_PX,
  HARDCODED_MAX_SIZE_PX,
  HARDCODED_MIN_SPEED,
  HARDCODED_MAX_SPEED,
  speedToCyclesPerSecond,
  sizeToScale,
  speedToScale
} from '@repo/shared';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { API_URL, apiFetch } from '../../lib/api';
import { useI18n } from '../../components/providers';
import { parseKeyframesJsonWithValidation } from '../../lib/keyframes';

type Tab = 'configuration' | 'responses' | 'analytics' | 'export-stats';
type CreateUserInput = z.infer<typeof createUserSchema>;
const adminPasswordSchema = z.object({
  userId: z.string().min(1, 'Select a user.'),
  newPassword: z.string().min(8, 'Password must contain at least 8 characters.')
});
type AdminPasswordInput = z.infer<typeof adminPasswordSchema>;
type AnalyticsInput = z.infer<typeof analyticsSettingsSchema>;

type AdminConfig = {
  surveyConfig: {
    introTitle: string;
    introDescription: string;
    emotionCount: number;
    minSizeScale: number;
    maxSizeScale: number;
    minSpeedScale: number;
    maxSpeedScale: number;
  };
  emotions: Array<{ key: string; label: string; order: number; enabled: boolean }>;
  shapes: Array<{ key: string; name: string; svg?: string | null; enabled: boolean; order: number }>;
  animations: Array<{
    name: string;
    type: string;
    keyframesJson?: string | null;
    enabled: boolean;
  }>;
  additionalFields: Array<{
    key: string;
    label: string;
    type: 'text' | 'number' | 'boolean';
    required: boolean;
    enabled: boolean;
    order: number;
  }>;
  analytics: { outlierFilteringEnabled: boolean; zScoreThreshold: number };
};

type AnalyticsPayload = {
  accepted: number;
  rejected: number;
  threshold: number;
  outlierFiltering: boolean;
  stats: Array<{
    emotionKey: string;
    count: number;
    valenceMean: number;
    valenceStdDev: number;
    valenceMedian: number;
    arousalMean: number;
    arousalStdDev: number;
    arousalMedian: number;
    dominanceMean: number;
    dominanceStdDev: number;
    dominanceMedian: number;
    sizeMean: number;
    sizeStdDev: number;
    speedMean: number;
    speedStdDev: number;
  }>;
  emotionProfiles: Array<{
    emotionKey: string;
    count: number;
    valenceMean: number;
    valenceStdDev: number;
    arousalMean: number;
    arousalStdDev: number;
    dominanceMean: number;
    dominanceStdDev: number;
    sizeMean: number;
    sizeStdDev: number;
    speedMean: number;
    speedStdDev: number;
    topColors: Array<{ value: string; count: number; share: number }>;
    topColorFamilies: Array<{ value: string; count: number; share: number }>;
    topShapes: Array<{ value: string; count: number; share: number }>;
    topAnimations: Array<{ value: string; count: number; share: number }>;
  }>;
  parameterStats: {
    colors: Array<CategoryStat>;
    colorFamilies: Array<CategoryStat>;
    shapes: Array<CategoryStat>;
    animations: Array<CategoryStat>;
  };
  correlations: Array<{ label: string; value: number; left?: string; right?: string }>;
  demographicStats: {
    gender: Array<DemographicStat>;
    country: Array<DemographicStat>;
  };
  respondentStats: {
    totalSessions: number;
    totalResponses: number;
    acceptedResponses: number;
    ageMean: number;
    ageStdDev: number;
    ageMin: number;
    ageMax: number;
  };
  vadEmotionMapping: Array<{
    emotionKey: string;
    centroidValence: number;
    centroidArousal: number;
    centroidDominance: number;
    nearestNeighborLabel: string;
    vadDistance: number;
  }>;
  emotionParameterMatrix: Array<{
    emotionKey: string;
    color: Array<CategoryStat>;
    colorFamily: Array<CategoryStat>;
    shape: Array<CategoryStat>;
    animation: Array<CategoryStat>;
    sizeMean: number;
    sizeStdDev: number;
    speedMean: number;
    speedStdDev: number;
  }>;
};

type CategoryStat = {
  key: string;
  count: number;
  share: number;
  valenceMean: number;
  valenceStdDev: number;
  arousalMean: number;
  arousalStdDev: number;
  dominanceMean: number;
  dominanceStdDev: number;
  sizeMean: number;
  sizeStdDev: number;
  speedMean: number;
  speedStdDev: number;
};

type DemographicStat = {
  key: string;
  count: number;
  share: number;
  valenceMean: number;
  valenceStdDev: number;
  arousalMean: number;
  arousalStdDev: number;
  dominanceMean: number;
  dominanceStdDev: number;
};

type SurveySession = {
  id: string;
  createdAt: string;
  age: number | null;
  country: string | null;
  gender: string | null;
  emotionResponses: Array<{
    emotionKey: string;
    shape: string;
    animationType: string;
    color: string;
    size: number;
    speed: number;
    valence: number;
    arousal: number;
    dominance: number;
  }>;
};

type Notice = { type: 'success' | 'error'; text: string } | null;

const DEFAULT_EMOTIONS = ['joy', 'anger', 'sadness', 'fear', 'surprise', 'interest'];
const DEFAULT_SHAPES = ['circle', 'square', 'triangle', 'star', 'ellipse', 'rhombus'];
const DEFAULT_ANIMATIONS = ['bounce', 'rotate', 'fade', 'shake', 'scale', 'flip', 'stretch'];

const PIE_CHART_COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#a855f7', '#ef4444', '#06b6d4', '#f97316', '#84cc16', '#ec4899', '#6366f1'];

function formatPieLabel({ name, percent }: { name?: string; percent?: number }): string {
  return `${name ?? ''}: ${((percent ?? 0) * 100).toFixed(1)}%`;
}

function svgPreviewError(svg: string | null | undefined): string | null {
  if (!svg?.trim()) return null;
  if (!/<svg[\s>]/i.test(svg)) return 'SVG must include a <svg ...> root element.';
  if (!/viewBox\s*=\s*['"]0\s+0\s+100\s+100['"]/i.test(svg)) return "For proper rendering, custom SVG must include viewBox='0 0 100 100'.";
  return null;
}

function getErrorMessage(error: unknown): string {
  const message = (error as Error)?.message ?? 'Request failed.';
  try {
    const parsed = JSON.parse(message) as { message?: string };
    return parsed?.message || message;
  } catch {
    return message;
  }
}

export default function AdminPage() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>('configuration');
  const [surveyDraft, setSurveyDraft] = useState<SurveyConfig | null>(null);
  const [analyticsDraft, setAnalyticsDraft] = useState<AnalyticsInput | null>(null);
  const [initialSurveySnapshot, setInitialSurveySnapshot] = useState('');
  const [initialAnalyticsSnapshot, setInitialAnalyticsSnapshot] = useState('');
  const [notice, setNotice] = useState<Notice>(null);
  const [exportStatus, setExportStatus] = useState('');
  const analyticsChartsRef = useRef<HTMLDivElement>(null);

  const notify = (type: 'success' | 'error', text: string) => setNotice({ type, text });

  const meQuery = useQuery({
    queryKey: ['me'],
    queryFn: () => apiFetch<{ username: string }>('/api/auth/me'),
    retry: false
  });

  const configQuery = useQuery({
    queryKey: ['admin-config'],
    queryFn: () => apiFetch<AdminConfig>('/api/admin/config'),
    enabled: !!meQuery.data
  });
  const sessionsQuery = useQuery({
    queryKey: ['survey-sessions'],
    queryFn: () => apiFetch<SurveySession[]>('/api/admin/survey-sessions'),
    enabled: !!meQuery.data
  });

  const analyticsQuery = useQuery({
    queryKey: ['analytics'],
    queryFn: () => apiFetch<AnalyticsPayload>('/api/admin/analytics'),
    enabled: !!meQuery.data
  });

  const usersQuery = useQuery({
    queryKey: ['users'],
    queryFn: () => apiFetch<Array<{ id: string; username: string; createdAt: string }>>('/api/admin/users'),
    enabled: !!meQuery.data
  });

  const createUserForm = useForm<CreateUserInput>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { username: '', password: '' }
  });

  const changePasswordForm = useForm<AdminPasswordInput>({
    resolver: zodResolver(adminPasswordSchema),
    defaultValues: { userId: '', newPassword: '' }
  });

  const logoutMutation = useMutation({
    mutationFn: () => apiFetch('/api/auth/logout', { method: 'POST' })
  });
  const createUserMutation = useMutation({
    mutationFn: (input: CreateUserInput) => apiFetch('/api/admin/users', { method: 'POST', body: JSON.stringify(input) })
  });
  const changePasswordMutation = useMutation({
    mutationFn: (input: AdminPasswordInput) => apiFetch('/api/admin/users/password', { method: 'POST', body: JSON.stringify(input) })
  });
  const surveyConfigMutation = useMutation({
    mutationFn: (input: SurveyConfig) => apiFetch('/api/admin/config/survey', { method: 'PUT', body: JSON.stringify(input) })
  });
  const analyticsMutation = useMutation({
    mutationFn: (input: AnalyticsInput) => apiFetch('/api/admin/config/analytics', { method: 'PUT', body: JSON.stringify(input) })
  });

  useEffect(() => {
    if (!configQuery.data) return;
    const emotions =
      configQuery.data.emotions.length > 0
        ? configQuery.data.emotions
        : DEFAULT_EMOTIONS.map((name, index) => ({ key: name, label: name, order: index, enabled: true }));
    const shapes =
      configQuery.data.shapes.length > 0
        ? configQuery.data.shapes.map((shape) => ({
            ...shape,
            svg: shape.svg ?? ''
          }))
        : DEFAULT_SHAPES.map((name, index) => ({ key: name, name, svg: '', enabled: true, order: index }));
    const animations =
      configQuery.data.animations.length > 0
        ? configQuery.data.animations.map((animation) => ({
            ...animation,
            keyframesJson: animation.keyframesJson ?? ''
          }))
        : DEFAULT_ANIMATIONS.map((name) => ({
            name,
            type: name,
            enabled: true,
            keyframesJson: ''
          }));

    const nextSurveyDraft = {
      introTitle: configQuery.data.surveyConfig.introTitle,
      introDescription: configQuery.data.surveyConfig.introDescription,
      emotionCount: Math.max(1, emotions.filter((item) => item.enabled).length),
      minSizeScale: configQuery.data.surveyConfig.minSizeScale,
      maxSizeScale: configQuery.data.surveyConfig.maxSizeScale,
      minSpeedScale: configQuery.data.surveyConfig.minSpeedScale,
      maxSpeedScale: configQuery.data.surveyConfig.maxSpeedScale,
      emotions,
      shapes,
      animations,
      additionalFields: configQuery.data.additionalFields
    };

    const nextAnalyticsDraft = {
      outlierFilteringEnabled: configQuery.data.analytics?.outlierFilteringEnabled ?? true,
      zScoreThreshold: configQuery.data.analytics?.zScoreThreshold ?? 2
    };
    setSurveyDraft(nextSurveyDraft);
    setAnalyticsDraft(nextAnalyticsDraft);
    setInitialSurveySnapshot(JSON.stringify(nextSurveyDraft));
    setInitialAnalyticsSnapshot(JSON.stringify(nextAnalyticsDraft));
  }, [configQuery.data]);

  useEffect(() => {
    if (!usersQuery.data?.length) return;
    if (changePasswordForm.getValues('userId')) return;
    changePasswordForm.setValue('userId', usersQuery.data[0]?.id ?? '');
  }, [usersQuery.data, changePasswordForm]);

  const hasUnsavedSurveyChanges = !!surveyDraft && !!initialSurveySnapshot && JSON.stringify(surveyDraft) !== initialSurveySnapshot;
  const hasUnsavedAnalyticsChanges = !!analyticsDraft && !!initialAnalyticsSnapshot && JSON.stringify(analyticsDraft) !== initialAnalyticsSnapshot;
  const hasUnsavedChanges = hasUnsavedSurveyChanges || hasUnsavedAnalyticsChanges;

  useEffect(() => {
    if (!hasUnsavedChanges) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [hasUnsavedChanges]);

  const insights = useMemo(() => {
    if (!analyticsQuery.data) return [];
    const stats = analyticsQuery.data.stats ?? [];
    if (!stats.length) return [];
    const byValence = [...stats].sort((a, b) => b.valenceMean - a.valenceMean);
    const byArousal = [...stats].sort((a, b) => b.arousalMean - a.arousalMean);
    const byDominance = [...stats].sort((a, b) => b.dominanceMean - a.dominanceMean);
    const strongestCorrelation = [...(analyticsQuery.data.correlations ?? [])].sort((a, b) => Math.abs(b.value) - Math.abs(a.value))[0];
    return [
      `Highest valence emotion: ${byValence[0].emotionKey}`,
      `Highest arousal emotion: ${byArousal[0].emotionKey}`,
      `Highest dominance emotion: ${byDominance[0].emotionKey}`,
      strongestCorrelation ? `Strongest VAD parameter relation: ${strongestCorrelation.label} (${strongestCorrelation.value.toFixed(3)})` : null
    ].filter(Boolean) as string[];
  }, [analyticsQuery.data]);

  const handleLogout = async () => {
    if (hasUnsavedChanges && !window.confirm('You have unsaved changes. Do you want to leave without saving?')) {
      return;
    }
    try {
      await logoutMutation.mutateAsync();
      window.location.assign('/admin/login');
    } catch (error) {
      notify('error', getErrorMessage(error) || 'Logout failed.');
    }
  };

  const handleCreateUser = createUserForm.handleSubmit(async (values) => {
    try {
      await createUserMutation.mutateAsync(values);
      createUserForm.reset();
      await queryClient.invalidateQueries({ queryKey: ['users'] });
      notify('success', 'User created.');
    } catch (error) {
      notify('error', getErrorMessage(error) || 'Create user failed.');
    }
  });

  const handleChangePassword = changePasswordForm.handleSubmit(async (values) => {
    try {
      await changePasswordMutation.mutateAsync(values);
      changePasswordForm.setValue('newPassword', '');
      notify('success', 'Password updated.');
    } catch (error) {
      notify('error', getErrorMessage(error) || 'Password update failed.');
    }
  });

  const handleSaveSurveyConfig = async () => {
    if (!surveyDraft) return;
    try {
      const parsed = surveyConfigSchema.parse({
        ...surveyDraft,
        emotionCount: Math.max(1, surveyDraft.emotions.filter((item) => item.enabled).length)
      });

      await surveyConfigMutation.mutateAsync(parsed);
      await queryClient.invalidateQueries({ queryKey: ['admin-config'] });
      await queryClient.invalidateQueries({ queryKey: ['public-config'] });
      setInitialSurveySnapshot(JSON.stringify(parsed));
      notify('success', 'Survey configuration saved.');
    } catch (error) {
      notify('error', getErrorMessage(error) || 'Saving survey configuration failed.');
    }
  };

  const handleSaveAnalytics = async () => {
    if (!analyticsDraft) return;
    try {
      await analyticsMutation.mutateAsync(analyticsDraft);
      await queryClient.invalidateQueries({ queryKey: ['admin-config'] });
      await queryClient.invalidateQueries({ queryKey: ['analytics'] });
      setInitialAnalyticsSnapshot(JSON.stringify(analyticsDraft));
      notify('success', 'Analytics settings saved.');
    } catch (error) {
      notify('error', getErrorMessage(error) || 'Saving analytics settings failed.');
    }
  };

  const handleExport = async (format: 'json' | 'csv' | 'xlsx') => {
    try {
      setExportStatus(`Preparing ${format.toUpperCase()}...`);
      const response = await fetch(`${API_URL}/api/admin/export?format=${format}`, {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error(await response.text());
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `survey-answers.${format}`;
      link.click();
      URL.revokeObjectURL(url);
      setExportStatus(`Downloaded ${format.toUpperCase()} export.`);
      notify('success', `${format.toUpperCase()} export downloaded.`);
    } catch (error) {
      setExportStatus('Export failed.');
      notify('error', getErrorMessage(error) || 'Export failed.');
    }
  };

  const handleExportXlsxWithStats = async () => {
    try {
      setExportStatus('Preparing XLSX with statistics...');
      const response = await fetch(`${API_URL}/api/admin/export?format=xlsx&include=statistics`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error(await response.text());
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'survey-data-and-statistics.xlsx';
      link.click();
      URL.revokeObjectURL(url);
      setExportStatus('Downloaded XLSX with statistics.');
      notify('success', 'XLSX with statistics downloaded.');
    } catch (error) {
      setExportStatus('Export failed.');
      notify('error', getErrorMessage(error) || 'Export failed.');
    }
  };

  const handleExportPdf = useCallback(async () => {
    const data = analyticsQuery.data;
    if (!data) { notify('error', 'Analytics data not loaded yet.'); return; }
    setExportStatus('Generating PDF...');
    try {
      const { default: jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');
      const html2canvas = (await import('html2canvas')).default;

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      doc.setProperties({ title: 'EmoProxy – Statistics Report', creator: 'EmoProxy' });
      const pageWidth = doc.internal.pageSize.getWidth();

      type DocWithAutoTable = typeof doc & { lastAutoTable?: { finalY?: number } };
      const getLastY = (fallback = 20) => (doc as DocWithAutoTable).lastAutoTable?.finalY ?? fallback;

      const addTitle = (text: string) => {
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(text, 14, getLastY() + 10);
      };

      const addSubTitle = (text: string, y?: number) => {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(text, 14, y ?? getLastY() + 8);
      };

      // Title page header
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('EmoProxy – Statistics Report', pageWidth / 2, 15, { align: 'center' });
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2, 22, { align: 'center' });

      // Respondent summary
      const rs = data.respondentStats;
      autoTable(doc, {
        startY: 28,
        head: [['Metric', 'Value']],
        body: [
          ['Total sessions (respondents)', rs?.totalSessions ?? data.accepted + data.rejected],
          ['Total responses', rs?.totalResponses ?? data.accepted + data.rejected],
          ['Accepted responses', data.accepted],
          ['Rejected (outliers)', data.rejected],
          ['Outlier threshold (z-score)', data.threshold],
          ['Age mean ± SD', rs ? `${rs.ageMean.toFixed(1)} ± ${rs.ageStdDev.toFixed(1)}` : 'n/a'],
          ['Age range', rs ? `${rs.ageMin}–${rs.ageMax}` : 'n/a']
        ],
        styles: { fontSize: 8 },
        headStyles: { fillColor: [41, 128, 185] },
        margin: { left: 14, right: 14 }
      });

      // VAD Emotion Stats Table
      addSubTitle('VAD Statistics per Emotion');
      autoTable(doc, {
        startY: getLastY() + 6,
        head: [['Emotion', 'n', 'V mean±SD', 'A mean±SD', 'D mean±SD', 'Size mean±SD', 'Speed mean±SD']],
        body: data.stats.map((s) => [
          s.emotionKey,
          s.count,
          `${s.valenceMean.toFixed(2)}±${s.valenceStdDev.toFixed(2)}`,
          `${s.arousalMean.toFixed(2)}±${s.arousalStdDev.toFixed(2)}`,
          `${s.dominanceMean.toFixed(2)}±${s.dominanceStdDev.toFixed(2)}`,
          `${s.sizeMean.toFixed(1)}±${s.sizeStdDev.toFixed(1)}`,
          `${s.speedMean.toFixed(2)}±${s.speedStdDev.toFixed(2)}`
        ]),
        styles: { fontSize: 7 },
        headStyles: { fillColor: [41, 128, 185] },
        margin: { left: 14, right: 14 }
      });

      // VAD Centroids / Emotion Mapping
      if (data.vadEmotionMapping?.length) {
        addSubTitle('VAD Centroids & Nearest-Neighbor Mapping');
        autoTable(doc, {
          startY: getLastY() + 6,
          head: [['Emotion', 'Centroid V', 'Centroid A', 'Centroid D', 'Nearest emotion', 'VAD distance']],
          body: data.vadEmotionMapping.map((m) => [
            m.emotionKey,
            m.centroidValence.toFixed(3),
            m.centroidArousal.toFixed(3),
            m.centroidDominance.toFixed(3),
            m.nearestNeighborLabel,
            m.vadDistance.toFixed(3)
          ]),
          styles: { fontSize: 7 },
          headStyles: { fillColor: [41, 128, 185] },
          margin: { left: 14, right: 14 }
        });
      }

      // Correlations
      doc.addPage();
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Pairwise Pearson Correlations', 14, 15);
      autoTable(doc, {
        startY: 20,
        head: [['Parameter A', 'Parameter B', 'Pearson r']],
        body: data.correlations.map((c) => [
          c.left ?? c.label.split('↔')[0]?.trim() ?? '',
          c.right ?? c.label.split('↔')[1]?.trim() ?? '',
          c.value.toFixed(4)
        ]),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [41, 128, 185] },
        margin: { left: 14, right: 14 }
      });

      // Parameter stats tables
      const addParamTable = (title: string, items: CategoryStat[]) => {
        if (!items.length) return;
        addSubTitle(title);
        autoTable(doc, {
          startY: getLastY() + 6,
          head: [['Key', 'n', 'share%', 'V mean±SD', 'A mean±SD', 'D mean±SD', 'Size mean±SD', 'Speed mean±SD']],
          body: items.map((i) => [
            i.key,
            i.count,
            `${(i.share * 100).toFixed(1)}%`,
            `${i.valenceMean.toFixed(2)}±${i.valenceStdDev.toFixed(2)}`,
            `${i.arousalMean.toFixed(2)}±${i.arousalStdDev.toFixed(2)}`,
            `${i.dominanceMean.toFixed(2)}±${i.dominanceStdDev.toFixed(2)}`,
            `${i.sizeMean.toFixed(1)}±${i.sizeStdDev.toFixed(1)}`,
            `${i.speedMean.toFixed(2)}±${i.speedStdDev.toFixed(2)}`
          ]),
          styles: { fontSize: 6.5 },
          headStyles: { fillColor: [41, 128, 185] },
          margin: { left: 14, right: 14 }
        });
      };

      doc.addPage();
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Parameter Statistics', 14, 15);
      (doc as DocWithAutoTable).lastAutoTable = { finalY: 15 };
      addParamTable('Shape statistics', data.parameterStats.shapes);
      addParamTable('Animation statistics', data.parameterStats.animations);
      addParamTable('Color family statistics', data.parameterStats.colorFamilies);
      addParamTable('Color statistics', data.parameterStats.colors.slice(0, 15));

      // Demographics
      doc.addPage();
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Demographic Statistics', 14, 15);
      (doc as DocWithAutoTable).lastAutoTable = { finalY: 15 };
      if (data.demographicStats?.gender?.length) {
        addSubTitle('By gender');
        autoTable(doc, {
          startY: getLastY() + 6,
          head: [['Gender', 'n', 'share%', 'V mean±SD', 'A mean±SD', 'D mean±SD']],
          body: data.demographicStats.gender.map((g) => [
            g.key,
            g.count,
            `${(g.share * 100).toFixed(1)}%`,
            `${g.valenceMean.toFixed(2)}±${g.valenceStdDev.toFixed(2)}`,
            `${g.arousalMean.toFixed(2)}±${g.arousalStdDev.toFixed(2)}`,
            `${g.dominanceMean.toFixed(2)}±${g.dominanceStdDev.toFixed(2)}`
          ]),
          styles: { fontSize: 8 },
          headStyles: { fillColor: [41, 128, 185] },
          margin: { left: 14, right: 14 }
        });
      }
      if (data.demographicStats?.country?.length) {
        addSubTitle('By country');
        autoTable(doc, {
          startY: getLastY() + 6,
          head: [['Country', 'n', 'share%', 'V mean±SD', 'A mean±SD', 'D mean±SD']],
          body: data.demographicStats.country.map((c) => [
            c.key,
            c.count,
            `${(c.share * 100).toFixed(1)}%`,
            `${c.valenceMean.toFixed(2)}±${c.valenceStdDev.toFixed(2)}`,
            `${c.arousalMean.toFixed(2)}±${c.arousalStdDev.toFixed(2)}`,
            `${c.dominanceMean.toFixed(2)}±${c.dominanceStdDev.toFixed(2)}`
          ]),
          styles: { fontSize: 8 },
          headStyles: { fillColor: [41, 128, 185] },
          margin: { left: 14, right: 14 }
        });
      }

      // Charts (captured via html2canvas)
      if (analyticsChartsRef.current) {
        try {
          const canvas = await html2canvas(analyticsChartsRef.current, { scale: 1.5, useCORS: true });
          const imgData = canvas.toDataURL('image/png');
          doc.addPage();
          doc.setFontSize(14);
          doc.setFont('helvetica', 'bold');
          doc.text('Charts', 14, 15);
          const imgWidth = pageWidth - 28;
          const imgHeight = (canvas.height * imgWidth) / canvas.width;
          doc.addImage(imgData, 'PNG', 14, 22, imgWidth, Math.min(imgHeight, 240));
        } catch {
          // charts not critical
        }
      }

      const pageCount = doc.getNumberOfPages();
      for (let page = 2; page <= pageCount; page += 1) {
        doc.setPage(page);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(90);
        doc.text('EmoProxy', pageWidth / 2, 8, { align: 'center' });
        doc.setTextColor(0);
      }

      doc.save('emoproxy-statistics-report.pdf');
      setExportStatus('PDF report downloaded.');
      notify('success', 'PDF report downloaded.');
    } catch (error) {
      setExportStatus('PDF generation failed.');
      notify('error', getErrorMessage(error) || 'PDF generation failed.');
    }
  }, [analyticsQuery.data, analyticsChartsRef]);

  if (meQuery.isLoading) return <main className="p-6">{t('admin.checkingSession')}</main>;
  if (meQuery.isError) {
    if (typeof window !== 'undefined') window.location.assign('/admin/login');
    return <main className="p-6">{t('admin.redirecting')}</main>;
  }

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6">
      {notice && (
        <div
          className={`rounded p-3 text-sm shadow ${notice.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
          role="status"
        >
          {notice.text}
        </div>
      )}

      <header className="flex items-center justify-between rounded bg-[#f4f4f4] p-4 text-[#4a4947] shadow">
        <div>
          <h1 className="text-2xl font-bold">{t('admin.panel')}</h1>
          <p className="text-sm">
            {t('admin.loggedInAs')} {meQuery.data?.username}
          </p>
          {hasUnsavedChanges && <p className="text-sm text-amber-700">{t('admin.unsavedChanges')}</p>}
        </div>
        <button type="button" className="rounded border border-[#b17457]/40 bg-white px-4 py-2" onClick={handleLogout}>
          {t('admin.logout')}
        </button>
      </header>

      <section className="grid gap-6 md:grid-cols-2">
        <div className="rounded bg-[#f4f4f4] p-4 text-[#4a4947] shadow">
          <h2 className="mb-3 text-xl font-semibold">Users</h2>
          <form className="mb-4 space-y-2" onSubmit={handleCreateUser}>
            <label className="block text-sm font-medium" htmlFor="new-username">
              Username
            </label>
            <input id="new-username" className="w-full rounded border border-[#b17457]/40 bg-white p-2" placeholder="Username" {...createUserForm.register('username')} />
            {createUserForm.formState.errors.username && <p className="text-sm text-red-700">{createUserForm.formState.errors.username.message}</p>}
            <label className="block text-sm font-medium" htmlFor="new-password">
              Password
            </label>
            <input id="new-password" className="w-full rounded border border-[#b17457]/40 bg-white p-2" placeholder="Password" type="password" {...createUserForm.register('password')} />
            <p className="text-xs text-[#4a4947]/80">Password must contain at least 8 characters.</p>
            {createUserForm.formState.errors.password && <p className="text-sm text-red-700">{createUserForm.formState.errors.password.message}</p>}
            <button type="submit" className="rounded bg-[#b17457] px-4 py-2 text-white disabled:opacity-50" disabled={createUserMutation.isPending}>
              Create user
            </button>
          </form>
          <ul className="space-y-2 text-sm">
            {(usersQuery.data ?? []).map((user) => (
              <li key={user.id} className="rounded border border-[#b17457]/30 bg-white p-2">
                {user.username}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded bg-[#f4f4f4] p-4 text-[#4a4947] shadow">
          <h2 className="mb-3 text-xl font-semibold">Change password</h2>
          <form className="space-y-2" onSubmit={handleChangePassword}>
            <label className="block text-sm font-medium" htmlFor="target-user-id">
              Select user
            </label>
            <select id="target-user-id" className="w-full rounded border border-[#b17457]/40 bg-white p-2" {...changePasswordForm.register('userId')}>
              <option value="">Choose a user</option>
              {(usersQuery.data ?? []).map((user) => (
                <option key={user.id} value={user.id}>
                  {user.username}
                </option>
              ))}
            </select>
            {changePasswordForm.formState.errors.userId && <p className="text-sm text-red-700">{changePasswordForm.formState.errors.userId.message}</p>}
            <label className="block text-sm font-medium" htmlFor="target-new-password">
              New password
            </label>
            <input
              id="target-new-password"
              className="w-full rounded border border-[#b17457]/40 bg-white p-2"
              placeholder="New password"
              type="password"
              {...changePasswordForm.register('newPassword')}
            />
            <p className="text-xs text-[#4a4947]/80">Password must contain at least 8 characters.</p>
            {changePasswordForm.formState.errors.newPassword && <p className="text-sm text-red-700">{changePasswordForm.formState.errors.newPassword.message}</p>}
            <button type="submit" className="rounded bg-[#b17457] px-4 py-2 text-white disabled:opacity-50" disabled={changePasswordMutation.isPending}>
              Update password
            </button>
          </form>
        </div>
      </section>

      <section className="rounded bg-[#f4f4f4] p-4 text-[#4a4947] shadow">
        <div className="mb-4 flex flex-wrap gap-2">
          {(['configuration', 'responses', 'analytics', 'export-stats'] as const).map((tab) => (
            <button
              type="button"
              key={tab}
              className={`rounded px-3 py-2 text-sm ${activeTab === tab ? 'bg-[#b17457] text-white' : 'border border-[#b17457]/40 bg-white'}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab === 'configuration'
                ? t('admin.tab.configuration')
                : tab === 'responses'
                  ? t('admin.tab.responses')
                  : tab === 'analytics'
                    ? t('admin.tab.analytics')
                    : t('admin.tab.exportStats')}
            </button>
          ))}
        </div>

        {activeTab === 'configuration' && surveyDraft && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Survey configuration</h2>
            <div className="rounded border border-[#b17457]/30 bg-white p-3">
              <p className="text-xs uppercase tracking-wide text-[#4a4947]/70">Survey title</p>
              <p className="text-base font-semibold">{surveyDraft.introTitle}</p>
            </div>
            <div className="rounded border border-[#b17457]/30 bg-white p-3">
              <p className="text-xs uppercase tracking-wide text-[#4a4947]/70">Survey description</p>
              <p className="text-sm">{surveyDraft.introDescription}</p>
            </div>

            <div className="space-y-2">
              <div className="rounded border border-[#b17457]/20 bg-[#fdf6f0] p-3 text-xs text-[#4a4947]/80">
                <strong>Size scale</strong> — controls the survey slider range for shape size. Actual rendered size is interpolated
                from the scale: scale minimum → {HARDCODED_MIN_SIZE_PX} px (smallest), scale maximum → {HARDCODED_MAX_SIZE_PX} px (largest).
              </div>
              <div className="grid gap-2 md:grid-cols-2">
                <label className="space-y-1 text-sm">
                  <span className="block font-medium">Min size scale</span>
                  <input
                    className="w-full rounded border border-[#b17457]/40 bg-white p-2"
                    type="number"
                    min={0}
                    value={surveyDraft.minSizeScale}
                    onChange={(event) => setSurveyDraft((value) => (value ? { ...value, minSizeScale: Number(event.target.value) } : value))}
                  />
                </label>
                <label className="space-y-1 text-sm">
                  <span className="block font-medium">Max size scale</span>
                  <input
                    className="w-full rounded border border-[#b17457]/40 bg-white p-2"
                    type="number"
                    min={0}
                    value={surveyDraft.maxSizeScale}
                    onChange={(event) => setSurveyDraft((value) => (value ? { ...value, maxSizeScale: Number(event.target.value) } : value))}
                  />
                </label>
              </div>
              <div className="rounded border border-[#b17457]/20 bg-[#fdf6f0] p-3 text-xs text-[#4a4947]/80">
                <strong>Speed scale</strong> — controls the survey slider range for animation speed. Actual speed is interpolated
                from the scale: scale minimum → ~{speedToCyclesPerSecond(HARDCODED_MIN_SPEED).toFixed(2)} cycles/s ({(Math.max(0.1, 3 - HARDCODED_MIN_SPEED)).toFixed(1)} s/cycle, slowest),
                scale maximum → ~{speedToCyclesPerSecond(HARDCODED_MAX_SPEED).toFixed(2)} cycles/s ({Math.max(0.1, 3 - HARDCODED_MAX_SPEED).toFixed(1)} s/cycle, fastest).
              </div>
              <div className="grid gap-2 md:grid-cols-2">
                <label className="space-y-1 text-sm">
                  <span className="block font-medium">Min speed scale</span>
                  <input
                    className="w-full rounded border border-[#b17457]/40 bg-white p-2"
                    type="number"
                    min={0}
                    value={surveyDraft.minSpeedScale}
                    onChange={(event) => setSurveyDraft((value) => (value ? { ...value, minSpeedScale: Number(event.target.value) } : value))}
                  />
                </label>
                <label className="space-y-1 text-sm">
                  <span className="block font-medium">Max speed scale</span>
                  <input
                    className="w-full rounded border border-[#b17457]/40 bg-white p-2"
                    type="number"
                    min={0}
                    value={surveyDraft.maxSpeedScale}
                    onChange={(event) => setSurveyDraft((value) => (value ? { ...value, maxSpeedScale: Number(event.target.value) } : value))}
                  />
                </label>
              </div>
            </div>

            <div className="rounded border border-[#b17457]/30 bg-white p-3 text-sm">
              Active emotion count is calculated automatically from enabled emotions.
            </div>

            <h3 className="text-lg font-semibold">Emotions</h3>
            <button
              type="button"
              className="rounded border border-[#b17457]/40 bg-white px-3 py-2 text-sm"
              onClick={() =>
                setSurveyDraft((value) =>
                  value
                    ? {
                        ...value,
                        emotions: [...value.emotions, { key: `emotion_${value.emotions.length + 1}`, label: `Emotion ${value.emotions.length + 1}`, order: value.emotions.length, enabled: true }]
                      }
                    : value
                )
              }
            >
              Add emotion
            </button>
            <div className="space-y-2">
              {surveyDraft.emotions.map((emotion, index) => (
                <div key={`emotion-${index}`} className="grid gap-2 rounded border border-[#b17457]/20 bg-white p-2 md:grid-cols-5">
                  <input
                    className="rounded border border-[#b17457]/40 p-2"
                    value={emotion.key}
                    onChange={(event) =>
                      setSurveyDraft((value) => {
                        if (!value) return value;
                        const next = [...value.emotions];
                        next[index] = { ...next[index], key: event.target.value };
                        return { ...value, emotions: next };
                      })
                    }
                    placeholder="Emotion ID (key)"
                  />
                  <input
                    className="rounded border border-[#b17457]/40 p-2"
                    value={emotion.label}
                    onChange={(event) =>
                      setSurveyDraft((value) => {
                        if (!value) return value;
                        const next = [...value.emotions];
                        next[index] = { ...next[index], label: event.target.value };
                        return { ...value, emotions: next };
                      })
                    }
                    placeholder="Emotion name"
                  />
                  <label className="flex items-center gap-2 rounded border border-[#b17457]/40 p-2">
                    <input
                      type="checkbox"
                      checked={emotion.enabled}
                      onChange={(event) =>
                        setSurveyDraft((value) => {
                          if (!value) return value;
                          const next = [...value.emotions];
                          next[index] = { ...next[index], enabled: event.target.checked };
                          return { ...value, emotions: next };
                        })
                      }
                    />
                    Enabled
                  </label>
                  <button
                    type="button"
                    className="rounded border border-red-300 bg-red-50 px-3 py-2 text-red-700"
                    onClick={() =>
                      setSurveyDraft((value) =>
                        value ? { ...value, emotions: value.emotions.filter((_, itemIndex) => itemIndex !== index).map((item, order) => ({ ...item, order })) } : value
                      )
                    }
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>

            <h3 className="text-lg font-semibold">Shapes (custom SVG supported)</h3>
            <p className="text-xs text-[#4a4947]/70">
              Loaded custom SVG presets: {surveyDraft.shapes.filter((item) => !!item.svg?.trim()).length}/{surveyDraft.shapes.length}
            </p>
            <button
              type="button"
              className="rounded border border-[#b17457]/40 bg-white px-3 py-2 text-sm"
              onClick={() =>
                setSurveyDraft((value) =>
                  value
                    ? {
                        ...value,
                        shapes: [...value.shapes, { key: `shape_${value.shapes.length + 1}`, name: `Shape ${value.shapes.length + 1}`, svg: '', enabled: true, order: value.shapes.length }]
                      }
                    : value
                )
              }
            >
              Add shape
            </button>
            <div className="space-y-2">
              {surveyDraft.shapes.map((shape, index) => {
                const error = svgPreviewError(shape.svg);
                return (
                  <div key={`shape-${index}`} className="grid gap-2 rounded border border-[#b17457]/20 bg-white p-2">
                    <div className="grid gap-2 md:grid-cols-4">
                      <input
                        className="rounded border border-[#b17457]/40 p-2"
                        value={shape.key}
                        onChange={(event) =>
                          setSurveyDraft((value) => {
                            if (!value) return value;
                            const next = [...value.shapes];
                            next[index] = { ...next[index], key: event.target.value };
                            return { ...value, shapes: next };
                          })
                        }
                        placeholder="Shape ID (key)"
                      />
                      <input
                        className="rounded border border-[#b17457]/40 p-2"
                        value={shape.name}
                        onChange={(event) =>
                          setSurveyDraft((value) => {
                            if (!value) return value;
                            const next = [...value.shapes];
                            next[index] = { ...next[index], name: event.target.value };
                            return { ...value, shapes: next };
                          })
                        }
                        placeholder="Shape name"
                      />
                      <label className="flex items-center gap-2 rounded border border-[#b17457]/40 p-2">
                        <input
                          type="checkbox"
                          checked={shape.enabled}
                          onChange={(event) =>
                            setSurveyDraft((value) => {
                              if (!value) return value;
                              const next = [...value.shapes];
                              next[index] = { ...next[index], enabled: event.target.checked };
                              return { ...value, shapes: next };
                            })
                          }
                        />
                        Enabled
                      </label>
                      <button
                        type="button"
                        className="rounded border border-red-300 bg-red-50 px-3 py-2 text-red-700"
                        onClick={() =>
                          setSurveyDraft((value) =>
                            value ? { ...value, shapes: value.shapes.filter((_, itemIndex) => itemIndex !== index).map((item, order) => ({ ...item, order })) } : value
                          )
                        }
                      >
                        Remove
                      </button>
                    </div>
                    <div className="grid gap-2 md:grid-cols-2">
                      <label className="space-y-1 text-sm">
                        <span className="block font-medium">Custom SVG markup</span>
                        <p className="text-xs text-[#4a4947]/70">For proper rendering, use <code>viewBox='0 0 100 100'</code> on the root SVG element.</p>
                        <textarea
                          className="w-full rounded border border-[#b17457]/40 p-2"
                          rows={4}
                          value={shape.svg ?? ''}
                          onChange={(event) =>
                            setSurveyDraft((value) => {
                              if (!value) return value;
                              const next = [...value.shapes];
                              next[index] = { ...next[index], svg: event.target.value };
                              return { ...value, shapes: next };
                            })
                          }
                          placeholder="Optional custom SVG. Example: <svg viewBox='0 0 100 100'><path d='...'/></svg>"
                        />
                      </label>
                      <div className="rounded border border-[#b17457]/30 p-3">
                        <p className="mb-2 text-xs uppercase tracking-wide text-[#4a4947]/70">SVG preview</p>
                        {error ? (
                          <p className="text-sm text-red-700">{error}</p>
                        ) : shape.svg?.trim() ? (
                          <div className="h-16 w-16 text-[#b17457]" dangerouslySetInnerHTML={{ __html: shape.svg }} />
                        ) : (
                          <p className="text-sm text-[#4a4947]/70">No SVG provided.</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <h3 className="text-lg font-semibold">Animations (JSON keyframes supported)</h3>
            <p className="text-xs text-[#4a4947]/70">
              Loaded custom keyframes presets: {surveyDraft.animations.filter((item) => !!item.keyframesJson?.trim()).length}/{surveyDraft.animations.length}
            </p>
            <button
              type="button"
              className="rounded border border-[#b17457]/40 bg-white px-3 py-2 text-sm"
              onClick={() =>
                setSurveyDraft((value) =>
                  value
                    ? {
                        ...value,
                        animations: [
                          ...value.animations,
                          {
                            name: `Animation ${value.animations.length + 1}`,
                            type: `animation_${value.animations.length + 1}`,
                            enabled: true,
                            keyframesJson: ''
                          }
                        ]
                      }
                    : value
                )
              }
            >
              Add animation
            </button>
            <div className="space-y-2">
              {surveyDraft.animations.map((animation, index) => {
                const preview = parseKeyframesJsonWithValidation(animation.keyframesJson);
                return (
                  <div key={`animation-${index}`} className="grid gap-2 rounded border border-[#b17457]/20 bg-white p-2">
                    <div className="grid gap-2 md:grid-cols-4">
                      <input
                        className="rounded border border-[#b17457]/40 p-2"
                        value={animation.type}
                        onChange={(event) =>
                          setSurveyDraft((value) => {
                            if (!value) return value;
                            const next = [...value.animations];
                            next[index] = { ...next[index], type: event.target.value };
                            return { ...value, animations: next };
                          })
                        }
                        placeholder="Animation ID (type)"
                      />
                      <input
                        className="rounded border border-[#b17457]/40 p-2"
                        value={animation.name}
                        onChange={(event) =>
                          setSurveyDraft((value) => {
                            if (!value) return value;
                            const next = [...value.animations];
                            next[index] = { ...next[index], name: event.target.value };
                            return { ...value, animations: next };
                          })
                        }
                        placeholder="Animation name"
                      />
                      <label className="flex items-center gap-2 rounded border border-[#b17457]/40 p-2">
                        <input
                          type="checkbox"
                          checked={animation.enabled}
                          onChange={(event) =>
                            setSurveyDraft((value) => {
                              if (!value) return value;
                              const next = [...value.animations];
                              next[index] = { ...next[index], enabled: event.target.checked };
                              return { ...value, animations: next };
                            })
                          }
                        />
                        Enabled
                      </label>
                      <button
                        type="button"
                        className="rounded border border-red-300 bg-red-50 px-3 py-2 text-red-700"
                        onClick={() =>
                          setSurveyDraft((value) =>
                            value ? { ...value, animations: value.animations.filter((_, itemIndex) => itemIndex !== index) } : value
                          )
                        }
                      >
                        Remove
                      </button>
                    </div>
                    <div className="grid gap-2 md:grid-cols-2">
                      <label className="space-y-1 text-sm">
                        <span className="block font-medium">Custom keyframes JSON</span>
                        <textarea
                          className="w-full rounded border border-[#b17457]/40 p-2"
                          rows={4}
                          value={animation.keyframesJson ?? ''}
                          onChange={(event) =>
                            setSurveyDraft((value) => {
                              if (!value) return value;
                              const next = [...value.animations];
                              next[index] = { ...next[index], keyframesJson: event.target.value };
                              return { ...value, animations: next };
                            })
                          }
                          placeholder='Optional keyframes JSON. Example: {"0%":{"transform":"scale(1)"},"100%":{"transform":"scale(1.2)"}}'
                        />
                      </label>
                      <div className="rounded border border-[#b17457]/30 p-3">
                        <p className="mb-2 text-xs uppercase tracking-wide text-[#4a4947]/70">Animation preview</p>
                        {!preview.valid && <p className="text-sm text-red-700">{preview.error}</p>}
                        {preview.valid && preview.css ? (
                          <>
                            <style>{`@keyframes preview-${index}{${preview.css}}`}</style>
                            <div className="h-10 w-10 bg-[#b17457]" style={{ animation: `preview-${index} 1.3s infinite` }} />
                          </>
                        ) : (
                          <p className="text-sm text-[#4a4947]/70">No custom keyframes provided.</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <h3 className="text-lg font-semibold">Demographics fields visibility</h3>
            <div className="grid gap-2 md:grid-cols-3">
              {(surveyDraft.additionalFields ?? []).map((field, index) => (
                <label key={field.key} className="flex items-center gap-2 rounded border border-[#b17457]/30 bg-white p-3">
                  <input
                    type="checkbox"
                    checked={field.enabled}
                    onChange={(event) =>
                      setSurveyDraft((value) => {
                        if (!value) return value;
                        const next = [...(value.additionalFields ?? [])];
                        next[index] = { ...next[index], enabled: event.target.checked };
                        return { ...value, additionalFields: next };
                      })
                    }
                  />
                  <span>{field.label}</span>
                </label>
              ))}
            </div>

            <button type="button" className="rounded bg-[#b17457] px-4 py-2 text-white disabled:opacity-50" onClick={handleSaveSurveyConfig} disabled={surveyConfigMutation.isPending}>
              Save survey configuration
            </button>
          </div>
        )}

        {activeTab === 'responses' && (
          <div className="space-y-3">
            <h2 className="text-xl font-semibold">Responses preview (internal DB)</h2>
            <p className="text-sm">Total sessions: {sessionsQuery.data?.length ?? 0}</p>
            <div className="space-y-2">
              {(sessionsQuery.data ?? []).map((session) => (
                <details key={session.id} className="rounded border border-[#b17457]/30 bg-white p-3">
                  <summary className="cursor-pointer text-sm font-medium">
                    {new Date(session.createdAt).toLocaleString()} · {session.country || 'No country'} · {session.emotionResponses.length} responses
                  </summary>
                  <div className="mt-2 text-sm">
                    {session.emotionResponses.map((entry, index) => (
                      <p key={`${session.id}-${index}`}>
                        {entry.emotionKey}: shape={entry.shape}, animation={entry.animationType}, size={entry.size}, speed={entry.speed}, VAD=
                        {entry.valence}/{entry.arousal}/{entry.dominance}
                      </p>
                    ))}
                  </div>
                </details>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">{t('analytics.title')}</h2>

            {/* Outlier settings */}
            <div className="rounded border border-[#b17457]/30 bg-white p-4">
              <h3 className="mb-3 font-semibold">{t('analytics.filterSettings')}</h3>
              <div className="grid gap-2 md:grid-cols-2">
                <label className="flex items-center gap-2 rounded border border-[#b17457]/30 p-2">
                  <input
                    type="checkbox"
                    checked={analyticsDraft?.outlierFilteringEnabled ?? true}
                    onChange={(event) =>
                      setAnalyticsDraft((value) =>
                        value ? { ...value, outlierFilteringEnabled: event.target.checked } : { outlierFilteringEnabled: event.target.checked, zScoreThreshold: 2 }
                      )
                    }
                  />
                  {t('analytics.enableOutlierFiltering')}
                </label>
                <label className="space-y-1 rounded border border-[#b17457]/30 p-2 text-sm">
                  <span className="block font-medium">{t('analytics.zScoreThreshold')}</span>
                  <input
                    className="w-full rounded border border-[#b17457]/40 bg-white p-2"
                    type="number"
                    step={0.1}
                    min={0.1}
                    value={analyticsDraft?.zScoreThreshold ?? 2}
                    onChange={(event) =>
                      setAnalyticsDraft((value) =>
                        value ? { ...value, zScoreThreshold: Number(event.target.value) } : { outlierFilteringEnabled: true, zScoreThreshold: Number(event.target.value) }
                      )
                    }
                  />
                </label>
              </div>
              <button type="button" className="mt-2 rounded bg-[#b17457] px-4 py-2 text-white" onClick={handleSaveAnalytics}>
                {t('analytics.saveSettings')}
              </button>
            </div>

            {/* Respondent summary */}
            <div className="rounded border border-[#b17457]/30 bg-white p-4">
              <h3 className="mb-3 font-semibold">{t('analytics.respondentSummary')}</h3>
              <div className="grid gap-3 text-sm md:grid-cols-4">
                <div className="rounded bg-[#f4f4f4] p-3 text-center">
                  <p className="text-2xl font-bold text-[#b17457]">{analyticsQuery.data?.respondentStats?.totalSessions ?? '—'}</p>
                  <p className="text-xs text-[#4a4947]/70">{t('analytics.sessions')}</p>
                </div>
                <div className="rounded bg-[#f4f4f4] p-3 text-center">
                  <p className="text-2xl font-bold text-[#b17457]">{analyticsQuery.data?.respondentStats?.totalResponses ?? '—'}</p>
                  <p className="text-xs text-[#4a4947]/70">{t('analytics.totalResponses')}</p>
                </div>
                <div className="rounded bg-[#f4f4f4] p-3 text-center">
                  <p className="text-2xl font-bold text-green-700">{analyticsQuery.data?.accepted ?? '—'}</p>
                  <p className="text-xs text-[#4a4947]/70">{t('analytics.accepted')}</p>
                </div>
                <div className="rounded bg-[#f4f4f4] p-3 text-center">
                  <p className="text-2xl font-bold text-red-600">{analyticsQuery.data?.rejected ?? '—'}</p>
                  <p className="text-xs text-[#4a4947]/70">{t('analytics.rejected')}</p>
                </div>
              </div>
              {analyticsQuery.data?.respondentStats && (
                <div className="mt-3 grid gap-3 text-sm md:grid-cols-3">
                  <div className="rounded bg-[#f4f4f4] p-3 text-center">
                    <p className="text-lg font-bold text-[#b17457]">
                      {analyticsQuery.data.respondentStats.ageMean.toFixed(1)} ± {analyticsQuery.data.respondentStats.ageStdDev.toFixed(1)}
                    </p>
                    <p className="text-xs text-[#4a4947]/70">{t('analytics.ageMeanSd')}</p>
                  </div>
                  <div className="rounded bg-[#f4f4f4] p-3 text-center">
                    <p className="text-lg font-bold text-[#b17457]">
                      {analyticsQuery.data.respondentStats.ageMin} – {analyticsQuery.data.respondentStats.ageMax}
                    </p>
                    <p className="text-xs text-[#4a4947]/70">{t('analytics.ageRange')}</p>
                  </div>
                  <div className="rounded bg-[#f4f4f4] p-3 text-center">
                    <p className="text-lg font-bold text-[#b17457]">{analyticsQuery.data.threshold}</p>
                    <p className="text-xs text-[#4a4947]/70">{t('analytics.zScoreThreshold')}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Charts container for PDF capture */}
            <div ref={analyticsChartsRef} className="space-y-4">
              {/* VAD Means Chart */}
              <div className="rounded border border-[#b17457]/30 bg-white p-4">
                <h3 className="mb-3 font-semibold">{t('analytics.vadMeansChart')}</h3>
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analyticsQuery.data?.stats ?? []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="emotionKey" />
                      <YAxis domain={[0, 1]} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="valenceMean" name="Valence (mean)" fill="#22c55e" />
                      <Bar dataKey="arousalMean" name="Arousal (mean)" fill="#3b82f6" />
                      <Bar dataKey="dominanceMean" name="Dominance (mean)" fill="#f59e0b" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Gender distribution chart */}
              {(analyticsQuery.data?.demographicStats?.gender?.length ?? 0) > 0 && (
                <div className="rounded border border-[#b17457]/30 bg-white p-4">
                  <h3 className="mb-3 font-semibold">{t('analytics.genderDistributionChart')}</h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="h-60">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={analyticsQuery.data!.demographicStats.gender}
                            dataKey="count"
                            nameKey="key"
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            label={formatPieLabel}
                          >
                            {analyticsQuery.data!.demographicStats.gender.map((_, i) => (
                              <Cell key={`cell-g-${i}`} fill={PIE_CHART_COLORS[i % PIE_CHART_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="h-60">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={analyticsQuery.data!.demographicStats.gender}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="key" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="valenceMean" name="Valence" fill="#22c55e" />
                          <Bar dataKey="arousalMean" name="Arousal" fill="#3b82f6" />
                          <Bar dataKey="dominanceMean" name="Dominance" fill="#f59e0b" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              )}

              {/* Country distribution chart */}
              {(analyticsQuery.data?.demographicStats?.country?.length ?? 0) > 0 && (
                <div className="rounded border border-[#b17457]/30 bg-white p-4">
                  <h3 className="mb-3 font-semibold">{t('analytics.countryDistributionChart')}</h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={analyticsQuery.data!.demographicStats.country.slice(0, 10)}
                            dataKey="count"
                            nameKey="key"
                            cx="50%"
                            cy="50%"
                            outerRadius={90}
                            label={formatPieLabel}
                          >
                            {analyticsQuery.data!.demographicStats.country.slice(0, 10).map((_, i) => (
                              <Cell key={`cell-c-${i}`} fill={PIE_CHART_COLORS[i % PIE_CHART_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={analyticsQuery.data!.demographicStats.country.slice(0, 15)} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" />
                          <YAxis dataKey="key" type="category" width={90} />
                          <Tooltip />
                          <Bar dataKey="count" name="Respondents" fill="#3b82f6" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              )}

              {/* Size per emotion chart (separate, scale values) */}
              {(analyticsQuery.data?.stats?.length ?? 0) > 0 && (() => {
                const minSize = configQuery.data?.surveyConfig.minSizeScale ?? 1;
                const maxSize = configQuery.data?.surveyConfig.maxSizeScale ?? 10;
                const sizeData = analyticsQuery.data!.stats.map((s) => ({
                  emotionKey: s.emotionKey,
                  sizeMeanScale: Number(sizeToScale(s.sizeMean, minSize, maxSize).toFixed(2))
                }));
                return (
                  <div className="rounded border border-[#b17457]/30 bg-white p-4">
                    <h3 className="mb-1 font-semibold">{t('analytics.sizeMeanChart')}</h3>
                    <p className="mb-3 text-xs text-[#4a4947]/70">
                      {t('analytics.sizeChartNote').replace('{min}', String(minSize)).replace('{max}', String(maxSize))}
                    </p>
                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={sizeData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="emotionKey" />
                          <YAxis domain={[minSize, maxSize]} />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="sizeMeanScale" name={`Size mean (scale ${minSize}–${maxSize})`} fill="#a855f7" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                );
              })()}

              {/* Speed per emotion chart (separate, scale values) */}
              {(analyticsQuery.data?.stats?.length ?? 0) > 0 && (() => {
                const minSpeed = configQuery.data?.surveyConfig.minSpeedScale ?? 1;
                const maxSpeed = configQuery.data?.surveyConfig.maxSpeedScale ?? 10;
                const speedData = analyticsQuery.data!.stats.map((s) => ({
                  emotionKey: s.emotionKey,
                  speedMeanScale: Number(speedToScale(s.speedMean, minSpeed, maxSpeed).toFixed(2))
                }));
                return (
                  <div className="rounded border border-[#b17457]/30 bg-white p-4">
                    <h3 className="mb-1 font-semibold">{t('analytics.speedMeanChart')}</h3>
                    <p className="mb-3 text-xs text-[#4a4947]/70">
                      {t('analytics.speedChartNote').replace('{min}', String(minSpeed)).replace('{max}', String(maxSpeed))}
                    </p>
                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={speedData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="emotionKey" />
                          <YAxis domain={[minSpeed, maxSpeed]} />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="speedMeanScale" name={`Speed mean (scale ${minSpeed}–${maxSpeed})`} fill="#ef4444" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                );
              })()}

              {/* Radar chart for VAD centroids */}
              {(analyticsQuery.data?.vadEmotionMapping?.length ?? 0) > 0 && (
                <div className="rounded border border-[#b17457]/30 bg-white p-4">
                  <h3 className="mb-3 font-semibold">{t('analytics.vadRadarChart')}</h3>
                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={analyticsQuery.data!.vadEmotionMapping.map((m) => ({
                        emotion: m.emotionKey,
                        Valence: m.centroidValence,
                        Arousal: m.centroidArousal,
                        Dominance: m.centroidDominance
                      }))}>
                        <PolarGrid />
                        <PolarAngleAxis dataKey="emotion" />
                        <Radar name="Valence" dataKey="Valence" stroke="#22c55e" fill="#22c55e" fillOpacity={0.3} />
                        <Radar name="Arousal" dataKey="Arousal" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                        <Radar name="Dominance" dataKey="Dominance" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.3} />
                        <Legend />
                        <Tooltip />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>

            {/* VAD Emotion Stats Table */}
            <div className="rounded border border-[#b17457]/30 bg-white p-4">
              <h3 className="mb-3 font-semibold">{t('analytics.vadStatsTable')}</h3>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#b17457]/10">
                      <th className="border border-[#b17457]/20 p-2 text-left">{t('analytics.col.emotion')}</th>
                      <th className="border border-[#b17457]/20 p-2 text-right" title="Number of responses">{t('analytics.col.count')}</th>
                      <th className="border border-[#b17457]/20 p-2 text-right" title="Valence mean">{t('analytics.col.valenceMean')}</th>
                      <th className="border border-[#b17457]/20 p-2 text-right" title="Valence standard deviation">{t('analytics.col.valenceSD')}</th>
                      <th className="border border-[#b17457]/20 p-2 text-right" title="Valence median">{t('analytics.col.valenceMedian')}</th>
                      <th className="border border-[#b17457]/20 p-2 text-right" title="Arousal mean">{t('analytics.col.arousalMean')}</th>
                      <th className="border border-[#b17457]/20 p-2 text-right" title="Arousal standard deviation">{t('analytics.col.arousalSD')}</th>
                      <th className="border border-[#b17457]/20 p-2 text-right" title="Arousal median">{t('analytics.col.arousalMedian')}</th>
                      <th className="border border-[#b17457]/20 p-2 text-right" title="Dominance mean">{t('analytics.col.dominanceMean')}</th>
                      <th className="border border-[#b17457]/20 p-2 text-right" title="Dominance standard deviation">{t('analytics.col.dominanceSD')}</th>
                      <th className="border border-[#b17457]/20 p-2 text-right" title="Dominance median">{t('analytics.col.dominanceMedian')}</th>
                      <th className="border border-[#b17457]/20 p-2 text-right" title="Size mean (raw pixels)">{t('analytics.col.sizeMean')}</th>
                      <th className="border border-[#b17457]/20 p-2 text-right" title="Size standard deviation">{t('analytics.col.sizeSD')}</th>
                      <th className="border border-[#b17457]/20 p-2 text-right" title="Speed mean (raw factor)">{t('analytics.col.speedMean')}</th>
                      <th className="border border-[#b17457]/20 p-2 text-right" title="Speed standard deviation">{t('analytics.col.speedSD')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(analyticsQuery.data?.stats ?? []).map((s) => (
                      <tr key={s.emotionKey} className="even:bg-[#f9f6f3]">
                        <td className="border border-[#b17457]/20 p-2 font-medium">{s.emotionKey}</td>
                        <td className="border border-[#b17457]/20 p-2 text-right">{s.count}</td>
                        <td className="border border-[#b17457]/20 p-2 text-right">{s.valenceMean.toFixed(3)}</td>
                        <td className="border border-[#b17457]/20 p-2 text-right">{s.valenceStdDev.toFixed(3)}</td>
                        <td className="border border-[#b17457]/20 p-2 text-right">{s.valenceMedian.toFixed(3)}</td>
                        <td className="border border-[#b17457]/20 p-2 text-right">{s.arousalMean.toFixed(3)}</td>
                        <td className="border border-[#b17457]/20 p-2 text-right">{s.arousalStdDev.toFixed(3)}</td>
                        <td className="border border-[#b17457]/20 p-2 text-right">{s.arousalMedian.toFixed(3)}</td>
                        <td className="border border-[#b17457]/20 p-2 text-right">{s.dominanceMean.toFixed(3)}</td>
                        <td className="border border-[#b17457]/20 p-2 text-right">{s.dominanceStdDev.toFixed(3)}</td>
                        <td className="border border-[#b17457]/20 p-2 text-right">{s.dominanceMedian.toFixed(3)}</td>
                        <td className="border border-[#b17457]/20 p-2 text-right">{s.sizeMean.toFixed(1)}</td>
                        <td className="border border-[#b17457]/20 p-2 text-right">{s.sizeStdDev.toFixed(1)}</td>
                        <td className="border border-[#b17457]/20 p-2 text-right">{s.speedMean.toFixed(3)}</td>
                        <td className="border border-[#b17457]/20 p-2 text-right">{s.speedStdDev.toFixed(3)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-xs text-[#4a4947]/60">{t('analytics.tableFootnote')}</p>
            </div>

            {/* VAD Centroids / Emotion Mapping Table */}
            {(analyticsQuery.data?.vadEmotionMapping?.length ?? 0) > 0 && (
              <div className="rounded border border-[#b17457]/30 bg-white p-4">
                <h3 className="mb-3 font-semibold">{t('analytics.vadMappingTable')}</h3>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-xs">
                    <thead>
                      <tr className="bg-[#b17457]/10">
                        <th className="border border-[#b17457]/20 p-2 text-left">{t('analytics.col.emotion')}</th>
                        <th className="border border-[#b17457]/20 p-2 text-right" title="Mean Valence centroid">{t('analytics.col.centroidV')}</th>
                        <th className="border border-[#b17457]/20 p-2 text-right" title="Mean Arousal centroid">{t('analytics.col.centroidA')}</th>
                        <th className="border border-[#b17457]/20 p-2 text-right" title="Mean Dominance centroid">{t('analytics.col.centroidD')}</th>
                        <th className="border border-[#b17457]/20 p-2 text-left" title="Closest other emotion in VAD space">{t('analytics.col.nearestEmotion')}</th>
                        <th className="border border-[#b17457]/20 p-2 text-right" title="Euclidean distance in VAD space">{t('analytics.col.vadDistance')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(analyticsQuery.data?.vadEmotionMapping ?? []).map((m) => (
                        <tr key={m.emotionKey} className="even:bg-[#f9f6f3]">
                          <td className="border border-[#b17457]/20 p-2 font-medium">{m.emotionKey}</td>
                          <td className="border border-[#b17457]/20 p-2 text-right">{m.centroidValence.toFixed(3)}</td>
                          <td className="border border-[#b17457]/20 p-2 text-right">{m.centroidArousal.toFixed(3)}</td>
                          <td className="border border-[#b17457]/20 p-2 text-right">{m.centroidDominance.toFixed(3)}</td>
                          <td className="border border-[#b17457]/20 p-2">{m.nearestNeighborLabel}</td>
                          <td className="border border-[#b17457]/20 p-2 text-right">{m.vadDistance.toFixed(3)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="mt-2 text-xs text-[#4a4947]/60">{t('analytics.tableFootnote')}</p>
              </div>
            )}

            {/* Full Pairwise Correlation Matrix */}
            {(analyticsQuery.data?.correlations?.length ?? 0) > 0 && (
              <div className="rounded border border-[#b17457]/30 bg-white p-4">
                <h3 className="mb-3 font-semibold">{t('analytics.correlationMatrix')}</h3>
                {(() => {
                  // Build ordered key list: numeric keys first, then shape:* values, then animationType:* values
                  const numericKeys = ['valence', 'arousal', 'dominance', 'size', 'speed'];
                  const corrData = analyticsQuery.data!.correlations;
                  const allKeysSet = new Set<string>(numericKeys);
                  for (const c of corrData) {
                    if (c.left) allKeysSet.add(c.left);
                    if (c.right) allKeysSet.add(c.right);
                  }
                  const shapeKeys = [...allKeysSet].filter((k) => k.startsWith('shape:')).sort();
                  const animKeys = [...allKeysSet].filter((k) => k.startsWith('animationType:')).sort();
                  const keys = [...numericKeys, ...shapeKeys, ...animKeys];

                  const keyLabel = (k: string) => {
                    if (k.startsWith('shape:')) return k.slice(6);
                    if (k.startsWith('animationType:')) return k.slice(14);
                    return k.charAt(0).toUpperCase() + k.slice(1);
                  };

                  const corrMap = new Map<string, number>();
                  for (const c of corrData) {
                    const l = c.left ?? '';
                    const r = c.right ?? '';
                    corrMap.set(`${l}|${r}`, c.value);
                    corrMap.set(`${r}|${l}`, c.value);
                    corrMap.set(`${l}|${l}`, 1);
                    corrMap.set(`${r}|${r}`, 1);
                  }
                  return (
                    <div className="overflow-x-auto">
                      <table className="border-collapse text-xs">
                        <thead>
                          <tr className="bg-[#b17457]/10">
                            <th className="border border-[#b17457]/20 p-2"></th>
                            {keys.map((k) => (
                              <th key={k} className="border border-[#b17457]/20 p-2 text-center">{keyLabel(k)}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {keys.map((row) => (
                            <tr key={row} className="even:bg-[#f9f6f3]">
                              <td className="border border-[#b17457]/20 p-2 font-medium whitespace-nowrap">{keyLabel(row)}</td>
                              {keys.map((col) => {
                                const val = corrMap.get(`${row}|${col}`);
                                const isdiag = row === col;
                                const abs = Math.abs(val ?? 0);
                                const bg = isdiag ? 'bg-[#b17457]/20' : abs > 0.6 ? 'bg-orange-100' : abs > 0.3 ? 'bg-yellow-50' : '';
                                return (
                                  <td key={col} className={`border border-[#b17457]/20 p-2 text-center ${bg}`}>
                                    {val !== undefined ? (isdiag ? '1.000' : val.toFixed(3)) : '—'}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Emotion × Parameter Matrix */}
            {(analyticsQuery.data?.emotionParameterMatrix?.length ?? 0) > 0 && (
              <div className="rounded border border-[#b17457]/30 bg-white p-4">
                <h3 className="mb-3 font-semibold">{t('analytics.emotionParamMatrix')}</h3>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[800px] border-collapse text-xs">
                    <thead>
                      <tr className="bg-[#b17457]/10">
                        <th className="border border-[#b17457]/20 p-2 text-left">{t('analytics.col.emotion')}</th>
                        <th className="border border-[#b17457]/20 p-2 text-left" title="Most frequent color family">{t('analytics.col.topColorFamily')}</th>
                        <th className="border border-[#b17457]/20 p-2 text-left" title="Most frequent shape">{t('analytics.col.topShape')}</th>
                        <th className="border border-[#b17457]/20 p-2 text-left" title="Most frequent animation type">{t('analytics.col.topAnimation')}</th>
                        <th className="border border-[#b17457]/20 p-2 text-right" title="Size mean ± standard deviation (raw pixels)">{t('analytics.col.sizeMeanSD')}</th>
                        <th className="border border-[#b17457]/20 p-2 text-right" title="Speed mean ± standard deviation (raw factor)">{t('analytics.col.speedMeanSD')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(analyticsQuery.data?.emotionParameterMatrix ?? []).map((row) => (
                        <tr key={row.emotionKey} className="even:bg-[#f9f6f3]">
                          <td className="border border-[#b17457]/20 p-2 font-medium">{row.emotionKey}</td>
                          <td className="border border-[#b17457]/20 p-2">
                            {row.colorFamily.slice(0, 2).map((c) => `${c.key} (${c.count})`).join(', ') || '—'}
                          </td>
                          <td className="border border-[#b17457]/20 p-2">
                            {row.shape.slice(0, 2).map((c) => `${c.key} (${c.count})`).join(', ') || '—'}
                          </td>
                          <td className="border border-[#b17457]/20 p-2">
                            {row.animation.slice(0, 2).map((c) => `${c.key} (${c.count})`).join(', ') || '—'}
                          </td>
                          <td className="border border-[#b17457]/20 p-2 text-right">{row.sizeMean.toFixed(1)}±{row.sizeStdDev.toFixed(1)}</td>
                          <td className="border border-[#b17457]/20 p-2 text-right">{row.speedMean.toFixed(3)}±{row.speedStdDev.toFixed(3)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Parameter Stats Tables + Pie Charts (shapes, animations, colorFamilies) */}
            {(['shapes', 'animations', 'colorFamilies'] as const).map((paramKey) => {
              const labels: Record<string, string> = {
                shapes: t('analytics.shapeStats'),
                animations: t('analytics.animationStats'),
                colorFamilies: t('analytics.colorFamilyStats')
              };
              const items = analyticsQuery.data?.parameterStats[paramKey] ?? [];
              return (
                <div key={paramKey} className="rounded border border-[#b17457]/30 bg-white p-4">
                  <h3 className="mb-3 font-semibold">{labels[paramKey]}</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[900px] border-collapse text-xs">
                      <thead>
                        <tr className="bg-[#b17457]/10">
                          <th className="border border-[#b17457]/20 p-2 text-left" title="Category identifier">{t('analytics.col.key')}</th>
                          <th className="border border-[#b17457]/20 p-2 text-right" title="Number of responses">{t('analytics.col.count')}</th>
                          <th className="border border-[#b17457]/20 p-2 text-right" title="Share of all responses">{t('analytics.col.share')}</th>
                          <th className="border border-[#b17457]/20 p-2 text-right" title="Valence mean">{t('analytics.col.valenceMean')}</th>
                          <th className="border border-[#b17457]/20 p-2 text-right" title="Valence standard deviation">{t('analytics.col.valenceSD')}</th>
                          <th className="border border-[#b17457]/20 p-2 text-right" title="Arousal mean">{t('analytics.col.arousalMean')}</th>
                          <th className="border border-[#b17457]/20 p-2 text-right" title="Arousal standard deviation">{t('analytics.col.arousalSD')}</th>
                          <th className="border border-[#b17457]/20 p-2 text-right" title="Dominance mean">{t('analytics.col.dominanceMean')}</th>
                          <th className="border border-[#b17457]/20 p-2 text-right" title="Dominance standard deviation">{t('analytics.col.dominanceSD')}</th>
                          <th className="border border-[#b17457]/20 p-2 text-right" title="Size mean (raw pixels)">{t('analytics.col.sizeMean')}</th>
                          <th className="border border-[#b17457]/20 p-2 text-right" title="Size standard deviation">{t('analytics.col.sizeSD')}</th>
                          <th className="border border-[#b17457]/20 p-2 text-right" title="Speed mean (raw factor)">{t('analytics.col.speedMean')}</th>
                          <th className="border border-[#b17457]/20 p-2 text-right" title="Speed standard deviation">{t('analytics.col.speedSD')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((item) => (
                          <tr key={item.key} className="even:bg-[#f9f6f3]">
                            <td className="border border-[#b17457]/20 p-2 font-medium">{item.key}</td>
                            <td className="border border-[#b17457]/20 p-2 text-right">{item.count}</td>
                            <td className="border border-[#b17457]/20 p-2 text-right">{(item.share * 100).toFixed(1)}%</td>
                            <td className="border border-[#b17457]/20 p-2 text-right">{item.valenceMean.toFixed(3)}</td>
                            <td className="border border-[#b17457]/20 p-2 text-right">{item.valenceStdDev.toFixed(3)}</td>
                            <td className="border border-[#b17457]/20 p-2 text-right">{item.arousalMean.toFixed(3)}</td>
                            <td className="border border-[#b17457]/20 p-2 text-right">{item.arousalStdDev.toFixed(3)}</td>
                            <td className="border border-[#b17457]/20 p-2 text-right">{item.dominanceMean.toFixed(3)}</td>
                            <td className="border border-[#b17457]/20 p-2 text-right">{item.dominanceStdDev.toFixed(3)}</td>
                            <td className="border border-[#b17457]/20 p-2 text-right">{item.sizeMean.toFixed(1)}</td>
                            <td className="border border-[#b17457]/20 p-2 text-right">{item.sizeStdDev.toFixed(1)}</td>
                            <td className="border border-[#b17457]/20 p-2 text-right">{item.speedMean.toFixed(3)}</td>
                            <td className="border border-[#b17457]/20 p-2 text-right">{item.speedStdDev.toFixed(3)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="mt-2 text-xs text-[#4a4947]/60">{t('analytics.tableFootnote')}</p>
                  {items.length > 0 && (
                    <div className="mt-4 h-60">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={items}
                            dataKey="count"
                            nameKey="key"
                            cx="50%"
                            cy="50%"
                            outerRadius={90}
                            label={formatPieLabel}
                          >
                            {items.map((_, i) => (
                              <Cell key={`cell-${paramKey}-${i}`} fill={PIE_CHART_COLORS[i % PIE_CHART_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Color family classification reference */}
            <div className="rounded border border-[#b17457]/30 bg-white p-4">
              <h3 className="mb-2 font-semibold">{t('analytics.colorFamilyClassification')}</h3>
              <p className="mb-3 text-xs text-[#4a4947]/70">{t('analytics.colorFamilyClassificationDesc')}</p>
              <div className="overflow-x-auto">
                <table className="border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#b17457]/10">
                      <th className="border border-[#b17457]/20 p-2 text-left">{t('analytics.col.key')}</th>
                      <th className="border border-[#b17457]/20 p-2 text-left">{t('analytics.col.hRange')}</th>
                      <th className="border border-[#b17457]/20 p-2 text-left">{t('analytics.col.sMin')}</th>
                      <th className="border border-[#b17457]/20 p-2 text-left">{t('analytics.col.vMin')}</th>
                      <th className="border border-[#b17457]/20 p-2 text-left">{t('analytics.col.preview')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {([
                      { key: 'neutral-dark',  h: '—',             s: '< 0.12', v: 'lightness < 50',   swatch: '#1a1a1a' },
                      { key: 'neutral-mid',   h: '—',             s: '< 0.12', v: 'lightness 50–210', swatch: '#888888' },
                      { key: 'neutral-light', h: '—',             s: '< 0.12', v: 'lightness > 210',  swatch: '#f0f0f0' },
                      { key: 'red-dark',      h: '0–20, 340–360', s: '≥ 0.12', v: 'lightness < 110',  swatch: '#8b0000' },
                      { key: 'red',           h: '0–20, 340–360', s: '≥ 0.12', v: 'lightness ≥ 110',  swatch: '#ff2020' },
                      { key: 'orange',        h: '20–45',         s: '≥ 0.12', v: '—',                swatch: '#ff8c00' },
                      { key: 'yellow',        h: '45–70',         s: '≥ 0.12', v: '—',                swatch: '#ffd700' },
                      { key: 'green',         h: '70–160',        s: '≥ 0.12', v: '—',                swatch: '#22aa22' },
                      { key: 'cyan',          h: '160–205',       s: '≥ 0.12', v: '—',                swatch: '#00ced1' },
                      { key: 'blue-dark',     h: '205–255',       s: '≥ 0.12', v: 'lightness < 110',  swatch: '#00008b' },
                      { key: 'blue',          h: '205–255',       s: '≥ 0.12', v: 'lightness ≥ 110',  swatch: '#4169e1' },
                      { key: 'purple',        h: '255–300',       s: '≥ 0.12', v: '—',                swatch: '#8b00ff' },
                      { key: 'pink',          h: '300–340',       s: '≥ 0.12', v: '—',                swatch: '#ff69b4' },
                    ] as const).map(({ key, h, s, v, swatch }) => (
                      <tr key={key} className="even:bg-[#f9f6f3]">
                        <td className="border border-[#b17457]/20 p-2 font-medium">{key}</td>
                        <td className="border border-[#b17457]/20 p-2">{h}</td>
                        <td className="border border-[#b17457]/20 p-2">{s}</td>
                        <td className="border border-[#b17457]/20 p-2">{v}</td>
                        <td className="border border-[#b17457]/20 p-2">
                          <span className="inline-block h-5 w-10 rounded border border-[#b17457]/20" style={{ backgroundColor: swatch }} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Gender stats table */}
            {(analyticsQuery.data?.demographicStats?.gender?.length ?? 0) > 0 && (
              <div className="rounded border border-[#b17457]/30 bg-white p-4">
                <h3 className="mb-3 font-semibold">{t('analytics.genderStats')}</h3>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-xs">
                    <thead>
                      <tr className="bg-[#b17457]/10">
                        <th className="border border-[#b17457]/20 p-2 text-left">{t('analytics.col.gender')}</th>
                        <th className="border border-[#b17457]/20 p-2 text-right" title="Number of respondents">{t('analytics.col.count')}</th>
                        <th className="border border-[#b17457]/20 p-2 text-right" title="Share of all respondents">{t('analytics.col.share')}</th>
                        <th className="border border-[#b17457]/20 p-2 text-right" title="Valence mean">{t('analytics.col.valenceMean')}</th>
                        <th className="border border-[#b17457]/20 p-2 text-right" title="Valence standard deviation">{t('analytics.col.valenceSD')}</th>
                        <th className="border border-[#b17457]/20 p-2 text-right" title="Arousal mean">{t('analytics.col.arousalMean')}</th>
                        <th className="border border-[#b17457]/20 p-2 text-right" title="Arousal standard deviation">{t('analytics.col.arousalSD')}</th>
                        <th className="border border-[#b17457]/20 p-2 text-right" title="Dominance mean">{t('analytics.col.dominanceMean')}</th>
                        <th className="border border-[#b17457]/20 p-2 text-right" title="Dominance standard deviation">{t('analytics.col.dominanceSD')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analyticsQuery.data!.demographicStats.gender.map((g) => (
                        <tr key={g.key} className="even:bg-[#f9f6f3]">
                          <td className="border border-[#b17457]/20 p-2 font-medium">{g.key}</td>
                          <td className="border border-[#b17457]/20 p-2 text-right">{g.count}</td>
                          <td className="border border-[#b17457]/20 p-2 text-right">{(g.share * 100).toFixed(1)}%</td>
                          <td className="border border-[#b17457]/20 p-2 text-right">{g.valenceMean.toFixed(3)}</td>
                          <td className="border border-[#b17457]/20 p-2 text-right">{g.valenceStdDev.toFixed(3)}</td>
                          <td className="border border-[#b17457]/20 p-2 text-right">{g.arousalMean.toFixed(3)}</td>
                          <td className="border border-[#b17457]/20 p-2 text-right">{g.arousalStdDev.toFixed(3)}</td>
                          <td className="border border-[#b17457]/20 p-2 text-right">{g.dominanceMean.toFixed(3)}</td>
                          <td className="border border-[#b17457]/20 p-2 text-right">{g.dominanceStdDev.toFixed(3)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="mt-2 text-xs text-[#4a4947]/60">{t('analytics.tableFootnote')}</p>
              </div>
            )}

            {/* Country stats table */}
            {(analyticsQuery.data?.demographicStats?.country?.length ?? 0) > 0 && (
              <div className="rounded border border-[#b17457]/30 bg-white p-4">
                <h3 className="mb-3 font-semibold">{t('analytics.countryStats')}</h3>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-xs">
                    <thead>
                      <tr className="bg-[#b17457]/10">
                        <th className="border border-[#b17457]/20 p-2 text-left">{t('analytics.col.country')}</th>
                        <th className="border border-[#b17457]/20 p-2 text-right" title="Number of respondents">{t('analytics.col.count')}</th>
                        <th className="border border-[#b17457]/20 p-2 text-right" title="Share of all respondents">{t('analytics.col.share')}</th>
                        <th className="border border-[#b17457]/20 p-2 text-right" title="Valence mean">{t('analytics.col.valenceMean')}</th>
                        <th className="border border-[#b17457]/20 p-2 text-right" title="Valence standard deviation">{t('analytics.col.valenceSD')}</th>
                        <th className="border border-[#b17457]/20 p-2 text-right" title="Arousal mean">{t('analytics.col.arousalMean')}</th>
                        <th className="border border-[#b17457]/20 p-2 text-right" title="Arousal standard deviation">{t('analytics.col.arousalSD')}</th>
                        <th className="border border-[#b17457]/20 p-2 text-right" title="Dominance mean">{t('analytics.col.dominanceMean')}</th>
                        <th className="border border-[#b17457]/20 p-2 text-right" title="Dominance standard deviation">{t('analytics.col.dominanceSD')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analyticsQuery.data!.demographicStats.country.map((c) => (
                        <tr key={c.key} className="even:bg-[#f9f6f3]">
                          <td className="border border-[#b17457]/20 p-2 font-medium">{c.key}</td>
                          <td className="border border-[#b17457]/20 p-2 text-right">{c.count}</td>
                          <td className="border border-[#b17457]/20 p-2 text-right">{(c.share * 100).toFixed(1)}%</td>
                          <td className="border border-[#b17457]/20 p-2 text-right">{c.valenceMean.toFixed(3)}</td>
                          <td className="border border-[#b17457]/20 p-2 text-right">{c.valenceStdDev.toFixed(3)}</td>
                          <td className="border border-[#b17457]/20 p-2 text-right">{c.arousalMean.toFixed(3)}</td>
                          <td className="border border-[#b17457]/20 p-2 text-right">{c.arousalStdDev.toFixed(3)}</td>
                          <td className="border border-[#b17457]/20 p-2 text-right">{c.dominanceMean.toFixed(3)}</td>
                          <td className="border border-[#b17457]/20 p-2 text-right">{c.dominanceStdDev.toFixed(3)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="mt-2 text-xs text-[#4a4947]/60">{t('analytics.tableFootnote')}</p>
              </div>
            )}

            {/* Insights */}
            <div className="rounded border border-[#b17457]/30 bg-white p-4">
              <h3 className="mb-2 font-semibold">{t('analytics.insights')}</h3>
              <ul className="list-disc space-y-1 pl-5 text-sm">
                {insights.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {activeTab === 'export-stats' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">Eksport danych i statystyk</h2>
            <p className="text-sm text-[#4a4947]/80">
              Eksportuj dane ankiety lub dane wraz z pełnymi statystykami do pliku XLSX (wiele arkuszy) lub raportu PDF.
            </p>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded border border-[#b17457]/30 bg-white p-4">
                <h3 className="mb-2 font-semibold">Eksport tylko danych</h3>
                <p className="mb-3 text-xs text-[#4a4947]/70">Eksportuje surowe dane odpowiedzi (bez statystyk).</p>
                <div className="flex flex-wrap gap-2">
                  <button type="button" className="rounded bg-[#b17457] px-4 py-2 text-sm text-white" onClick={() => handleExport('csv')}>
                    CSV
                  </button>
                  <button type="button" className="rounded bg-[#b17457] px-4 py-2 text-sm text-white" onClick={() => handleExport('xlsx')}>
                    XLSX
                  </button>
                  <button type="button" className="rounded bg-[#b17457] px-4 py-2 text-sm text-white" onClick={() => handleExport('json')}>
                    JSON
                  </button>
                </div>
              </div>

              <div className="rounded border border-[#b17457]/30 bg-white p-4">
                <h3 className="mb-2 font-semibold">Eksport danych + statystyki</h3>
                <p className="mb-3 text-xs text-[#4a4947]/70">
                  XLSX: wiele arkuszy – dane, statystyki VAD, korelacje, demografia, parametry.<br />
                  PDF: raport z tabelami statystycznymi i wykresami.
                </p>
                <div className="flex flex-wrap gap-2">
                  <button type="button" className="rounded bg-[#b17457] px-4 py-2 text-sm text-white" onClick={handleExportXlsxWithStats}>
                    XLSX + statystyki
                  </button>
                  <button
                    type="button"
                    className="rounded bg-[#7f5442] px-4 py-2 text-sm text-white disabled:opacity-50"
                    onClick={handleExportPdf}
                    disabled={!analyticsQuery.data}
                  >
                    PDF + statystyki
                  </button>
                </div>
                {!analyticsQuery.data && (
                  <p className="mt-2 text-xs text-amber-700">Przejdź do zakładki Statystyki, aby załadować dane przed eksportem PDF.</p>
                )}
              </div>
            </div>

            {!!exportStatus && (
              <div className="rounded border border-[#b17457]/30 bg-white p-3 text-sm">
                {exportStatus}
              </div>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
